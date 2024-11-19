namespace test.worker_test
{
    using lib.converter;
    using lib.item_handler.results;
    using lib.item_handler;
    using lib.messaging;
    using lib.queue;
    using lib.settings;
    using Microsoft.Extensions.Options;
    using Moq;
    using Moq.Protected;
    using lib.storage;
    using lib;
    using lib.parser;
    using lib.options;
    using System.Text.Json;
    using System.Xml.Linq;
    using lib.item_handler.work_items;
    using NuGet.Protocol.Plugins;
    using lib.exceptions;

    internal class WorkerTests
    {
        [Test]
        public void WorkerSendsHeartbeatIntoQueueInInterval()
        {
            var workerOptionsMock = GetTestingWorkerOptions();
            var converterMock = new Mock<IWorkItemConverter>();
            var workItemHandlerMock = new Mock<ITaskVisitor<TaskProcessedResult>>();
            var remoteStorageMock = new Mock<IStorageSystem>();
            var messageServiceMock = new Mock<IMessageService>();
            messageServiceMock
                .Setup(m => m.GetHeartbeat(It.IsAny<string>(), It.IsAny<string>()))
                .Returns((string name, string listens) =>
                {
                    return "worker_heartbeat " + name + " " + listens; 
                });

            List<string> queueItems = [];

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            queuingSystemMock
                .Setup(q => q.Enqueue(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((queueName, item) =>
                {
                    queueItems.Add(item);
                });

            var worker = new Worker(
                workerOptionsMock.Object,
                converterMock.Object,
                workItemHandlerMock.Object,
                remoteStorageMock.Object,
                queuingSystemMock.Object,
                messageServiceMock.Object);

            worker.Run();
            Thread.Sleep(3000);
            worker.Dispose();

            Assert.That(queueItems.Count, Is.EqualTo(3));
            string expectedMessage = "worker_heartbeat " + workerOptionsMock.Object.Value.WorkerName + " task-queue";

            Assert.Multiple(() =>
            {
                Assert.That(queueItems[0], Is.EqualTo(expectedMessage));
                Assert.That(queueItems[1], Is.EqualTo(expectedMessage));
                Assert.That(queueItems[2], Is.EqualTo(expectedMessage));
            });
        }

        [Test]
        public void WorkerNotifiesQueueWhenProcessingTasks()
        {

            var workerOptionsMock = GetTestingWorkerOptions();
            workerOptionsMock.Object.Value.SendHeartbeat = false;

            var converterMock = new Mock<IWorkItemConverter>();
            converterMock
                .Setup(m => m.Convert(It.IsAny<string>()))
                .Returns((string value) => new Split("some-key", "00:00:01", "1"));

            // Set this up to stop after actually processing the task
            converterMock
                .Setup(m => m.Convert(It.IsAny<TaskProcessedResult>()))
                .Returns((TaskProcessedResult value) => "parsed-task");

            var workItemHandlerMock = new Mock<ITaskVisitor<TaskProcessedResult>>();
            workItemHandlerMock
                .Setup(m => m.Visit(It.IsAny<Split>()))
                .Returns((Split s) => new TaskProcessedResult("1", ["some.mp4"]));

            var remoteStorageMock = new Mock<IStorageSystem>();
            var messageServiceMock = new Mock<IMessageService>();
            
            messageServiceMock
                .Setup(m => m.GetProcessingStarted(It.IsAny<string>(), It.IsAny<string>()))
                .Returns((string taskId, string workerName) =>
                {
                    return "processing_started " + taskId + " " + workerName;
                });
            messageServiceMock
                .Setup(m => m.GetProcessingCompleted(It.IsAny<string>(), It.IsAny<string>()))
                .Returns((string taskId, string workerName) =>
                {
                    return "processing_completed " + taskId + " " + workerName;
                });



            List<string> queueItems = [];

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            queuingSystemMock
                .Setup(q => q.Enqueue(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((queueName, item) =>
                {
                    queueItems.Add(item);
                });

            var worker = new Worker(
                workerOptionsMock.Object,
                converterMock.Object,
                workItemHandlerMock.Object,
                remoteStorageMock.Object,
                queuingSystemMock.Object,
                messageServiceMock.Object);

            worker.Run();

            // Simulate a new task upload into the queue
            string startedMessage = "processing_started 1 my-worker";
            string completedMessage = "processing_completed 1 my-worker";
            queuingSystemMock.Raise(qs => qs.OnMessageReceived += null, new MessageReceivedEventArgs<string>(startedMessage));

            Assert.That(queueItems.Count, Is.EqualTo(2));
            Assert.That(queueItems[0], Is.EqualTo(startedMessage));
            Assert.That(queueItems[1], Is.EqualTo(completedMessage));
        }

        [Test]
        public void WorkerReportsParsingError()
        {
            var workerOptionsMock = GetTestingWorkerOptions();
            workerOptionsMock.Object.Value.SendHeartbeat = false;

            var converterMock = new Mock<IWorkItemConverter>();
            converterMock
                .Setup(m => m.Convert(It.IsAny<string>()))
                .Returns((string value) => throw new WorkItemConversionException());

            var workItemHandlerMock = new Mock<ITaskVisitor<TaskProcessedResult>>();
            var remoteStorageMock = new Mock<IStorageSystem>();
            var messageServiceMock = new Mock<IMessageService>();

            string expectedError = string.Empty;
            messageServiceMock
                .Setup(m => m.GetProcessingFailed(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((string taskid, string workerName, string error) =>
                {
                    expectedError = taskid + " " + workerName + " " + error;
                    return expectedError;
                });

            List<string> queueItems = [];

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            queuingSystemMock
                .Setup(q => q.Enqueue(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((queueName, item) =>
                {
                    queueItems.Add(item);
                });

            var worker = new Worker(
                workerOptionsMock.Object,
                converterMock.Object,
                workItemHandlerMock.Object,
                remoteStorageMock.Object,
                queuingSystemMock.Object,
                messageServiceMock.Object);

            worker.Run();

            queuingSystemMock.Raise(qs => qs.OnMessageReceived += null, new MessageReceivedEventArgs<string>(string.Empty));

            Assert.That(queueItems.Count, Is.EqualTo(1));
            Assert.That(queueItems[0], Is.EqualTo(expectedError));
        }

        [Test]
        public void WorkerReportsExecutionError()
        {
            var workerOptionsMock = GetTestingWorkerOptions();
            workerOptionsMock.Object.Value.SendHeartbeat = false;

            var converterMock = new Mock<IWorkItemConverter>();
            var failingTask = new Split("some-key", "00:00:05", "1");
            converterMock
                .Setup(m => m.Convert(It.IsAny<string>()))
                .Returns((string value) => failingTask);

            var workItemHandlerMock = new Mock<ITaskVisitor<TaskProcessedResult>>();
            workItemHandlerMock
                .Setup(m => m.Visit(It.IsAny<Split>()))
                .Throws(new WorkItemProcessingFailedException("Oops something went wrong...", new Exception(), failingTask)) ;

            var remoteStorageMock = new Mock<IStorageSystem>();
            var messageServiceMock = new Mock<IMessageService>();

            string expectedError = string.Empty;
            messageServiceMock
                .Setup(m => m.GetProcessingFailed(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((string taskid, string workerName, string error) =>
                {
                    expectedError = taskid + " " + workerName + " " + error;
                    return expectedError;
                });

            List<string> queueItems = [];

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            queuingSystemMock
                .Setup(q => q.Enqueue(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((queueName, item) =>
                {
                    queueItems.Add(item);
                });

            var worker = new Worker(
                workerOptionsMock.Object,
                converterMock.Object,
                workItemHandlerMock.Object,
                remoteStorageMock.Object,
                queuingSystemMock.Object,
                messageServiceMock.Object);

            worker.Run();

            queuingSystemMock.Raise(qs => qs.OnMessageReceived += null, new MessageReceivedEventArgs<string>(string.Empty));

            Assert.That(queueItems.Count, Is.EqualTo(1));
            Assert.That(queueItems[0], Is.EqualTo(expectedError));
        }

        private Mock<IOptions<WorkerOptions>> GetTestingWorkerOptions()
        {
            var workerOptionsMock = new Mock<IOptions<WorkerOptions>>();
            workerOptionsMock.Setup(o => o.Value).Returns(new WorkerOptions
            {
                HeartbeatSecondsDelay = 1,
                SendHeartbeat = true,
                WorkerName = "my-worker",
                Queues = new QueueOptions
                {
                    ArtifactQueueName = "artifact-queue",
                    HostName = "foo",
                    Port = 0,
                    RoutingKey = "foo",
                    TaskQueueName = "task-queue",
                    WorkerQueueName = "worker-queue",
                }
            });

            return workerOptionsMock;
        }
    }
}
