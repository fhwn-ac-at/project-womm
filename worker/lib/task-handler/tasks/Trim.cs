namespace lib.item_handler.work_items
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class Trim : ITask
    {
        public Trim(string id)
        {
            ArgumentException.ThrowIfNullOrEmpty(id, nameof(id));
            ID = id;
        }

        public string ID { get; private set; }

        public T Accept<T>(ITaskVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
