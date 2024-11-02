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

        private readonly IConverter<IWorkItemResult, string> _resultConverter;

        private readonly IWorkItemVisitor<IWorkItemResult> _workItemHandler;

        private JSONWorkItemQueue _taskQueue;

        private JSONWorkItemQueue _resultQueue;

        public Driver(
            IOptions<DriverOptions> options,
            IConverter<string, IWorkItem> workItemConverter,
            IConverter<IWorkItemResult, string> resultConverter,
            IWorkItemVisitor<IWorkItemResult> workItemHandler)
        {
            ArgumentNullException.ThrowIfNull(resultConverter);
            ArgumentNullException.ThrowIfNull(workItemConverter);
            ArgumentNullException.ThrowIfNull(workItemHandler);
            ArgumentNullException.ThrowIfNull(options.Value);
            
            _options = options.Value;
            _workItemConverter = workItemConverter;
            this._resultConverter = resultConverter;
            _workItemHandler = workItemHandler;
        }

        public void Run() 
        {
            _taskQueue = new JSONWorkItemQueue(_options.Tasks);
            _taskQueue.OnItemAdded += this.NewTaskAddedCallback;
            _resultQueue = new JSONWorkItemQueue(_options.Results);
        }

        private void NewTaskAddedCallback(object? sender, QueueItemAddedEventArgs<string> e)
        {
            var newItem = _workItemConverter.Convert(e.Item);
            var result = newItem.Accept(_workItemHandler);
            var convertedResult = _resultConverter.Convert(result);
            _resultQueue.Enqueue(convertedResult);
        }
    }
}
