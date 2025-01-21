using lib.exceptions;
using lib.item_handler.results;
using lib.messaging;
using lib.queue;
using lib.settings;
using lib.tasks;
using lib.tasks.types;
using Microsoft.Extensions.Options;
using Timer = System.Timers.Timer;

namespace lib;
//TODO: Containerize with Docker
//TODO: Do Upload and check if results in ITask corresponds with actual files
public class Worker : IDisposable
{
    private readonly IMessageService _messageService;
    
    private readonly WorkerOptions _options;

    private readonly QueueOptions _queueOptions;

    private readonly IMultiQueueSystem<string> _queuingSystem;
    
    private readonly ITaskExecutor _taskExecutor;

    private bool _disposed;

    public Worker(
        IOptions<WorkerOptions> options,
        IMultiQueueSystem<string> queuingSystem,
        ITaskExecutor taskExecutor,
        IMessageService messageService)
    {
        ArgumentNullException.ThrowIfNull(messageService);
        ArgumentNullException.ThrowIfNull(queuingSystem);
        ArgumentNullException.ThrowIfNull(options.Value);
        ArgumentNullException.ThrowIfNull(taskExecutor);

        _options = options.Value;
        _queueOptions = _options.Queues;
        _queuingSystem = queuingSystem;
        _taskExecutor = taskExecutor;
        _messageService = messageService;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public void Run()
    {
        SubscribeQueue();

        if (_options.SendHeartbeat)
        {
            SetupHeartBeat();
        }
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed)
        {
            return;
        }

        if (disposing)
        {
            _queuingSystem.Dispose();
        }

        _disposed = true;
    }

    private void SubscribeQueue()
    {
        _queuingSystem.OnMessageReceived += MessageReceivedCallback;
        _queuingSystem.Init();
    }

    private void MessageReceivedCallback(object? sender, MessageReceivedEventArgs<string> eventArgs)
    {
        var result = _taskExecutor.ExecuteTask(eventArgs.Message);

        if (!result.IsRight)
        {
            ReportTaskProcessingFailure(result.GetLeftOrThrow());
            return;
        }
        
        var processingResult = result.GetRightOrThrow();
        ReportTaskCompletion(processingResult);
        
        try
        {
            var artifactId = UploadResult(processingResult);
            ReportArtifactUploaded(processingResult.TaskId, artifactId);
        }
        catch (StorageException e)
        {
            ReportTaskProcessingFailure(processingResult.TaskId, e.Message);
        }
    }

    private string UploadResult(TaskProcessedResult processingResult)
    {
        throw new NotImplementedException();
    }

    private void SetupHeartBeat()
    {
        var timer = new Timer();
        timer.Elapsed += (s, e) => { SendHeartbeat(); };
        timer.Interval = _options.HeartbeatSecondsDelay * 1000;
        timer.Enabled = true;
    }

    private void SendHeartbeat()
    {
        string message = _messageService.GetHeartbeat(
            _options.WorkerName, _queueOptions.TaskQueueName);

        _queuingSystem.Enqueue(_queueOptions.WorkerQueueName, message);
    }

    private void ReportTaskProcessingFailure(string error)
    {
        var message = _messageService
            .GetProcessingFailed("-1", _options.WorkerName, error);

        _queuingSystem.Enqueue(_queueOptions.TaskQueueName, message);
    }

    private void ReportTaskProcessingFailure(string taskId, string error)
    {
        string message = _messageService
            .GetProcessingFailed(taskId, _options.WorkerName, error);

        _queuingSystem.Enqueue(_queueOptions.TaskQueueName, message);
    }

    private void ReportTaskCompletion(TaskProcessedResult result)
    {
        var message = _messageService
            .GetProcessingCompleted(result.TaskId, _options.WorkerName);

        _queuingSystem.Enqueue(_queueOptions.TaskQueueName, message);
    }

    private void ReportArtifactUploaded(string taskId, string artifactId)
    {
        var message = _messageService
            .GetArtifactUploaded(taskId, artifactId);

        _queuingSystem.Enqueue(_queueOptions.ArtifactQueueName, message);
    }
}