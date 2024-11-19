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
            // Arrange 
            var workerOptionsMock = GetTestingWorkerOptions();
            var converterMock = new Mock<ITaskConverter>();
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

            // Act
            worker.Run();
            Thread.Sleep(3000);
            worker.Dispose();

            // Assert
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
        public void MessageReceivedCallback_ProcessesMessageSuccessfully()
        {
            // Arrange
            var optionsMock = Options.Create(new WorkerOptions
            {
                Queues = new QueueOptions
                {
                    WorkerQueueName = "worker-queue",
                    TaskQueueName = "task-queue",
                    ArtifactQueueName = "artifact-queue"
                },
                WorkerName = "TestWorker",
                SendHeartbeat = false,
                HeartbeatSecondsDelay = 60
            });

            var task = new Split("some-key", "00:00:05", "123");

            var resultMock = new TaskProcessedResult("task123", ["file1.txt", "file2.txt"]);

            var converterMock = new Mock<ITaskConverter>();
            converterMock.Setup(c => c.Convert(It.IsAny<string>())).Returns(task);

            var taskHandlerMock = new Mock<ITaskVisitor<TaskProcessedResult>>();
            taskHandlerMock.Setup(h => h.Visit(task)).Returns(resultMock);

            var storageMock = new Mock<IStorageSystem>();
            storageMock.Setup(s => s.Upload(It.IsAny<string>(), It.IsAny<string>()));

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            queuingSystemMock.Setup(q => q.Enqueue(It.IsAny<string>(), It.IsAny<string>()));

            var messageServiceMock = new Mock<IMessageService>();
            messageServiceMock.Setup(m => m.GetProcessingStarted(It.IsAny<string>(), It.IsAny<string>())).Returns("Started");
            messageServiceMock.Setup(m => m.GetProcessingCompleted(It.IsAny<string>(), It.IsAny<string>())).Returns("Completed");
            messageServiceMock.Setup(m => m.GetArtifactUploaded(It.IsAny<string>(), It.IsAny<string>())).Returns("Uploaded");

            var worker = new Worker(optionsMock, converterMock.Object, taskHandlerMock.Object, storageMock.Object, queuingSystemMock.Object, messageServiceMock.Object);

            // Act
            worker.Run();
            queuingSystemMock.Raise(qs => qs.OnMessageReceived += null, new MessageReceivedEventArgs<string>("TestMessage"));

            // Assert
            converterMock.Verify(c => c.Convert("TestMessage"), Times.Once);
            taskHandlerMock.Verify(h => h.Visit(task), Times.Once);
            storageMock.Verify(s => s.Upload("file1.txt", It.IsAny<string>()), Times.Once);
            storageMock.Verify(s => s.Upload("file2.txt", It.IsAny<string>()), Times.Once);
            queuingSystemMock.Verify(q => q.Enqueue("task-queue", "Started"), Times.Once);
            queuingSystemMock.Verify(q => q.Enqueue("task-queue", "Completed"), Times.Once);
            queuingSystemMock.Verify(q => q.Enqueue("artifact-queue", "Uploaded"), Times.Once);
        }

        [Test]
        public void WorkerReportsParsingError()
        {
            // Arrange
            var optionsMock = Options.Create(new WorkerOptions
            {
                Queues = new QueueOptions
                {
                    WorkerQueueName = "worker-queue",
                    TaskQueueName = "task-queue",
                },
                WorkerName = "TestWorker"
            });

            var converterMock = new Mock<ITaskConverter>();
            converterMock
                .Setup(c => c.Convert(It.IsAny<string>()))
                .Throws(new TaskConversionException());

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            var messageServiceMock = new Mock<IMessageService>();
            messageServiceMock
                .Setup(m => m.GetProcessingFailed(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns("ConversionFailed");

            var worker = new Worker(optionsMock, converterMock.Object, Mock.Of<ITaskVisitor<TaskProcessedResult>>(), Mock.Of<IStorageSystem>(), queuingSystemMock.Object, messageServiceMock.Object);

            // Act
            worker.Run();
            queuingSystemMock.Raise(qs => qs.OnMessageReceived += null, new MessageReceivedEventArgs<string>("InvalidMessage"));

            // Assert
            converterMock.Verify(c => c.Convert("InvalidMessage"), Times.Once);
            queuingSystemMock.Verify(q => q.Enqueue("task-queue", "ConversionFailed"), Times.Once);
        }

        [Test]
        public void WorkerReportsExecutionError()
        {
            // Arrange
            var optionsMock = Options.Create(new WorkerOptions
            {
                Queues = new QueueOptions
                {
                    WorkerQueueName = "worker-queue",
                    TaskQueueName = "task-queue"
                },
                WorkerName = "TestWorker"
            });

            var task = new Split("some-key", "00:00:05", "123");

            var converterMock = new Mock<ITaskConverter>();
            converterMock.Setup(c => c.Convert(It.IsAny<string>())).Returns(task);

            var taskHandlerMock = new Mock<ITaskVisitor<TaskProcessedResult>>();
            taskHandlerMock.Setup(h => h.Visit(It.IsAny<Split>())).Throws(new TaskProcessingFailedException("Processing failed", new Exception(), task)) ;

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            var messageServiceMock = new Mock<IMessageService>();
            messageServiceMock.Setup(m => m.GetProcessingFailed(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns("ProcessingFailed");

            var worker = new Worker(optionsMock, converterMock.Object, taskHandlerMock.Object, Mock.Of<IStorageSystem>(), queuingSystemMock.Object, messageServiceMock.Object);

            // Act
            worker.Run();
            queuingSystemMock.Raise(qs => qs.OnMessageReceived += null, new MessageReceivedEventArgs<string>("TestMessage"));

            // Assert
            converterMock.Verify(c => c.Convert("TestMessage"), Times.Once);
            taskHandlerMock.Verify(h => h.Visit(task), Times.Once);
            queuingSystemMock.Verify(q => q.Enqueue("task-queue", "ProcessingFailed"), Times.Once);
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
