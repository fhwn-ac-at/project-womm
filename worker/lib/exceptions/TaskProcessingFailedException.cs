using lib.tasks;
using lib.tasks.types;

namespace lib.exceptions
{
    using lib.item_handler;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class TaskProcessingFailedException : Exception
    {
        public TaskProcessingFailedException(string message, Exception innerException, ITask item) : base(message, innerException)
        {
            ArgumentNullException.ThrowIfNull(item);

            this.Item = item;
        }

        public TaskProcessingFailedException(string message, ITask item) : base(message)
        {
            ArgumentNullException.ThrowIfNull(item);
            this.Item = item;
        }

        public ITask Item { get; }
    }
}
