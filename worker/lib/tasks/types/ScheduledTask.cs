using System.IO.Abstractions;
using lib.storage;
using lib.tasks.data;
using lib.tasks.exec;

namespace lib.tasks.types;

public abstract class ScheduledTask(TaskData taskData, IFileSystem fs, 
    IStorageSystem storageSystem, string workingDirectory)
{
    public IFileSystem Fs { get; } = fs;
    
    public IStorageSystem Storage { get; } = storageSystem;
    
    public string WorkingDirectory { get; } = workingDirectory;

    public string Id => taskData.taskId;

    public string[] Results => taskData.results;
    
    public abstract List<string> Process();

    protected void CleanUp()
    {
        foreach (var dir in Directory.GetDirectories(WorkingDirectory))
        {
            Directory.Delete(dir, true); 
        }
            
        foreach (var file in Directory.GetFiles(WorkingDirectory))
        {
            File.Delete(file);
        }
    }
}