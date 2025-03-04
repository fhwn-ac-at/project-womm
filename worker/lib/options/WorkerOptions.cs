﻿namespace lib.settings
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class WorkerOptions
    {
        [Required]
        public QueueOptions Queues { get; set; }

        [Required]
        public int HeartbeatSecondsDelay { get; set; }

        [Required]
        public string WorkerName { get; set; }

        [Required]
        public int QueuePolls { get; set; }

        [Required]
        public int QueuePollIntervalMilliseconds { get; set; }

        [Required]
        public string RootDirectory { get; set; }
    }
}
