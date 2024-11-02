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
                .GetRequiredService<Driver>().Run(); 
        }
    }
}
