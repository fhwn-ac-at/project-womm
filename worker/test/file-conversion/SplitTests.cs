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

    internal class SplitTests
    {
        private readonly string _rootDir = "C:\\Users\\micha\\FH\\5_Semester\\Verteilte Systeme\\project-womm\\worker\\test\\sample-dest\\";

        private readonly string _itemSource = "C:\\Users\\micha\\FH\\5_Semester\\Verteilte Systeme\\project-womm\\worker\\test\\sample-source\\";

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
                options);

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
