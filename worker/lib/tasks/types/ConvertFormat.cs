using System.IO.Abstractions;
using lib.commands;
using lib.exceptions;
using lib.storage;
using lib.tasks.data;
using lib.tasks.exec;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace lib.tasks.types
{
    public class ConvertFormat : ScheduledTask
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
        
        public override List<string> Process()
        {
            if (Results.Length != 1)
            {
                throw new Exception($"Expected 1 file in Results array, but got {Results.Length}");
            }
            
            string downloadedFile = Path.Join(WorkingDirectory, _parameters.keyName);
            Storage.Download(WorkingDirectory, 
                KeyName);
            
            string key = KeyName.TrimEnd('.') + GoalFormat;
            string destination = Path.Join(WorkingDirectory, key);

            FFmpegCommand command = new(
                source: $"\"{downloadedFile}\"",
                destination: $"\"{destination}\"");

            try
            {
                command.Execute();
                Storage.Upload(destination, Results[0]);
                return [Results[0]];
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
