namespace lib
{
    using Amazon.S3.Model;
    using lib.aspects.logging;
    using lib.exceptions;
    using lib.item_handler;
    using lib.item_handler.results;
    using lib.messaging;
    using lib.parser;
    using lib.queue;
    using lib.settings;
    using lib.storage;
    using Microsoft.Extensions.Options;
    using RabbitMQ.Client;
    using RabbitMQ.Client.Events;
    using RabbitMQ.Client.Exceptions;
    using System;
    using System.Threading.Channels;
    using System.Timers;

    [LoggingClass]
    public class Worker : IDisposable
    {
        private readonly WorkerOptions _options;

        private QueueOptions _queue;
        
        private readonly IWorkItemConverter _converter;

        private readonly ITaskVisitor<TaskProcessedResult> _workItemHandler;

        private readonly IStorageSystem _storage;

        private readonly IMultiQueueSystem<string> _queuingSystem;

        private readonly IMessageService _messageService;
        
        private bool _disposed;

        public Worker(
            IOptions<WorkerOptions> options,
            IWorkItemConverter converter,
            ITaskVisitor<TaskProcessedResult> workItemHandler,
            IStorageSystem remoteStorage,
            IMultiQueueSystem<string> queuingSystem,
            IMessageService messageService)
        {
            ArgumentNullException.ThrowIfNull(messageService);
            ArgumentNullException.ThrowIfNull(queuingSystem);
            ArgumentNullException.ThrowIfNull(converter);
            ArgumentNullException.ThrowIfNull(workItemHandler);
            ArgumentNullException.ThrowIfNull(options.Value);
            ArgumentNullException.ThrowIfNull(remoteStorage);

            _options = options.Value;
            _queue = _options.Queues;
            _converter = converter;
            _workItemHandler = workItemHandler;
            _storage = remoteStorage;
            _queuingSystem = queuingSystem;
            _messageService = messageService;
        }

        public void Run()
{
            SubscribeQueue();

            if (_options.SendHeartbeat)
            {
                SetupHeartBeat();
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
                _storage.Dispose();
                _queuingSystem.Dispose();
            }

            _disposed = true;
        }

        private void SubscribeQueue()
        {
            _queuingSystem.OnMessageReceived += MessageReceivedCallback;
            _queuingSystem.Startup(_queue.WorkerQueueName);
        }

        private void MessageReceivedCallback(object? sender, MessageReceivedEventArgs<string> eventArgs)
        {
            ITask task;

            try
            {
                task = _converter.Convert(eventArgs.Message);
            }
            catch (WorkItemConversionException e)
            {
                ReportTaskProcessingFailure(e);
                return;
            }

            try
            {
                TaskProcessedResult result = task.Accept(_workItemHandler);
                ReportTaskProcessingStarted(task);
                ReportTaskCompletion(result);
            }
            catch (WorkItemProcessingFailedException e)
            {
                ReportTaskProcessingFailure(task, e);
            }
        }

        private void SetupHeartBeat()
        {
            Timer timer = new Timer();
            timer.Elapsed += new ElapsedEventHandler((s, e) =>
            {
                SendHeartbeat();
            });
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
    }
}
