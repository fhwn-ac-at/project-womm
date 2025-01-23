using System.IO.Abstractions;
using lib.commands;
using lib.exceptions;
using lib.storage;
using lib.tasks.data;
using lib.tasks.exec;

namespace lib.tasks.types
{
    public class Split : ScheduledTask
    {
        private readonly SplitParameters _parameters;

        public Split(TaskData data, IFileSystem fs, IStorageSystem storage, string workingDirectory) 
            : base(data, fs, storage, workingDirectory)
        {
            if (data.parameters is not SplitParameters parameters)
            {
                throw new InvalidDataException("parameters must be of type SplitParameters");
            }
            
            _parameters = parameters;
        }

        public string SegmentTime => _parameters.segmentTime;

        public string KeyName => _parameters.keyName;

        public override void Process()
        {
            string tempFolder;
            string downloadedFile;
            try
            {
                tempFolder = Storage.DownloadIntoTempFolder(WorkingDirectory, KeyName); 
                downloadedFile = Fs.Path.Combine(tempFolder, KeyName);
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
                Fs.File.Delete(downloadedFile);
                uploadedFiles = Storage.UploadFolderContents(tempFolder);
                Fs.Directory.Delete(tempFolder, true);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to Cleanup after processing: " + e.Message, e, this);
            }
        }
    }
}