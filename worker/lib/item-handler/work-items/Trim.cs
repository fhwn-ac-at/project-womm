namespace lib.item_handler.work_items
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class Trim : IWorkItem
    {
        public T Accept<T>(IWorkItemVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
