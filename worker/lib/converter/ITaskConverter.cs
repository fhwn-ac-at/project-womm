namespace lib.parser
{
    using lib.item_handler;
    using lib.item_handler.results;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface ITaskConverter
    {
        ITask Convert(string item);

        string Convert(TaskProcessedResult result);
    }
}
