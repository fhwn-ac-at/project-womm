namespace lib.exceptions
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class QueueException : Exception
    {
        public QueueException(string? message, Exception? innerException) : base(message, innerException)
        {
        }
    }
}
