using Amazon.S3.Model;
using lib.item_handler.results;

namespace lib.tasks.types
{
    public interface ITask
    {
        public string Id { get; }
        
        public string[] Results { get; }
        
        public TaskProcessedResult Process();
    }
}