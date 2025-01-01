using lib.item_handler;

namespace lib.tasks;

public class Splice : ITask
{
    public T Accept<T>(ITaskVisitor<T> visitor)
    {
        ArgumentNullException.ThrowIfNull(visitor);
        return visitor.Visit(this);
    }

    public string ID { get; set; }
    
    public string[] FileKeys { get; set; } 
}