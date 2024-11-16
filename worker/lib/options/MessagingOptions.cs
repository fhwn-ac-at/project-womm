namespace lib.options
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class MessagingOptions
    {
        [Required]
        public string Heartbeat { get; set; }

        [Required]
        public string ProcessingStarted { get; set; }

        [Required]
        public string ProcessingCompleted { get; set; }


        [Required]
        public string ProcessingFailed { get; set; }

        [Required]
        public string ArtifactUploaded { get; set; }

        [Required]
        public string TaskReception{ get; set; }
    }
}
