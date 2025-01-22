using System.IO.Abstractions;
using System.Text;
using lib.commands;
using lib.exceptions;
using lib.storage;
using lib.tasks.data;
using lib.tasks.exec;

namespace lib.tasks.types;

public class Splice : EditingTask
{
    private readonly SpliceParameters _parameters;
    
    public Splice(TaskData data, IFileSystem fs, IStorageSystem storage, string workingDirectory)
        : base(data, fs, storage, workingDirectory)
    {
        if (data.parameters is not SpliceParameters parameters)
        {
            throw new InvalidDataException("parameters must be of type SplitParameters");
        }
            
        _parameters = parameters;
    }

    public string[] FileKeys => _parameters.fileKeys;
    
    public override void Process()
    {
        if (FileKeys.Length == 0)
        {
            throw new TaskProcessingFailedException("No files were provided", this);
        }

        var tempFolder = Storage.DownloadIntoTempFolder(WorkingDirectory, FileKeys);
        var concat = GenerateSourceConcatenation(tempFolder);

        var resultId = Guid.NewGuid().ToString()[..8] + ".mp4";
        var resultFile = Fs.Path.Combine(tempFolder, resultId);
            
        var command = new FFmpegCommand(concat, resultFile);
        command.AddArgument("-c", "copy");
        command.Execute();
            
        Storage.Upload(resultFile, resultId);
    }
    
    private static string GenerateSourceConcatenation(string folder)
    {
        var sb = new StringBuilder();
        sb.Append("\"concat:");

        var files = Directory.EnumerateFiles(folder, 
            "*.*", SearchOption.AllDirectories);
            
        foreach (var file in files)
        {
            sb.Append(file);
            sb.Append('|');
        }
        sb.Append('\"');
            
        return sb.ToString();
    }
}