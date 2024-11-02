namespace lib.queue
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IQueue<T> 
    {
        public void Enqueue(T item);

        public event EventHandler<QueueItemAddedEventArgs<T>> OnItemAdded;
    }
}
