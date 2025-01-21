namespace lib.item_handler.results
{
    using lib.item_handler;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class TaskProcessedResult
    {
        public TaskProcessedResult(string taskId, IEnumerable<string> files)
        {
            ArgumentException.ThrowIfNullOrEmpty(taskId);
            ArgumentNullException.ThrowIfNull(files);

            this.TaskId = taskId;
            this.Files = files;
        }

        public string TaskId { get; }

        public IEnumerable<string> Files { get; }
    }
}
