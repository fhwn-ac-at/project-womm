namespace lib.item_hanlder
{
    using lib.item_hanlder.work_items;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class WorkItemHandler : IWorkItemVisitor
    {
        public void Visit(Split item)
        {
            throw new NotImplementedException();
        }
    }
}
