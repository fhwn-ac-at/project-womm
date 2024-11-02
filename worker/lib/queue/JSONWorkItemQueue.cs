namespace lib.queue
{
    using lib.aspects.logging;
    using lib.item_hanlder;
    using lib.parser;
    using lib.settings;
    using RabbitMQ.Client;
    using System;
    using System.Text;
    using System.Threading.Channels;

    [LoggingClass]
    internal class JSONWorkItemQueue : IQueue<string>, IDisposable
    {
        private readonly QueueServerOptions _options;

        private bool _disposed;

        private IModel _channel;

        public JSONWorkItemQueue(QueueServerOptions options)
        {
            ArgumentNullException.ThrowIfNull(options);
            this._options = options;

            var factory = new ConnectionFactory
            {
                HostName = _options.HostName,
                Port = _options.Port,
            };

            using var connection = factory.CreateConnection();
            _channel = connection.CreateModel();
            _channel.QueueDeclare(queue: _options.QueueName);
        }

        public event EventHandler<QueueItemAddedEventArgs<string>>? OnItemAdded;

        public void Enqueue(string jsonItem)
        {
            var body = Encoding.UTF8.GetBytes(jsonItem);
            
            _channel.BasicPublish(
                exchange: string.Empty,
                routingKey: _options.RoutingKey,
                basicProperties: null,
                body: body);
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void FireOnWorkItemAdded(QueueItemAddedEventArgs<string> e)
        {
            OnItemAdded?.Invoke(this, e);
        }

        private void Dispose(bool disposing)
        {
            if (_disposed)
            {
                return;
            }

            if (disposing)
            {
                _channel.Dispose();
            }

            _disposed = true;
        }
    }
}
