using System.IO.Abstractions;
using lib.storage;
using lib.tasks.data;
using lib.tasks.exec;

namespace lib.tasks.types;

//TODO: Implement upload to Results keys
public abstract class EditingTask(TaskData taskData, IFileSystem fs, 
    IStorageSystem storageSystem, string workingDirectory)
{
    public IFileSystem Fs { get; } = fs;
    
    public IStorageSystem Storage { get; } = storageSystem;
    
    public string WorkingDirectory { get; } = workingDirectory;

    public string Id => taskData.taskId;

    public string[] Results => taskData.results;
    
    public abstract void Process();
}