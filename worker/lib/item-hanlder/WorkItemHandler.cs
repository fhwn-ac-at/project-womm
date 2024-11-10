namespace lib.item_hanlder
{
    using lib.commands;
    using lib.item_hanlder.work_items;
    using lib.options;
    using lib.storage;
    using Microsoft.Extensions.Options;
    using System;
    using System.IO;
    using System.Security.AccessControl;
    using System.Security.Principal;

    public class WorkItemHandler : IWorkItemVisitor<IWorkItemResult>
    {
        private readonly IStorageSystem _storage;

        private readonly string _rootPath;

        public WorkItemHandler(IStorageSystem storage, IOptions<WorkItemHandlerOptions> options)
        {
            ArgumentNullException.ThrowIfNull(storage);

            _storage = storage;
            _rootPath = options.Value.RootDirectory;

            if (!Directory.Exists(options.Value.RootDirectory))
            {
                throw new ArgumentException("Cannot find directory: " + options.Value.RootDirectory);
            }
        }

        public IWorkItemResult Visit(Split item)
        {

            string s = "C:\\Users\\micha\\Desktop\\sample-30s.mp4";

            return null;
        }

        public IWorkItemResult Visit(ConvertFormat command)
        {
            string tempFolder = DownloadFileIntoTempFolder(command.KeyName);
            string downloadedFile = Path.Combine(tempFolder, command.KeyName);

            string fileName = Guid.NewGuid().ToString() + command.GoalFormat;
            var resultFile = Path.Combine(tempFolder, fileName);

            FFmpegRunner.RunFFmpeg($"-i {downloadedFile} {resultFile}");

            _storage.Upload(resultFile, fileName);

            Directory.Delete(tempFolder, true);

            return new SuccessfulUpload(fileName);
        }

        private string RetriveFileIntoTempFolder()
        {
            
            throw new NotImplementedException();
        }

        public IWorkItemResult Visit(Trim trim)
        {
            throw new NotImplementedException();
        }

        private string DownloadFileIntoTempFolder(string fileKey)
        {
            string localPath = Path.Combine(_rootPath, Guid.NewGuid().ToString());

            Directory.CreateDirectory(localPath);

            _storage.Download(localPath, fileKey);

            return localPath;
        }
    }
}
