namespace lib
{
    using lib.aspects.logging;
    using lib.item_hanlder;
    using lib.parser;
    using lib.queue;
    using lib.settings;
    using Microsoft.Extensions.Options;
    using RabbitMQ.Client;
    using RabbitMQ.Client.Events;
    using System;
    using System.Collections.Generic;
    using System.ComponentModel;
    using System.ComponentModel.DataAnnotations;
    using System.Linq;
    using System.Runtime.InteropServices.Marshalling;
    using System.Text;
    using System.Threading.Channels;
    using System.Threading.Tasks;

    [LoggingClass]
    public class Driver
    {
        private readonly DriverOptions _options;

        private readonly IConverter<string, IWorkItem> _workItemConverter;

        private readonly IWorkItemVisitor _workItemHandler;
        private readonly WorkItemQueue _taskQueue;
        private WorkItemQueue _resultQueue;

        public Driver(
            IOptions<DriverOptions> options,
            IConverter<string, IWorkItem> workItemConverter,
            IWorkItemVisitor workItemHandler)
        {
            ArgumentNullException.ThrowIfNull(options);
            ArgumentNullException.ThrowIfNull(workItemConverter);
            ArgumentNullException.ThrowIfNull(workItemHandler);
            ArgumentNullException.ThrowIfNull(options);
            ArgumentNullException.ThrowIfNull(options.Value);
            
            _options = options.Value;
            _workItemConverter = workItemConverter;
            _workItemHandler = workItemHandler;

            _taskQueue = new WorkItemQueue(_options.Tasks);
            _taskQueue.OnWorkItemAdded += this.NewTaskAddedCallback;

            _resultQueue = new WorkItemQueue(_options.Results);
        }

        public void Run() 
        {
            _taskQueue.Start();
            _resultQueue.Start();
        }

        private void NewTaskAddedCallback(object? sender, WorkItemAddedEventArgs e)
        {
            throw new NotImplementedException();
        }
    }
}
