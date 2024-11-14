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
                () => new Split("some-key", input));
        }

        [TestCase("0:0:0")]
        [TestCase("1:0:0")]
        [TestCase("0:2:0")]
        [TestCase("0:0:3")]
        [TestCase("51:70:90")]
        [TestCase("00:10:50")]
        public void SplitConstructorDoesNotThrowOnInvalidTimeData(string input)
        {
            Assert.DoesNotThrow(() => new Split("some-key", input));
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

            var itemHandler = new WorkItemHandler(
                new LocalStorageSystem(_itemSource),
                options,
                new FileSystem());

            var testItem = new Split("sample-30s.mp4", time);

            var uploadedFiles = testItem.Accept(itemHandler);

            Assert.That(uploadedFiles.Files.Count, Is.EqualTo(expectedSplits));
            
            foreach (var file in uploadedFiles.Files)
            {
                var path = Path.Combine(_itemSource, file);
                Assert.That(File.Exists(path));
            }
        }

        [TearDown]
        public void CleanUp()
        {
            Directory.Delete(_rootDir, true);
            Directory.CreateDirectory(_rootDir);

            var files = Directory.EnumerateFiles(_itemSource, "output*.*");

            foreach (var file in files)
            {
                File.Delete(file);
            }
        }
    }
}
