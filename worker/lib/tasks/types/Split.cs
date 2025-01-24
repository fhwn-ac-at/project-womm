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
            string downloadedFile = Path.Join(WorkingDirectory, _parameters.keyName);
            Storage.Download(WorkingDirectory, 
                KeyName);
            
            string destination = Path.Join(WorkingDirectory, "output%03d.mp4");
            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"",
                destination: $"\"{destination}\"");

            command.AddArgument("-c", "copy");
            command.AddArgument("-map", "0");
            command.AddArgument("-segment_time", SegmentTime);
            command.AddArgument("-f", "segment");
            command.AddArgument("-reset_timestamps", "1");

            command.Execute();
            
            File.Delete(downloadedFile);
            var files = Directory.GetFiles(WorkingDirectory, 
                "*", 
                SearchOption.AllDirectories);

            if (files.Length != Results.Length)
            {
                throw new Exception($"Found {files.Length} files but expected {Results.Length}");
            }
            
            for (int i = 0; i < files.Length; i++)
            {
                Storage.Upload(files[i], Results[i]);
                File.Delete(files[i]);
            }
            
            foreach (var dir in Directory.GetDirectories(WorkingDirectory))
            {
                Directory.Delete(dir, true); 
            }
        }
    }
}