namespace lib.queue
{
    using lib.item_hanlder;
    using lib.settings;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class WorkItemQueue : IDisposable
    {
        private readonly QueueServerOptions _options;
        private bool _disposed;

        public WorkItemQueue(QueueServerOptions options)
        {
            ArgumentNullException.ThrowIfNull(options);
            this._options = options;
        }

        public event EventHandler<WorkItemAddedEventArgs>? OnWorkItemAdded;

        public void Start()
        {

        }

        public void Stop() 
        {
            
        }

        public void Enqueue(IWorkItem item)
        {

        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        public virtual void FireOnWorkItemAdded(WorkItemAddedEventArgs e)
        {
            OnWorkItemAdded?.Invoke(this, e);
        }

        private void Dispose(bool disposing)
        {
            if (_disposed)
            {
                return;
            }

            if (disposing)
            {
                // TODO: dispose managed state (managed objects).
            }

            // TODO: free unmanaged resources (unmanaged objects) and override a finalizer below.
            // TODO: set large fields to null.

            _disposed = true;
        }
    }
}
