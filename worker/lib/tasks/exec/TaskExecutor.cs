using System.Text.Json;
using lib.messaging;
using lib.options;
using lib.tasks.data;
using lib.tasks.types;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace lib.tasks.exec;

public class TaskExecutor : ITaskExecutor
{
    private readonly Dictionary<string, Func<TaskData, ScheduledTask>> _taskFactories;
    
    private readonly JsonSerializerOptions _options;
    
    private readonly ILogger<TaskExecutor> _logger;

    private readonly MessagingOptions _messagingOptions;

    public TaskExecutor(Dictionary<string, Func<TaskData, ScheduledTask>> taskFactories,
        JsonSerializerOptions options,
        IOptions<MessagingOptions> messagingOptions, 
        ILogger<TaskExecutor> logger)
    {
        _taskFactories = taskFactories;
        _options = options;
        _logger = logger;
        _messagingOptions = messagingOptions.Value 
            ?? throw new ArgumentNullException(nameof(messagingOptions));
    }

    public event EventHandler<TaskStatusEventArgs> OnTaskStatusChanged;

    public void ExecuteTask(string rawTask)
    {
        TaskData taskData;
        try
        {
            taskData = JsonSerializer.Deserialize<TaskData>(rawTask, _options) 
                       ?? throw new JsonException("Invalid JSON"); ;
        }
        catch (Exception e)
        {
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingFailed, 
                e.Message, 
                "-1"));
            _logger.LogError("Unable to parse task: " + rawTask);
            return;
        }
        
        _taskFactories.TryGetValue(taskData.name, out var factory);

        if (factory == null)
        {
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingFailed, 
                "Did not find task: " + taskData.name, 
                taskData.taskId));
            _logger.LogError("Unknown task name encountered: " + rawTask);
            return;
        }
        
        ScheduledTask task;
        try
        {
            task = factory(taskData);
            
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingStarted, 
                "Started processing: " + taskData.name, 
                taskData.taskId));
            _logger.LogInformation("Started processing: " + taskData.name);
            
            
            task.Process();
            
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingCompleted, 
                "Completed processing: " + taskData.name, 
                taskData.taskId));
            _logger.LogInformation("Completed processing: " + taskData.name);
            
            _logger.LogInformation("Uploaded Artifacts: " + taskData.name);
        }
        catch (Exception e)
        {
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingFailed, 
                e.Message, 
                taskData.taskId));
            _logger.LogError("Error executing task: " + e.Message);
        }
    }

    protected virtual void FireOnTaskStatusChanged(TaskStatusEventArgs e)
    {
        OnTaskStatusChanged?.Invoke(this, e);
    }
}