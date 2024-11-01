namespace lib.converter
{
    using lib.item_hanlder;
    using lib.parser;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class JSONToWorkItemConverter : IConverter<string, IWorkItem>
    {
        public IWorkItem Parse(string input)
        {
            throw new NotImplementedException();
        }
    }
}
