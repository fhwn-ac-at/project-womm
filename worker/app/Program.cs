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
                
                services.AddTransient<Driver>();
                services.AddSingleton<IConverter<string, IWorkItem>, JSONWorkItemConverter>();
                services.AddSingleton<IConverter<IWorkItemResult, string>, JSONWorkItemConverter>();
                services.AddTransient<IWorkItemVisitor<IWorkItemResult>, WorkItemHandler>();
                services.AddTransient<IRemoteStorage, AmazonS3Storage>();

            }).Build();

            host.Services
                .GetRequiredService<Driver>().Run();
        }
    }
}
