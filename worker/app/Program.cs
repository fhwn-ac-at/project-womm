namespace app
{
    using lib;
    using lib.settings;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Hosting;
    using Microsoft.Extensions.Options;
    using RabbitMQ.Client;
    using System;
    using System.Text;
    using static lib.Driver;

    public class Program
    {
        internal static void Main(string[] args)
        {
            IHost host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((hostContext, services) =>
    {
        IConfiguration config = hostContext.Configuration;

        services.AddTransient<Driver>();
        services
            .AddOptions<QueueServerOptions>()
            .Bind(config.GetRequiredSection("Driver"));
    })
    .Build();

            host.Services
                .GetRequiredService<Driver>();
            SetupDummyQueues();
            host.Run();
        }

        private static void SetupDummyQueues()
        {
            var taskFactory = new ConnectionFactory 
            { 
                HostName = "localhost", 
                Port = 123
            };
            using var taskConnection = taskFactory.CreateConnection();
            using var taskChannel = taskConnection.CreateModel();

            taskChannel.QueueDeclare(queue: "tasks",
                                 durable: false,
                                 exclusive: false,
                                 autoDelete: false,
                                 arguments: null);

            const string message = "Test Task";
            var body = Encoding.UTF8.GetBytes(message);

            taskChannel.BasicPublish(exchange: string.Empty,
                                 routingKey: string.Empty,
                                 basicProperties: null,
                                 body: body);
        }
    }
}
