namespace lib.converter
{
    using lib.item_handler;
    using lib.item_handler.results;
    using lib.parser;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class JSONWorkItemConverter : IWorkItemConverter
    {
        public IWorkItem Convert(string input)
        {
            throw new NotImplementedException();
        }

        public string Convert(ItemProcessedResult input)
        {
            throw new NotImplementedException();
        }
    }
}
