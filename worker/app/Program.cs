using System.Text.Json;
using lib.tasks;
using lib.tasks.data;
using lib.tasks.exec;
using lib.tasks.types;
using Microsoft.Extensions.Options;

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
                }).ConfigureServices((hostContext, services) =>
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
                services.AddTransient<ITaskExecutor, TaskExecutor>( s => BuildTaskExecutor(s, config));
                services.AddTransient<IMultiQueueSystem<string>, RabbitMQSystem>();
                services.AddTransient<IMessageService, MessageService>();
            }).Build();

            host.Services
                .GetRequiredService<Worker>().Run();
            Console.ReadKey();
        }

        private static TaskExecutor BuildTaskExecutor(IServiceProvider sp, IConfiguration config)
        {
            var storage = sp.GetService<IStorageSystem>();
            var fs = sp.GetService<IFileSystem>();
            
            var rootDir = config
                .GetRequiredSection("Operation")
                .GetValue<string>("RootDirectory") 
                          ?? throw new ArgumentException("Root directory is missing.");
            var messagingOptions = sp.GetService<IOptions<MessagingOptions>>()
                                   ?? throw new ArgumentException("Messaging Section is missing.");;
            
            var jsonOptions = new JsonSerializerOptions
            {
                Converters = { new TaskDataJsonConverter() },
                PropertyNameCaseInsensitive = true
            };
            
            if (fs == null || storage == null) return new TaskExecutor([], jsonOptions, messagingOptions, 
                sp.GetService<ILogger<TaskExecutor>>());
            
            var mapping = new Dictionary<string, Func<TaskData, ScheduledTask>>
            {
                { "Split", (data) => new Split(data, fs, storage, rootDir) },
                { "Splice", (data) => new Splice(data, fs, storage, rootDir) },
                { "ConvertFormat", (data) => new ConvertFormat(data, fs, storage, rootDir) }
            };

            return new TaskExecutor(mapping, jsonOptions , messagingOptions, sp.GetService<ILogger<TaskExecutor>>()); 
        }
    }
}
