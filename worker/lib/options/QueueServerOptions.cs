namespace lib.settings
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class QueueServerOptions
    {
        [Required]
        public string HostName { get; set; }

        [Required]
        public int Port { get; set; }

        [Required]
        public string QueueName { get; set; }

        [Required]
        public string RoutingKey { get; set; }
    }
}
