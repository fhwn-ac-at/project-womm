namespace lib.exceptions
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public  class TaskConversionException : Exception
    {
        public TaskConversionException(string message, Exception innerException) : base(message, innerException) {}
        
        public TaskConversionException(string message) : base(message) {}
    }
}
