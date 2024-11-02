namespace lib.item_hanlder
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IWorkItem
    {
        public T Accept<T>(IWorkItemVisitor<T> visitor);
    }
}
