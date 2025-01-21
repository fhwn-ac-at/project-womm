using lib.failure;
using lib.tasks.types;

namespace lib.tasks.creation;

public interface ITaskFactory
{
    IEither<string, ITask> CreateTask(string taskData);
}