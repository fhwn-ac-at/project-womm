using lib.tasks.data;
using lib.tasks.types;

namespace lib.tasks.exec;

public interface ITaskExecutor
{
    public event EventHandler<TaskStatusEventArgs> OnTaskStatusChanged;
    
    
    public void ExecuteTask(string rawTask);
}