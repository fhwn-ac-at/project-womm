using System.IO.Abstractions;
using lib.commands;
using lib.exceptions;
using lib.item_handler.results;
using lib.storage;

namespace lib.tasks.types
{
    public class ConvertFormat : ITask
    {
        private IFileSystem _fs;
        
        private IStorageSystem _storage;

        private string _rootPath;

        public ConvertFormat(IFileSystem fs, IStorageSystem storage, string rootPath, 
            string id, string keyName, string goalFormat, string[] results)
        {
            ArgumentNullException.ThrowIfNull(fs);
            ArgumentNullException.ThrowIfNull(storage);
            ArgumentNullException.ThrowIfNull(results);
            ArgumentException.ThrowIfNullOrEmpty(rootPath);
            ArgumentException.ThrowIfNullOrEmpty(id);
            ArgumentException.ThrowIfNullOrEmpty(keyName);
            ArgumentException.ThrowIfNullOrEmpty(goalFormat);
            
            _fs = fs;
            _storage = storage;
            _rootPath = rootPath;
            Id = id;
            KeyName = keyName;
            GoalFormat = goalFormat;
            Results = results;
        }
        
        public string Id { get; }
        
        public string[] Results { get; }

        public string KeyName { get; }

        public string GoalFormat { get; }

        public TaskProcessedResult Process()
        {
            string tempFolder;
            string downloadedFile;
            string resultFile;
            try
            {
                tempFolder = _storage.DownloadIntoTempFolder(_rootPath, KeyName); 
                downloadedFile = _fs.Path.Combine(tempFolder, KeyName);
                resultFile = _fs.Path.Combine(tempFolder, Guid.NewGuid().ToString()[..8] + GoalFormat);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to download File locally: " + e.Message, e, this);
            }

            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"",
                destination: $"\"{resultFile}\"");

            command.Execute();
            
            List<string> uploadedFiles;
            try
            {
                uploadedFiles = _storage.UploadFolderContents(tempFolder).ToList(); 
                _fs.Directory.Delete(tempFolder, true);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to Cleanup after processing: " + e.Message, e, this);
            }

            return new TaskProcessedResult(Id, uploadedFiles);
        }
    }
}
