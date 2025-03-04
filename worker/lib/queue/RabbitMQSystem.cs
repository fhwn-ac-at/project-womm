﻿using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using lib.settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace lib.queue;

public class RabbitMQSystem : IMultiQueueSystem<string>
{
    private readonly ILogger<RabbitMQSystem> _logger;
    private readonly QueueOptions _options;

    private readonly string _workerName;

    private IModel _channel;

    private IConnection _connection;
    
    private bool _disposed;

    public RabbitMQSystem(IOptions<WorkerOptions> options, ILogger<RabbitMQSystem> logger)
    {
        _logger = logger;
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(options.Value);

        _options = options.Value.Queues;
        _workerName = options.Value.WorkerName;
    }

    public event EventHandler<MessageReceivedEventArgs<string>> OnMessageReceived;

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
        consumer.Received += (_, args) =>
        {
            _channel.BasicAck(deliveryTag: args.DeliveryTag, multiple: false);
            var body = args.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);

            FireOnMessageReceived(new MessageReceivedEventArgs<string>(message));
            _logger.LogInformation($"Received message: {message}");
        };

        _channel.QueueDeclare(_options.ListensOnQueue, 
            durable: true, 
            exclusive: false, 
            autoDelete: false);
        _channel.QueueBind(_options.ListensOnQueue, _options.Exchange, _options.ListensOnQueue);
        
        _channel.BasicConsume(queue: _options.ListensOnQueue,
            autoAck: false, 
            consumer);
    }

    public void Enqueue(string queueId, string message)
    {
        ArgumentException.ThrowIfNullOrEmpty(queueId);
        ArgumentException.ThrowIfNullOrEmpty(message);

        var body = Encoding.UTF8.GetBytes(message);
        
        _logger.LogInformation($"Enqueuing into {queueId}, message: {message}");
        _channel.BasicPublish(
            exchange: _options.Exchange,
            routingKey: queueId,
            null,
            body);
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
            _channel.QueueDelete(_options.ListensOnQueue);
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