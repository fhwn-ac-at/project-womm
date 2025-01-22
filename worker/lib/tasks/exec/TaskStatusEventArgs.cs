using lib.tasks.data;

namespace lib.tasks.exec;

public class TaskStatusEventArgs
{
    public TaskStatusEventArgs(string status, string message, string taskId)
    {
        Status = status;
        Message = message;
        TaskId = taskId;
    }

    public string Status { get; }
    
    public string Message { get; }
    
    public string TaskId { get; }
}