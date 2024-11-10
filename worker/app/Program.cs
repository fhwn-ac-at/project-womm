namespace app
{
    using lib;
    using lib.converter;
    using lib.item_hanlder;
    using lib.options;
    using lib.parser;
    using lib.settings;
    using lib.storage;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Hosting;

    public class Program
    {
        internal static void Main(string[] args)
        {
            IHost host = Host.CreateDefaultBuilder(args).ConfigureServices((hostContext, services) =>
            {
                IConfiguration config = hostContext.Configuration;
                services.AddOptions<DriverOptions>()
                    .Bind(config.GetRequiredSection("Driver"));
                
                services.AddOptions<StorageOptions>()
                    .Bind(config.GetRequiredSection("Storage"));
                
                services.AddOptions<WorkItemHandlerOptions>()
                    .Bind(config.GetRequiredSection("Operation"));
                
                services.AddTransient<Driver>();
                services.AddTransient<IWorkItemConverter, JSONWorkItemConverter>();
                services.AddTransient<IWorkItemVisitor<IWorkItemResult>, WorkItemHandler>();
                //services.AddTransient<IStorageSystem, AmazonS3Storage>();
                services.AddTransient<IStorageSystem, LocalStorageSystem>();

            }).Build();

            host.Services
                .GetRequiredService<Driver>().Run();
        }
    }
}
