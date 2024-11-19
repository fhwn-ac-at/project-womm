namespace test.file_conversion
{
    using lib.item_handler.work_items;
    using lib.item_handler;
    using lib.options;
    using lib.storage;
    using Microsoft.Extensions.Options;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using lib.item_handler.results;
    using lib.exceptions;
    using Microsoft.VisualStudio.TestPlatform.ObjectModel;
    using System.IO.Abstractions;
    using test;
    using NuGet.ContentModel;
    using test.mock;

    internal class SplitTests
    {
        private readonly string _rootDir = "C:\\Users\\micha\\FH\\5_Semester\\Verteilte Systeme\\project-womm\\worker\\test\\sample-dest\\";

        private readonly string _itemSource = "C:\\Users\\micha\\FH\\5_Semester\\Verteilte Systeme\\project-womm\\worker\\test\\sample-source\\";

        [TestCase("::::")]
        [TestCase("abcd")]
        [TestCase("100:00:00")]
        [TestCase("00:100:00")]
        [TestCase("00:00:100")]
        [TestCase("12:a:4")]
        [TestCase("12:4:b")]
        [TestCase("a:3:4")]
        public void SplitConstructorThrowsOnInvalidTimeData(string input)
        {
            Assert.Throws<InvalidTimeSegmentException>(
                () => new Split("some-key", input, "1"));
        }

        [TestCase("0:0:0")]
        [TestCase("1:0:0")]
        [TestCase("0:2:0")]
        [TestCase("0:0:3")]
        [TestCase("51:70:90")]
        [TestCase("00:10:50")]
        public void SplitConstructorDoesNotThrowOnInvalidTimeData(string input)
        {
            Assert.DoesNotThrow(() => new Split("some-key", input, "1"));
        }

        [TestCase("00:00:10", 3)]
        [TestCase("00:00:15", 2)]
        [TestCase("00:01:00", 1)]
        public void SplitWorksWithDifferentTimes(string time, int expectedSplits)
        {
            IOptions<WorkItemHandlerOptions> options =
                Options.Create(new WorkItemHandlerOptions()
                {
                    RootDirectory = _rootDir
                });

            var itemHandler = new TaskHandler(
                new LocalStorageSystem(_itemSource),
                options,
                new FileSystem());

            var testItem = new Split("sample-30s.mp4", time, "1");

            var uploadedFiles = testItem.Accept(itemHandler);

            Assert.That(uploadedFiles.Files.Count, Is.EqualTo(expectedSplits));
            
            foreach (var file in uploadedFiles.Files)
            {
                var path = Path.Combine(_itemSource, file);
                Assert.That(File.Exists(path));
            }
        }

        [TestCase(2)]
        [TestCase(3)]
        [TestCase(4)]
        [TestCase(5)]
        [TestCase(6)]
        [TestCase(7)]
        public void SplitThrowsOnFileSystemFailure(int throwErrorOnCall)
        {
            IOptions<WorkItemHandlerOptions> options =
                Options.Create(new WorkItemHandlerOptions()
                {
                    RootDirectory = _rootDir
                });

            var faultyFileSystem = new FaultyFileSystem(new FileSystem(), throwErrorOnCall, new IOException());

            var itemHandler = new TaskHandler(
                new LocalStorageSystem(_itemSource),
                options,
                faultyFileSystem);

            var split = new Split("sample-30s.mp4", "00:00:10", "1");

            Assert.Throws<WorkItemProcessingFailedException>(() =>
            {
                _ = split.Accept(itemHandler);
            });
        }

        [TestCase(1)]
        [TestCase(2)]
        [TestCase(3)]
        public void SplitThrowsOnStorageFailure(int failOnNthCall)
        {
            IOptions<WorkItemHandlerOptions> options =
                Options.Create(new WorkItemHandlerOptions()
                {
                    RootDirectory = _rootDir
                });

            var faultyStorageSystem = new FaultyStorageSystem(new LocalStorageSystem(_itemSource), failOnNthCall);

            var itemHandler = new TaskHandler(
                faultyStorageSystem,
                options,
                new FileSystem());

            var split = new Split("sample-30s.mp4", "00:00:10", "1");

            Assert.Throws<StorageException>(() =>
            {
                _ = split.Accept(itemHandler);
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
