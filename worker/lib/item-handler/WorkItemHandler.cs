namespace lib.item_handler
{
    using lib.commands;
    using lib.item_handler.results;
    using lib.item_handler.work_items;
    using lib.options;
    using lib.storage;
    using Microsoft.Extensions.Options;
    using System;
    using System.IO;
    using System.Security.AccessControl;
    using System.Security.Principal;

    public class WorkItemHandler : IWorkItemVisitor<ItemProcessedResult>
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

        public ItemProcessedResult Visit(Split command)
        {
            string tempFolder = DownloadFileIntoTempFolder(command.KeyName);
            string downloadedFile = Path.Combine(tempFolder, command.KeyName);
            
            FFmpegRunner.RunFFmpeg($"-i \"{downloadedFile}\" -c copy -map 0 -segment_time  {command.SegmentTime} -f segment -reset_timestamps 1 \"{tempFolder}\"/output%03d.mp4");

            File.Delete(downloadedFile);

            _storage.UploadMany(tempFolder, false);

            var uploadedFiles = Directory
                .EnumerateFiles(tempFolder)
                .Select(p => Path.GetFileName(p))
                .ToList();

            Directory.Delete(tempFolder, true);

            return new ItemProcessedResult(uploadedFiles);

        }

        public ItemProcessedResult Visit(ConvertFormat command)
        {
            string tempFolder = DownloadFileIntoTempFolder(command.KeyName);
            string downloadedFile = Path.Combine(tempFolder, command.KeyName);

            string fileName = Guid.NewGuid().ToString() + command.GoalFormat;
            var resultFile = Path.Combine(tempFolder, fileName);

            FFmpegRunner.RunFFmpeg($"-i \"{downloadedFile}\" \"{resultFile}\"");

            _storage.Upload(resultFile, fileName);

            Directory.Delete(tempFolder, true);

            return new ItemProcessedResult([fileName]);
        }

        private string RetriveFileIntoTempFolder()
        {
            throw new NotImplementedException();
        }

        public ItemProcessedResult Visit(Trim trim)
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
