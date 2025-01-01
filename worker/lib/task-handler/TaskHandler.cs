using System.Text;
using lib.tasks;
using Microsoft.Extensions.Primitives;

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
                tempFolder = DownloadIntoTempFolder(split.KeyName);
                downloadedFile = _fileSystem.Path.Combine(tempFolder, split.KeyName);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to download File locally: " + e.Message, e, split);
            }

            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"", 
                destination: $"\"{tempFolder}\"/output%03d.mp4");

            command.AddArgument("-c", "copy");
            command.AddArgument("-map", "0");
            command.AddArgument("-segment_time", split.SegmentTime);
            command.AddArgument("-f", "segment");
            command.AddArgument("-reset_timestamps", "1");
            
            command.Execute();

            List<string> uploadedFiles;
            try
            {
                _fileSystem.File.Delete(downloadedFile);
                uploadedFiles = UploadContents(tempFolder);
                _fileSystem.Directory.Delete(tempFolder, true);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to Cleanup after processing: " + e.Message, e, split);
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
                tempFolder = DownloadIntoTempFolder(convert.KeyName);
                downloadedFile = _fileSystem.Path.Combine(tempFolder, convert.KeyName);
                resultFile = _fileSystem.Path.Combine(tempFolder, GenerateId() + convert.GoalFormat);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to download File locally: " + e.Message, e, convert);
            }

            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"",
                destination: $"\"{resultFile}\"");

            command.Execute();


            List<string> uploadedFiles;
            try
            {
                uploadedFiles = UploadContents(tempFolder).ToList();
                _fileSystem.Directory.Delete(tempFolder, true);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to Cleanup after processing: " + e.Message, e, convert);
            }

            return new TaskProcessedResult(convert.ID, uploadedFiles);
        }

        public TaskProcessedResult Visit(Splice splice)
        {
            if (splice.FileKeys.Length == 0)
            {
                throw new TaskProcessingFailedException("No files were provided", splice);
            }

            var tempFolder = DownloadIntoTempFolder(splice.FileKeys);
            var concat = GenerateSourceConcatenation(tempFolder);

            var resultId = GenerateId() + ".mp4";
            var resultFile = _fileSystem.Path.Combine(tempFolder, resultId);
            
            var command = new FFmpegCommand(concat, resultFile);
            command.AddArgument("-c", "copy");
            command.Execute();
            
            _storage.Upload(resultFile, resultId);

            return new TaskProcessedResult(splice.ID, []);
        }

        private string DownloadIntoTempFolder(string fileKey)
        {
            string localPath = _fileSystem.Path.Combine(_rootPath, GenerateId());

            _fileSystem.Directory.CreateDirectory(localPath);

            _storage.Download(localPath, fileKey);

            return localPath;
        }

        private string DownloadIntoTempFolder(string[] files)
        {
            var folder = DownloadIntoTempFolder(files[0]);

            for (var i = 1; i < files.Length; i++)
            {
                var file = files[i];
                _storage.Download(folder, file);
            }
            
            return folder;
        }

        private List<string> UploadContents(string folder)
        {
            var contents = _fileSystem.Directory.EnumerateFiles(folder,
                                                    string.Empty,
                                                    SearchOption.AllDirectories);

            foreach (var file in contents)
            {
                string key = _fileSystem.Path.GetFileName(file);
                _storage.Upload(file, key);
            }

            return contents.Select(f => _fileSystem.Path.GetFileName(f)).ToList();
        }

        private static string GenerateId()
        {
            return Guid.NewGuid().ToString()[..8];
        }
        
        private static string GenerateSourceConcatenation(string folder)
        {
            var sb = new StringBuilder();
            sb.Append("\"concat:");

            var files = Directory.EnumerateFiles(folder, "*.*", SearchOption.AllDirectories);
            
            foreach (var file in files)
            {
                sb.Append(file);
                sb.Append('|');
            }
            sb.Append('\"');
            
            return sb.ToString();
        }
    }
}
