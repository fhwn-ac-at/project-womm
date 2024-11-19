namespace lib.queue
{
    using RabbitMQ.Client;
    using System;
    using System.Text;
    using Microsoft.Extensions.Options;
    using lib.settings;
    using RabbitMQ.Client.Events;
    using lib.aspects;

    [LoggingClass]
    public class RabbitMQSystem : IMultiQueueSystem<string>
    {
        private bool _disposed;

        private IConnection _connection;
        
        private IModel _channel;
        
        private readonly QueueOptions _options;

        public event EventHandler<MessageReceivedEventArgs<string>> OnMessageReceived;

        public RabbitMQSystem(IOptions<WorkerOptions>options)
        {
            ArgumentNullException.ThrowIfNull(options);
            ArgumentNullException.ThrowIfNull(options.Value);

            _options = options.Value.Queues;
        }

        public void Init()
        {
            var factory = new ConnectionFactory()
            {
                HostName = _options.HostName,
                Port = _options.Port,
                UserName = _options.Username,
                Password = _options.Password,
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            var consumer = new EventingBasicConsumer(_channel);
            consumer.Received += (sender, args) =>
            {
                var body = args.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);

                _channel.BasicAck(deliveryTag: args.DeliveryTag, multiple: false);
            };

            _channel.BasicConsume(_options.TaskQueueName, false, consumer);
        }

        public void Enqueue(string queueId, string message)
        {
            ArgumentException.ThrowIfNullOrEmpty(queueId);
            ArgumentException.ThrowIfNullOrEmpty(message);

            var body = Encoding.UTF8.GetBytes(message);

            _channel.BasicPublish(exchange: _options.Exchange,
                                 routingKey: _options.RoutingKey,
                                 basicProperties: null,
                                 body: body);
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
                _channel.Dispose();
                _connection.Dispose();
            }

            _disposed = true;
        }

        protected virtual void FireOnMessageReceived(MessageReceivedEventArgs<string> args)
        {
            ArgumentNullException.ThrowIfNull(args, nameof(args));
            OnMessageReceived?.Invoke(this, args);
        }
    }
}