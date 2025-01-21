using lib.failure;
using lib.item_handler.results;

namespace lib.tasks;

public interface ITaskExecutor
{
    public IEither<string, TaskProcessedResult> ExecuteTask(string rawTask);
}