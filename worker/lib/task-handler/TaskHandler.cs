namespace lib.item_handler
{
    using lib.commands;
    using lib.exceptions;
    using lib.item_handler.results;
    using lib.item_handler.work_items;
    using lib.options;
    using lib.storage;
    using System.IO.Abstractions;
    using Microsoft.Extensions.Options;
    using System;
    
    public class TaskHandler : ITaskVisitor<TaskProcessedResult>
    {
        private readonly IStorageSystem _storage;

        private readonly IFileSystem _fileSystem;
        
        private readonly string _rootPath;

        public TaskHandler(
            IStorageSystem storage,
            IOptions<WorkItemHandlerOptions> options, 
            IFileSystem fileSystem)
        {
            ArgumentNullException.ThrowIfNull(storage);
            ArgumentNullException.ThrowIfNull(options);
            ArgumentNullException.ThrowIfNull(fileSystem);

            _storage = storage;
            _fileSystem = fileSystem;
            _rootPath = options.Value.RootDirectory;

            if (!_fileSystem.Directory.Exists(options.Value.RootDirectory))
            {
                throw new ArgumentException("Cannot find directory: " + options.Value.RootDirectory);
            }
        }

        public TaskProcessedResult Visit(Split split)
        {
            string tempFolder;
            string downloadedFile;
            try
            {
                tempFolder = DownloadFileIntoTempFolder(split.KeyName);
                downloadedFile = _fileSystem.Path.Combine(tempFolder, split.KeyName);
            }
            catch (IOException e)
            {
                throw new WorkItemProcessingFailedException("Unable to download File locally: " + e.Message, e, split);
            }

            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"", 
                destination: $"\"{tempFolder}\"/output%03d.mp4");

            command.AddArgument("-c", "copy");
            command.AddArgument("-map", "0");
            command.AddArgument("-segment_time", split.SegmentTime);
            command.AddArgument("-f", "segment");
            command.AddArgument("-reset_timestamps", "1");

            try
            {
                command.Execute();
            }
            catch (CommandExecutionException)
            {
                throw;
            }

            List<string> uploadedFiles;
            try
            {
                _fileSystem.File.Delete(downloadedFile);
                uploadedFiles = UploadContents(tempFolder);
                _fileSystem.Directory.Delete(tempFolder, true);
            }
            catch (IOException e)
            {
                throw new WorkItemProcessingFailedException("Unable to Cleanup after processing: " + e.Message, e, split);
            }
            catch (StorageException)
            {
                throw;
            }

            return new TaskProcessedResult(split.ID, uploadedFiles);
        }

        public TaskProcessedResult Visit(ConvertFormat convert)
        {
            string tempFolder;
            string downloadedFile;
            string resultFile;
            try
            {
                tempFolder = DownloadFileIntoTempFolder(convert.KeyName);
                downloadedFile = _fileSystem.Path.Combine(tempFolder, convert.KeyName);
                resultFile = _fileSystem.Path.Combine(tempFolder, GenerateId() + convert.GoalFormat);
            }
            catch (IOException e)
            {
                throw new WorkItemProcessingFailedException("Unable to download File locally: " + e.Message, e, convert);
            }

            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"",
                destination: $"\"{resultFile}\"");

            try
            {
                command.Execute();
            }
            catch (CommandExecutionException)
            {
                throw;
            }


            List<string> uploadedFiles;
            try
            {
                uploadedFiles = UploadContents(tempFolder).ToList();
                _fileSystem.Directory.Delete(tempFolder, true);
            }
            catch (IOException e)
            {
                throw new WorkItemProcessingFailedException("Unable to Cleanup after processing: " + e.Message, e, convert);
            }
            catch (StorageException)
            {
                throw;
            }

            return new TaskProcessedResult(convert.ID, uploadedFiles);
        }

        public TaskProcessedResult Visit(Trim trim)
        {
            throw new NotImplementedException();
        }

        private string DownloadFileIntoTempFolder(string fileKey)
        {
            string localPath = _fileSystem.Path.Combine(_rootPath, GenerateId());

            _fileSystem.Directory.CreateDirectory(localPath);

            _storage.Download(localPath, fileKey);

            return localPath;
        }

        private List<string> UploadContents(string folder)
        {
            var contents = _fileSystem.Directory.EnumerateFiles(folder,
                                                    string.Empty,
                                                    SearchOption.AllDirectories);

            foreach (var file in contents)
            {
                string key = _fileSystem.Path.GetFileName(file);
                
                try
                {
                    _storage.Upload(file, key);
                }
                catch (StorageException)
                {
                    throw;
                }
            }

            return contents.Select(f => _fileSystem.Path.GetFileName(f)).ToList();
        }

        private static string GenerateId()
        {
            return Guid.NewGuid().ToString()[..8];
        }
    }
}
