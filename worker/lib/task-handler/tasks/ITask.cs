namespace lib.item_handler
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface ITask
    {
        public T Accept<T>(ITaskVisitor<T> visitor);

        public string ID { get; }
    }
}
