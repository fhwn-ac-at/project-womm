using System.IO.Abstractions;
using lib.commands;
using lib.exceptions;
using lib.item_handler.results;
using lib.storage;

namespace lib.tasks.types
{
    public class Split : ITask
    {
        private readonly IFileSystem _fs;
        
        private readonly IStorageSystem _storage;

        private readonly string _rootPath;

        public Split(IFileSystem fs, IStorageSystem storage, string rootPath, 
            string id, string segmentTime, string keyName, string[] results)
        {
            ArgumentNullException.ThrowIfNull(fs);
            ArgumentNullException.ThrowIfNull(storage);
            ArgumentNullException.ThrowIfNull(results);
            ArgumentException.ThrowIfNullOrEmpty(rootPath);
            ArgumentException.ThrowIfNullOrEmpty(id);
            ArgumentException.ThrowIfNullOrEmpty(segmentTime);
            ArgumentException.ThrowIfNullOrEmpty(keyName);
            
            _fs = fs;
            _storage = storage;
            _rootPath = rootPath;
            Id = id;
            SegmentTime = segmentTime;
            KeyName = keyName;
            Results = results;
        }
        
        public string Id { get; }
        
        public string[] Results { get; }
        
        public string SegmentTime { get; }

        public string KeyName { get; }

        public TaskProcessedResult Process()
        {
            string tempFolder;
            string downloadedFile;
            try
            {
                tempFolder = _storage.DownloadIntoTempFolder(_rootPath, KeyName); 
                downloadedFile = _fs.Path.Combine(tempFolder, KeyName);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to download File locally: " + e.Message, e, this);
            }

            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"", 
                destination: $"\"{tempFolder}\"/output%03d.mp4");

            command.AddArgument("-c", "copy");
            command.AddArgument("-map", "0");
            command.AddArgument("-segment_time", SegmentTime);
            command.AddArgument("-f", "segment");
            command.AddArgument("-reset_timestamps", "1");
            
            command.Execute();

            List<string> uploadedFiles;
            try
            {
                _fs.File.Delete(downloadedFile);
                uploadedFiles = _storage.UploadFolderContents(tempFolder);
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