namespace lib.converter
{
    using lib.item_hanlder;
    using lib.parser;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class JSONWorkItemConverter : 
        IConverter<string, IWorkItem>,
        IConverter<IWorkItemResult, string>
    {
        public IWorkItem Convert(string input)
        {
            throw new NotImplementedException();
        }

        public string Convert(IWorkItemResult input)
        {
            throw new NotImplementedException();
        }
    }
}
