namespace test.file_conversion
{
    using lib.item_handler.work_items;
    using lib.item_handler;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using lib.storage;
    using lib.options;
    using Microsoft.Extensions.Options;
    using lib.item_handler.results;
    using System.IO.Abstractions;
    using lib.exceptions;
    using test.item_handler.mock;
    using test.item_handler;

    internal class ConversionTests
    {
        private readonly string _rootDir = "C:\\Users\\micha\\FH\\5_Semester\\Verteilte Systeme\\project-womm\\worker\\test\\sample-dest\\";

        private readonly string _itemSource = "C:\\Users\\micha\\FH\\5_Semester\\Verteilte Systeme\\project-womm\\worker\\test\\sample-source\\";

        [Test]
        public void ConvertWorks()
        {
            IOptions<WorkItemHandlerOptions> options =
                Options.Create(new WorkItemHandlerOptions()
                {
                    RootDirectory = _rootDir
                });

            var itemHandler = new WorkItemHandler(
                new LocalStorageSystem(_itemSource),
                options,
                new FileSystem());

            var testItem = new ConvertFormat("sample-30s.mp4", ".avi");

            var result = testItem.Accept(itemHandler);
            string convertedFile = Path.Combine(_itemSource, result.Files.ToArray()[0]);

            Assert.That(File.Exists(convertedFile));

            //Cleanup
            Directory.Delete(_rootDir, true);
            Directory.CreateDirectory(_rootDir);
            File.Delete(convertedFile);
        }

        [TestCase(2)]
        [TestCase(3)]
        [TestCase(4)]
        [TestCase(5)]
        [TestCase(6)]
        [TestCase(7)]
        public void ConvertThrowsOnFileSystemFailure(int throwErrorOnCall)
        {
            IOptions<WorkItemHandlerOptions> options =
                Options.Create(new WorkItemHandlerOptions()
                {
                    RootDirectory = _rootDir
                });

            var faultyFileSystem = new FaultyFileSystem(new FileSystem(), throwErrorOnCall, new IOException());

            var itemHandler = new WorkItemHandler(
                new LocalStorageSystem(_itemSource),
                options,
                faultyFileSystem);

            var convert = new ConvertFormat("sample-30s.mp4", ".avi");

            Assert.Throws<WorkItemProcessingFailedException>(() =>
            {
                _ = convert.Accept(itemHandler);
            });
        }

        [TestCase(1)]
        [TestCase(2)]
        public void ConvertThrowsOnStorageFailure(int failOnNthCall)
        {
            IOptions<WorkItemHandlerOptions> options =
                Options.Create(new WorkItemHandlerOptions()
                {
                    RootDirectory = _rootDir
                });

            var faultyStorageSystem = new FaultyStorageSystem(new LocalStorageSystem(_itemSource), failOnNthCall);

            var itemHandler = new WorkItemHandler(
                faultyStorageSystem,
                options,
                new FileSystem());

            var convert = new ConvertFormat("sample-30s.mp4", ".avi");

            Assert.Throws<StorageException>(() =>
            {
                _ = convert.Accept(itemHandler);
            });
        }

        [TearDown]
        public void Cleanup()
        {
            var uploads = Directory.EnumerateFiles(_itemSource)
                .Where(f => Path.GetFileName(f) != "sample-30s.mp4");


            foreach (var upload in uploads)
            {
                File.Delete(upload);
            }

            var downloads = Directory.EnumerateFiles(_rootDir);

            foreach (var donwload in downloads)
            {
                File.Delete(donwload);
            }
        }
    }
}
