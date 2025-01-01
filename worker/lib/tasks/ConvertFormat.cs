namespace lib.item_handler.work_items
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class ConvertFormat : ITask
    {
        public ConvertFormat(string keyName, string goalFormat, string id)
        {
            ArgumentException.ThrowIfNullOrEmpty(keyName, nameof(keyName));
            ArgumentException.ThrowIfNullOrEmpty(id, nameof(id));
            ArgumentException.ThrowIfNullOrWhiteSpace(goalFormat, nameof(goalFormat));
            
            KeyName = keyName;
            GoalFormat = goalFormat;
            ID = id;
        }

        public string ID { get; private set; }

        public string KeyName { get; private set; }

        public string GoalFormat { get; private set; }

        public T Accept<T>(ITaskVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
