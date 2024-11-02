namespace lib.queue
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class QueueItemAddedEventArgs<T> : EventArgs
    {
        public QueueItemAddedEventArgs(T item)
        {
            this.Item = item;
        }

        public T Item 
        { 
            get;
            set; 
        }
    }
}
