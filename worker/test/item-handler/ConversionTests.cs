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
    }
}
