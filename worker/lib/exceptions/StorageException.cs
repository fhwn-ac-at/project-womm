namespace lib.exceptions
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class StorageException : Exception
    {
        public StorageException(string message, Exception innerException) : base(message, innerException)
        {
            
        }
    }
}
