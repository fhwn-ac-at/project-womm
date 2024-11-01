namespace lib
{
    using lib.aspects.logging;
    using lib.settings;
    using Microsoft.Extensions.Options;
    using RabbitMQ.Client;
    using RabbitMQ.Client.Events;
    using System;
    using System.Collections.Generic;
    using System.ComponentModel;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Runtime.InteropServices.Marshalling;
    using System.Text;
    using System.Threading.Channels;
    using System.Threading.Tasks;

    [LoggingClass]
    public class Driver
    {
        private readonly DriverOptions _options;

        public Driver(IOptions<DriverOptions> options)
        {
            ArgumentNullException.ThrowIfNull(options);
            ArgumentNullException.ThrowIfNull(options.Value);
            _options = options.Value;
        }

        public void Run() 
        {
            
        }
    }
}
