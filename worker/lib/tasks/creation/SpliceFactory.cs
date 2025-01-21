using System.IO.Abstractions;
using lib.failure;
using lib.storage;
using lib.tasks.types;

namespace lib.tasks.creation;

public class SpliceFactory(IStorageSystem storage, IFileSystem fs) : ITaskFactory
{
    public IEither<string, ITask> CreateTask(string taskData)
    {
        throw new NotImplementedException();
    }
}