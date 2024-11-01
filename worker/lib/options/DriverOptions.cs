namespace lib.settings
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class DriverOptions
    {
        [Required]
        public QueueServerOptions Tasks { get; set; }

        [Required]
        public QueueServerOptions Results { get; set; }
    }
}
