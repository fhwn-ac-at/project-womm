namespace lib
{
    using lib.aspects.logging;
    using lib.item_hanlder;
    using lib.parser;
    using lib.settings;
    using Microsoft.Extensions.Options;
    using RabbitMQ.Client;
    using RabbitMQ.Client.Events;
    using System;
    using System.Text;
    using System.Threading.Channels;
    using System.Threading.Tasks;

    [LoggingClass]
    public class Driver
    {
        private readonly DriverOptions _options;

        private readonly IConverter<string, IWorkItem> _workItemConverter;

        private readonly IConverter<IWorkItemResult, string> _resultConverter;

        private readonly IWorkItemVisitor<IWorkItemResult> _workItemHandler;

        private IModel _taskChannel;

        private IModel _resultChannel;

        public Driver(
            IOptions<DriverOptions> options,
            IConverter<string, IWorkItem> workItemConverter,
            IConverter<IWorkItemResult, string> resultConverter,
            IWorkItemVisitor<IWorkItemResult> workItemHandler)
        {
            ArgumentNullException.ThrowIfNull(resultConverter);
            ArgumentNullException.ThrowIfNull(workItemConverter);
            ArgumentNullException.ThrowIfNull(workItemHandler);
            ArgumentNullException.ThrowIfNull(options.Value);
            
            _options = options.Value;
            _workItemConverter = workItemConverter;
            _resultConverter = resultConverter;
            _workItemHandler = workItemHandler;
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

        private void NewTaskAddedCallback(object? sender, BasicDeliverEventArgs e)
        {
            var body = e.Body.ToArray();
            string parsedBody = Encoding.UTF8.GetString(body);

            var newItem = _workItemConverter.Convert(parsedBody);
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

        private void PublishResult(IWorkItemResult result)
        {
            var convertedResult = _resultConverter.Convert(result);

            var body = Encoding.UTF8.GetBytes(convertedResult);

            _resultChannel.BasicPublish(
                exchange: string.Empty,
                routingKey: _options.Results.RoutingKey,
                basicProperties: null,
                body: body);
        }
    }
}
