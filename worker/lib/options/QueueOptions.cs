﻿namespace lib.settings
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class QueueOptions
    {
        [Required]
        public string HostName { get; set; }

        [Required]
        public int Port { get; set; }

        [Required]
        public string TaskQueueName { get; set; }

        [Required]
        public string ArtifactQueueName { get; set; }

        [Required]
        public string WorkerQueueName { get; set; }

        [Required]
        public string RoutingKey { get; set; }
    }
}