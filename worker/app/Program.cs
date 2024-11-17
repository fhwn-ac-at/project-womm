namespace app
{
    using lib;
    using lib.converter;
    using lib.item_handler;
    using lib.item_handler.results;
    using lib.messaging;
    using lib.options;
    using lib.parser;
    using lib.queue;
    using lib.settings;
    using lib.storage;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Hosting;
    using Microsoft.VisualBasic;
    using System.IO.Abstractions;

    public class Program
    {
        internal static void Main(string[] args)
        {
            IHost host = Host.CreateDefaultBuilder(args).ConfigureServices((hostContext, services) =>
            {
                IConfiguration config = hostContext.Configuration;
                services.AddOptions<WorkerOptions>()
                    .Bind(config.GetRequiredSection("Worker"));
                
                services.AddOptions<StorageOptions>()
                    .Bind(config.GetRequiredSection("Storage"));
                
                services.AddOptions<WorkItemHandlerOptions>()
                    .Bind(config.GetRequiredSection("Operation"));

                services.AddOptions<MessagingOptions>()
                    .Bind(config.GetRequiredSection("Messaging"));

                services.AddTransient<Worker>();
                services.AddTransient<IWorkItemConverter, JSONWorkItemConverter>();
                services.AddTransient<ITaskVisitor<TaskProcessedResult>, TaskHandler>();
                services.AddTransient<IStorageSystem, AmazonS3Storage>();
                services.AddTransient<IFileSystem, System.IO.Abstractions.FileSystem>();
                services.AddTransient<IMultiQueueSystem<string>, RabbitMQSystem>();
                services.AddTransient<IMessageService, MessageService>();


            }).Build();

            host.Services
                .GetRequiredService<Worker>().Run();
        }
    }
}
