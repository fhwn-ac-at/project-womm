using System.IO.Abstractions;
using System.Text;
using lib.commands;
using lib.exceptions;
using lib.storage;
using lib.tasks.data;
using lib.tasks.exec;

namespace lib.tasks.types;

public class Splice : ScheduledTask
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
        if (Results.Length != 1)
        {
            throw new Exception($"Expected 1 file in Results array, but got {Results.Length}");
        }
        
        HashSet<string> files = new HashSet<string>(); 
        foreach (var fileKey in FileKeys)
        {
            Storage.Download(WorkingDirectory, fileKey);
            files.Add(Path.Join(WorkingDirectory, fileKey));
        }

        string destination = Path.Join(WorkingDirectory, Results[0]);

        string fileList = GenerateListFile(files);
        
        var command = new FFmpegCommand(string.Empty,$"\"{destination}\"");
        command.AddArgument("-f", "concat");
        command.AddArgument("-safe", "0");
        command.AddArgument("-i", fileList);
        command.AddArgument("-c", "copy");

        try
        {
            command.Execute();
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
    
    private string GenerateListFile(IEnumerable<string> files)
    {
        string filePath = Path.Join(WorkingDirectory, "listing.txt");
        File.WriteAllLines(filePath, files.Select(file => "file \'" + file + "\'"));
        return filePath;
    }
}