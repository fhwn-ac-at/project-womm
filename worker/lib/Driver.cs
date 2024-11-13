namespace lib
{
    using lib.aspects.logging;
    using lib.commands;
    using lib.item_handler;
    using lib.item_handler.results;
    using lib.item_handler.work_items;
    using lib.parser;
    using lib.settings;
    using lib.storage;
    using Microsoft.Extensions.Options;
    using RabbitMQ.Client;
    using RabbitMQ.Client.Events;
    using System;
    using System.Text;
    using System.Threading.Channels;
    using System.Threading.Tasks;

    [LoggingClass]
    public class Driver : IDisposable
    {
        private readonly DriverOptions _options;

        private readonly IWorkItemConverter _converter;

        private readonly IWorkItemVisitor<ItemProcessedResult> _workItemHandler;

        private IModel _taskChannel;

        private IModel _resultChannel;
        private bool _disposed;
        private readonly IStorageSystem _storage;

        public Driver(
            IOptions<DriverOptions> options,
            IWorkItemConverter converter,
            IWorkItemVisitor<ItemProcessedResult> workItemHandler,
            IStorageSystem remoteStorage)
        {
            ArgumentNullException.ThrowIfNull(converter);
            ArgumentNullException.ThrowIfNull(workItemHandler);
            ArgumentNullException.ThrowIfNull(options.Value);
            ArgumentNullException.ThrowIfNull(remoteStorage);

            _options = options.Value;
            _converter = converter;
            _workItemHandler = workItemHandler;
            _storage = remoteStorage;
        }

        public void Run()
        {
            _resultChannel = DeclareQueueChannel(_options.Results);
            _taskChannel = DeclareQueueChannel(_options.Tasks);

            var consumer = new EventingBasicConsumer(_taskChannel);
            consumer.Received += NewTaskAddedCallback;

            _taskChannel.BasicConsume(queue: _options.Tasks.QueueName,
                                 autoAck: true,
                                 consumer: consumer);
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
            }

            _disposed = true;
        }

        private void NewTaskAddedCallback(object? sender, BasicDeliverEventArgs e)
        {
            var body = e.Body.ToArray();
            string parsedBody = Encoding.UTF8.GetString(body);

            var newItem = _converter.Convert(parsedBody);
            var result = newItem.Accept(_workItemHandler);
            PublishResult(result);
        }

        private IModel DeclareQueueChannel(QueueServerOptions options)
        {
            var factory = new ConnectionFactory
            {
                HostName = options.HostName,
                Port = options.Port,
            };

            var connection = factory.CreateConnection();
            var channel = connection.CreateModel();
            channel.QueueDeclare(queue: options.QueueName);

            return channel;
        }

        private void PublishResult(ItemProcessedResult result)
        {
            var convertedResult = _converter.Convert(result);

            var body = Encoding.UTF8.GetBytes(convertedResult);

            _resultChannel.BasicPublish(
                exchange: string.Empty,
                routingKey: _options.Results.RoutingKey,
                basicProperties: null,
                body: body);
        }
    }
}
