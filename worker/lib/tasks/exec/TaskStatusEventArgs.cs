using lib.tasks.data;

namespace lib.tasks.exec;

public class TaskStatusEventArgs
{
    public TaskStatusEventArgs(string status, string message, string taskId, string artifactId = "")
    {
        Status = status;
        Message = message;
        TaskId = taskId;
        ArtifactId = artifactId;
    }

    public string Status { get; }
    
    public string Message { get; }
    
    public string TaskId { get; }
    public string ArtifactId { get; }
}