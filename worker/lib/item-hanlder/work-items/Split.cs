namespace lib.item_hanlder.work_items
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class Split : IWorkItem
    {
        public void Accept(IWorkItemVisitor visitor)
        {
            visitor.Visit(this);
        }
    }
}
