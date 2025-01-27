namespace lib.exceptions;

public class InvalidTaskException : Exception
{
    private readonly string _taskData;

    public InvalidTaskException(string taskData, string message) : base(message)
    {
        _taskData = taskData;
    }
    
    public InvalidTaskException(string taskData)
    {
        _taskData = taskData;
    }
}