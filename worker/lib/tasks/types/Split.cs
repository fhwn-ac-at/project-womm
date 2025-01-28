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

            if (data.results.Length != 1)
            {
                throw new InvalidDataException("Expecting exactly one result");
            }

            _parameters = parameters;
        }

        public double From => _parameters.from;

        public double To => _parameters.to;

        public string KeyName => _parameters.keyName;
        
        public override void Process()
        {
            string downloadedFile = Path.Join(WorkingDirectory, _parameters.keyName);
            Storage.Download(WorkingDirectory, KeyName);
            
            string destination = Path.Join(WorkingDirectory, "output.mp4");
            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"",
                destination: $"\"{destination}\"");

            command.AddArgument("-c", "copy");
            command.AddArgument("-ss", From.ToString());
            command.AddArgument("-to", To.ToString());

            try
            {
                command.Execute();

                File.Delete(downloadedFile);
            
                // there can only be one result otherwise the constructor would throw an error.
                Storage.Upload(destination, Results[0]);
            }
            catch (Exception e)
            {
                throw;
            }
            finally
            {
                CleanUp();
            }
        }
    }
}