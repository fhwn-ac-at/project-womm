namespace lib.item_hanlder
{
    using lib.item_hanlder.work_items;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IWorkItemVisitor
    {
        public void Visit(Split item);
    }
}
