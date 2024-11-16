namespace lib.queue
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IMultiQueueSystem<TMessage> : IDisposable
    {
        public bool IsExistent(string queueId);

        public void Enqueue(string queueId, TMessage message);

        public void Startup(string listeningQueueId);

        public event EventHandler<MessageReceivedEventArgs<TMessage>> OnMessageReceived;
    }
} 
