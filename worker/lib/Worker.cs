using lib.exceptions;
using lib.item_handler;
using lib.item_handler.results;
using lib.messaging;
using lib.parser;
using lib.queue;
using lib.settings;
using lib.storage;
using Microsoft.Extensions.Options;
using Timer = System.Timers.Timer;

namespace lib;

public class Worker : IDisposable
{
    private readonly ITaskConverter _converter;

    private readonly IMessageService _messageService;
    private readonly WorkerOptions _options;

    private readonly QueueOptions _queue;

    private readonly IMultiQueueSystem<string> _queuingSystem;

    private readonly IStorageSystem _storage;

    private readonly ITaskVisitor<TaskProcessedResult> _workItemHandler;

    private bool _disposed;

    public Worker(
        IOptions<WorkerOptions> options,
        ITaskConverter converter,
        ITaskVisitor<TaskProcessedResult> taskHandler,
        IStorageSystem remoteStorage,
        IMultiQueueSystem<string> queuingSystem,
        IMessageService messageService)
    {
        ArgumentNullException.ThrowIfNull(messageService);
        ArgumentNullException.ThrowIfNull(queuingSystem);
        ArgumentNullException.ThrowIfNull(converter);
        ArgumentNullException.ThrowIfNull(taskHandler);
        ArgumentNullException.ThrowIfNull(options.Value);
        ArgumentNullException.ThrowIfNull(remoteStorage);

        _options = options.Value;
        _queue = _options.Queues;
        _converter = converter;
        _workItemHandler = taskHandler;
        _storage = remoteStorage;
        _queuingSystem = queuingSystem;
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
            _storage.Dispose();
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
        ITask task;

        try
        {
            task = _converter.Convert(eventArgs.Message);
        }
        catch (TaskConversionException e)
        {
            ReportTaskProcessingFailure(e);
            return;
        }

        TaskProcessedResult result;
        try
        {
            result = task.Accept(_workItemHandler);
            ReportTaskProcessingStarted(task);
            ReportTaskCompletion(result);
        }
        catch (TaskProcessingFailedException e)
        {
            ReportTaskProcessingFailure(task, e);
            return;
        }

        try
        {
            string artifactId = UploadResult(result);
            ReportArtifactUploaded(task, artifactId);
        }
        catch (StorageException e)
        {
            ReportTaskProcessingFailure(task, e);
        }
    }

    private void SetupHeartBeat()
    {
        Timer timer = new Timer();
        timer.Elapsed += (s, e) => { SendHeartbeat(); };
        timer.Interval = _options.HeartbeatSecondsDelay * 1000;
        timer.Enabled = true;
    }

    private void SendHeartbeat()
    {
        string message = _messageService.GetHeartbeat(
            _options.WorkerName, _queue.TaskQueueName);

        _queuingSystem.Enqueue(_queue.WorkerQueueName, message);
    }

    private void ReportTaskProcessingFailure(Exception e)
    {
        string message = _messageService
            .GetProcessingFailed("-1", _options.WorkerName, e.Message);

        _queuingSystem.Enqueue(_queue.TaskQueueName, message);
    }

    private void ReportTaskProcessingFailure(ITask task, Exception e)
    {
        string message = _messageService
            .GetProcessingFailed(task.ID, _options.WorkerName, e.Message);

        _queuingSystem.Enqueue(_queue.TaskQueueName, message);
    }

    private void ReportTaskProcessingStarted(ITask item)
    {
        string message = _messageService
            .GetProcessingStarted(item.ID, _options.WorkerName);

        _queuingSystem.Enqueue(_queue.TaskQueueName, message);
    }

    private void ReportTaskCompletion(TaskProcessedResult result)
    {
        string message = _messageService
            .GetProcessingCompleted(result.TaskId, _options.WorkerName);

        _queuingSystem.Enqueue(_queue.TaskQueueName, message);
    }

    private void ReportArtifactUploaded(ITask task, string artifactId)
    {
        string message = _messageService
            .GetArtifactUploaded(task.ID, artifactId);

        _queuingSystem.Enqueue(_queue.ArtifactQueueName, message);
    }

    private string UploadResult(TaskProcessedResult result)
    {
        var artifactID = Guid.NewGuid().ToString();

        foreach (var file in result.Files)
        {
            _storage.Upload(file, artifactID);
        }

        return artifactID;
    }
}