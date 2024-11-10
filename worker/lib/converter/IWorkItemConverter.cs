namespace lib.parser
{
    using lib.item_hanlder;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IWorkItemConverter
    {
        IWorkItem Convert(string item);

        string Convert(IWorkItemResult result);
    }
}
