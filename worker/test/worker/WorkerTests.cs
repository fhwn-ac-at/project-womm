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

    internal class WorkerTests
    {
        [Test]
        public void WorkerWritesHeartbeatIntoQueueInInterval()
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
            }) ;

            var converterMock = new Mock<IWorkItemConverter>();
            var workItemHandlerMock = new Mock<IWorkItemVisitor<ItemProcessedResult>>();
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

        private static string GetHeartbeatMessage(string heartbeatPattern, string workerName, string listensOn)
        {
            var message = new
            {
                pattern = heartbeatPattern,
                data = new
                {
                    name = workerName,
                    listensOn = listensOn
                }
            };

            return JsonSerializer.Serialize(message);
        }
    }
}
