using System.IO.Abstractions;
using lib.commands;
using lib.exceptions;
using lib.storage;
using lib.tasks.data;
using lib.tasks.exec;

namespace lib.tasks.types
{
    public class ConvertFormat : EditingTask
    {
        private readonly ConvertParameters _parameters;

        public ConvertFormat(TaskData data, IFileSystem fs, IStorageSystem storage, string workingDirectory)
            : base(data, fs, storage, workingDirectory)
        {
            if (data.parameters is not ConvertParameters parameters)
            {
                throw new InvalidDataException("parameters must be of type SplitParameters");
            }
            
            _parameters = parameters;
        }

        public string KeyName => _parameters.keyName;

        public string GoalFormat => _parameters.goalFormat;

        public override void Process()
        {
            string tempFolder;
            string downloadedFile;
            string resultFile;
            try
            {
                tempFolder = Storage.DownloadIntoTempFolder(WorkingDirectory, KeyName); 
                downloadedFile = Fs.Path.Combine(tempFolder, KeyName);
                resultFile = Fs.Path.Combine(tempFolder, Guid.NewGuid().ToString()[..8] + GoalFormat);
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
                uploadedFiles = Storage.UploadFolderContents(tempFolder).ToList(); 
                Fs.Directory.Delete(tempFolder, true);
            }
            catch (IOException e)
            {
                throw new TaskProcessingFailedException("Unable to Cleanup after processing: " + e.Message, e, this);
            }
        }
    }
}
