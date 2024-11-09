namespace lib.options
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class StorageOptions
    {
        [Required]
        public string BucketName { get; set; }

        [Required]
        public string AccessKey{ get; set; }

        [Required]
        public string SecreteKey { get; set; }
    }
}
