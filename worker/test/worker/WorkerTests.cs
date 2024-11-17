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

    internal class WorkerTests
    {
        [Test]
        public void WorkerWritesHeartbeatIntoQueueInInterval()
        {
            var optionsMock = new Mock<IOptions<WorkerOptions>>();
            optionsMock.Setup(o => o.Value).Returns(new WorkerOptions
            {
                HeartbeatSecondsDelay = 1,
                SendHeartbeat = true,
                WorkerName = "my-worker",
                Queues = new QueueOptions
                {
                    ArtifactQueueName = "foo",
                    HostName = "foo",
                    Port = 0,
                    RoutingKey = "foo",
                    TaskQueueName = "foo",
                    WorkerQueueName = "foo",
                }
            }) ;

            var converterMock = new Mock<IWorkItemConverter>();
            var workItemHandlerMock = new Mock<IWorkItemVisitor<ItemProcessedResult>>();
            var remoteStorageMock = new Mock<IStorageSystem>();
            var messageServiceMock = new Mock<IMessageService>();

            List<string> queueItems = [];

            var queuingSystemMock = new Mock<IMultiQueueSystem<string>>();
            queuingSystemMock
                .Setup(q => q.Enqueue(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((queueName, item) =>
                {
                    queueItems.Add(item);
                });

            var worker = new Worker(
                optionsMock.Object,
                converterMock.Object,
                workItemHandlerMock.Object,
                remoteStorageMock.Object,
                queuingSystemMock.Object,
                messageServiceMock.Object);

            worker.Run();
            Thread.Sleep(3000);
            worker.Dispose();

            Assert.That(queueItems.Count, Is.EqualTo(3));
        }
    }
}
