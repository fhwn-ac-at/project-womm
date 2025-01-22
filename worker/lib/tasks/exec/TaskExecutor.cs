using System.Text.Json;
using lib.messaging;
using lib.options;
using lib.tasks.data;
using lib.tasks.types;
using Microsoft.Extensions.Options;

namespace lib.tasks.exec;

public class TaskExecutor : ITaskExecutor
{
    private readonly Dictionary<string, Func<TaskData, EditingTask>> _taskFactories;
    
    private readonly JsonSerializerOptions _options;
    
    private readonly MessagingOptions _messagingOptions;

    public TaskExecutor(Dictionary<string, Func<TaskData, EditingTask>> taskFactories,
        JsonSerializerOptions options,
        IOptions<MessagingOptions> messagingOptions)
    {
        _taskFactories = taskFactories;
        _options = options;
        _messagingOptions = messagingOptions.Value ?? throw new ArgumentNullException(nameof(messagingOptions));
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
        catch (JsonException e)
        {
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingFailed, 
                e.Message, 
                "-1"));
            return;
        }
        
        _taskFactories.TryGetValue(taskData.name, out var factory);

        if (factory == null)
        {
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingFailed, 
                "Did not find task: " + taskData.name, 
                taskData.taskId));
            return;
        }
        
        EditingTask task;
        try
        {
            task = factory(taskData);
            
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingStarted, 
                "Started processing: " + taskData.name, 
                taskData.taskId));
            
            task.Process();
            
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingCompleted, 
                "Completed processing: " + taskData.name, 
                taskData.taskId));
            
            //TODO: Upload Artifacts
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ArtifactUploaded, 
                "Uploaded Artifacts: " + taskData.name, 
                taskData.taskId));
        }
        catch (Exception e)
        {
            FireOnTaskStatusChanged(new TaskStatusEventArgs(
                _messagingOptions.ProcessingFailed, 
                e.Message, 
                taskData.taskId));
        }
    }

    protected virtual void FireOnTaskStatusChanged(TaskStatusEventArgs e)
    {
        OnTaskStatusChanged?.Invoke(this, e);
    }
}