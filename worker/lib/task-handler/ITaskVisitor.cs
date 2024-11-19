namespace lib.item_handler
{
    using lib.item_handler.work_items;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface ITaskVisitor<T>
    {
        public T Visit(Split item);

        public T Visit(ConvertFormat convertFormat);
    }
}
