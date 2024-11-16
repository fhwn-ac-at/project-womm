namespace lib.queue
{
    using lib.exceptions;
    using RabbitMQ.Client.Exceptions;
    using RabbitMQ.Client;
    using System;
    using System.Collections;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Channels;
    using System.Threading.Tasks;
    using Microsoft.Extensions.Options;
    using lib.settings;
    using RabbitMQ.Client.Events;

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

            this._options = options.Value.Queues;
        }

        public void Startup(string listeningQueueId)
        {
            var factory = new ConnectionFactory()
            {
                HostName = _options.HostName,
                Port = _options.Port
            };

            try
            {
                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();
            }
            catch (BrokerUnreachableException e)
            {
                throw new QueueException("Cannot connect to system: " + e.Message, e);
            }

            SetupConsumer(listeningQueueId);
        }

        public void Enqueue(string queueId, string message)
        {
            ArgumentException.ThrowIfNullOrEmpty(queueId);
            ArgumentException.ThrowIfNullOrEmpty(message);

            var body = Encoding.UTF8.GetBytes(message);

            _channel.BasicPublish(exchange: "",            
                                 routingKey: queueId,   
                                 basicProperties: null,   
                                 body: body);
        }

        public bool IsExistent(string queueId)
        {
            try
            {
                _channel.QueueDeclarePassive(queueId);
                return true;
            }
            catch (OperationInterruptedException)
            {
                return false;
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

        private void SetupConsumer(string listeningQueueId)
        {
            var consumer = new EventingBasicConsumer(_channel);

            consumer.Received += (model, ea) =>
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);

                _channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
                FireOnMessageReceived(new MessageReceivedEventArgs<string>(message));
            };

            _channel.BasicConsume(queue: listeningQueueId,
                                 autoAck: false, 
                                 consumer: consumer);
        }
    }
}
