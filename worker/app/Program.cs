using lib.tasks;
using lib.tasks.creation;
using lib.tasks.creation;

namespace app
{
    using lib;
    using lib.messaging;
    using lib.options;
    using lib.queue;
    using lib.settings;
    using lib.storage;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Hosting;
    using Microsoft.Extensions.Logging;
    using System.IO.Abstractions;

    public class Program
    {
        internal static void Main(string[] args)
        { 
            IHost host = Host.CreateDefaultBuilder(args)
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();

                })
                .ConfigureServices((hostContext, services) =>
            {
                services.AddLogging();
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
                services.AddTransient<IStorageSystem, AmazonS3Storage>();
                services.AddTransient<IFileSystem, System.IO.Abstractions.FileSystem>();
                services.AddTransient<ITaskExecutor, TaskExecutor>(BuildTaskExecutor);
                services.AddTransient<IMultiQueueSystem<string>, RabbitMQSystem>();
                services.AddTransient<IMessageService, MessageService>();
            }).Build();

            host.Services
                .GetRequiredService<Worker>().Run();
            Console.ReadKey();
        }

        private static TaskExecutor BuildTaskExecutor(IServiceProvider sp)
        {
            var storage = sp.GetService<IStorageSystem>();
            var fs = sp.GetService<IFileSystem>();
            
            if (fs == null || storage == null) return new TaskExecutor([]);
            
            var mapping = new Dictionary<string, ITaskFactory>();
            mapping.Add("split", new SplitFactory(storage, fs));
            mapping.Add("splice", new SpliceFactory(storage, fs));
            mapping.Add("convert", new ConvertFactory(storage, fs));

            return new TaskExecutor(mapping); 
        }
    }
}
