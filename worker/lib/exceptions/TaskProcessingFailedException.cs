using lib.tasks;
using lib.tasks.types;

namespace lib.exceptions
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class TaskProcessingFailedException : Exception
    {
        public TaskProcessingFailedException(string message, Exception innerException, ScheduledTask item) : base(message, innerException)
        {
            ArgumentNullException.ThrowIfNull(item);

            this.Item = item;
        }

        public TaskProcessingFailedException(string message, ScheduledTask item) : base(message)
        {
            ArgumentNullException.ThrowIfNull(item);
            this.Item = item;
        }

        public ScheduledTask Item { get; }
    }
}
