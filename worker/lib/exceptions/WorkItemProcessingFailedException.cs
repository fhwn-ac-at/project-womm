﻿namespace lib.exceptions
{
    using lib.item_handler;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class WorkItemProcessingFailedException : Exception
    {
        public WorkItemProcessingFailedException(string message, Exception innerException, IWorkItem item) : base(message, innerException)
        {
            ArgumentNullException.ThrowIfNull(item);

            this.Item = item;
        }

        public IWorkItem Item { get; }
    }
}
