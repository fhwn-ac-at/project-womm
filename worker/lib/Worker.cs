using System.Diagnostics;
using lib.exceptions;
using lib.messaging;
using lib.options;
using lib.queue;
using lib.settings;
using lib.tasks;
using lib.tasks.data;
using lib.tasks.exec;
using lib.tasks.types;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Timer = System.Timers.Timer;

namespace lib;

public class Worker : IDisposable, IHostedService 
{
    private readonly IMessageService _messageService;
    
    private readonly ILogger<Worker> _logger;

    private readonly MessagingOptions _messagingOptions;

    private readonly WorkerOptions _options;

    private readonly QueueOptions _queueOptions;

    private readonly IMultiQueueSystem<string> _queuingSystem;
    
    private readonly ITaskExecutor _taskExecutor;

    private bool _disposed;

    public Worker(
        IOptions<WorkerOptions> options,
        IMultiQueueSystem<string> queuingSystem,
        ITaskExecutor taskExecutor,
        IMessageService messageService,
        IOptions<MessagingOptions> messagingOptions,
        ILogger<Worker> logger)
    {
        ArgumentNullException.ThrowIfNull(messageService);
        ArgumentNullException.ThrowIfNull(queuingSystem);
        ArgumentNullException.ThrowIfNull(options.Value);
        ArgumentNullException.ThrowIfNull(messagingOptions.Value);
        ArgumentNullException.ThrowIfNull(taskExecutor);

        _options = options.Value;
        _queueOptions = _options.Queues;
        _queuingSystem = queuingSystem;
        _taskExecutor = taskExecutor;
        _messageService = messageService;
        _logger = logger;
        _messagingOptions = messagingOptions.Value;

        BuildListenerQueueName(_options);
    }

    private void BuildListenerQueueName(WorkerOptions options)
    {
        if (string.IsNullOrEmpty(_options.Queues.ListensOnQueue))
        {
            _options.Queues.ListensOnQueue = options.WorkerName 
                                             + "_" + Guid.NewGuid().ToString(); 
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
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
        _taskExecutor.OnTaskStatusChanged += TaskStatusChangedCallback;

        int tries = _options.QueuePolls;

        while(tries > 0)
        {
            try
            {
                _queuingSystem.Init();
                break;
            }
            catch (Exception e)
            {
                _logger.LogError("Cannot subscribe to queue " + _options.Queues.HostName + ":" + _options.Queues.Port +
                " trying again in " + _options.QueuePollIntervalMilliseconds + " milliseconds." + 
                tries + " tries left.");
                tries--;
                Thread.Sleep(_options.QueuePollIntervalMilliseconds);
            }
        }
    }

    private void MessageReceivedCallback(object? sender, MessageReceivedEventArgs<string> eventArgs)
    {
        _taskExecutor.ExecuteTask(eventArgs.Message);
    }
    
    private void TaskStatusChangedCallback(object? sender, TaskStatusEventArgs e)
    {
        if (e.Status == _messagingOptions.ArtifactUploaded)
        {
            var m = _messageService.GetArtifactUploadedMessage(e.Status, e.TaskId);
            _queuingSystem.Enqueue(_queueOptions.ArtifactQueueName, m);
        }
        else if (e.Status == _messagingOptions.ProcessingFailed)
        {
            var m = _messageService.GetTaskStatusChangeMessage(e.Status, e.TaskId, _options.WorkerName,e.Message);
            _queuingSystem.Enqueue(_queueOptions.TaskQueueName, m);
        }
        else
        {
            var m = _messageService.GetTaskStatusChangeMessage(e.Status, e.TaskId, _options.WorkerName);
            _queuingSystem.Enqueue(_queueOptions.TaskQueueName, m);
        }
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
        _logger.LogInformation("Sending heartbeat...");
        string message = _messageService.GetHeartbeatMessage(
            _options.WorkerName, _queueOptions.ListensOnQueue);

        _queuingSystem.Enqueue(_queueOptions.WorkerQueueName, message);
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Worker running...");

        SubscribeQueue();

        if (_options.SendHeartbeat)
        {
            _logger.LogInformation("Setting up heartbeat...");
            SetupHeartBeat();
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Worker stopping...");
        return Task.CompletedTask;
    }
}