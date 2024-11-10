namespace lib.options
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class WorkItemHandlerOptions
    {
        [Required]
        public string RootDirectory { get; set; }
    }
}
