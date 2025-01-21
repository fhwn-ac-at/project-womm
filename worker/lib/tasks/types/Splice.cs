using System.IO.Abstractions;
using System.Text;
using lib.commands;
using lib.exceptions;
using lib.item_handler.results;
using lib.storage;

namespace lib.tasks.types;

public class Splice : ITask
{
    private readonly IFileSystem _fs;
        
    private readonly IStorageSystem _storage;

    private readonly string _rootPath;

    public Splice(IFileSystem fs, IStorageSystem storage, string rootPath, 
        string id, string[] fileKeys, string[] results)
    {
        ArgumentNullException.ThrowIfNull(fs);
        ArgumentNullException.ThrowIfNull(storage);
        ArgumentNullException.ThrowIfNull(results);
        ArgumentNullException.ThrowIfNull(fileKeys);
        ArgumentException.ThrowIfNullOrEmpty(rootPath);
        ArgumentException.ThrowIfNullOrEmpty(id);
            
        _fs = fs;
        _storage = storage;
        _rootPath = rootPath;
        Id = id;
        FileKeys = fileKeys;
        Results = results;
    }
    
    public string Id { get;}
    
    public string[] Results { get; }

    public string[] FileKeys { get; } 
    
    public TaskProcessedResult Process()
    {
        if (FileKeys.Length == 0)
        {
            throw new TaskProcessingFailedException("No files were provided", this);
        }

        var tempFolder = _storage.DownloadIntoTempFolder(_rootPath, FileKeys);
        var concat = GenerateSourceConcatenation(tempFolder);

        var resultId = Guid.NewGuid().ToString()[..8] + ".mp4";
        var resultFile = _fs.Path.Combine(tempFolder, resultId);
            
        var command = new FFmpegCommand(concat, resultFile);
        command.AddArgument("-c", "copy");
        command.Execute();
            
        _storage.Upload(resultFile, resultId);

        return new TaskProcessedResult(Id, []);
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