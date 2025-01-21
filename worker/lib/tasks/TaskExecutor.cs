using System.IO.Abstractions;
using lib.exceptions;
using lib.failure;
using lib.item_handler.results;
using lib.storage;
using lib.tasks.creation;
using lib.tasks.types;

namespace lib.tasks;

public class TaskExecutor : ITaskExecutor
{
    private readonly Dictionary<string, ITaskFactory> _taskFactories;

    public TaskExecutor(Dictionary<string, ITaskFactory> taskFactories)
    {
        _taskFactories = taskFactories;
    }
    
    public IEither<string, TaskProcessedResult> ExecuteTask(string rawTask)
    {
        ITaskFactory factory = _taskFactories[rawTask];
        var result = factory.CreateTask(rawTask);

        // yield error if any
        if (!result.IsRight)
            return new Left<string, TaskProcessedResult>(result.GetLeftOrThrow());

        ITask task = result.GetRightOrThrow();

        try
        {
            return new Right<string, TaskProcessedResult>(task.Process());
        }
        catch (TaskProcessingFailedException e)
        {
            return new Left<string, TaskProcessedResult>(e.Message);
        }
    }
}