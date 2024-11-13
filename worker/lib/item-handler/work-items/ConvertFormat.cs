namespace lib.item_handler.work_items
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class ConvertFormat : IWorkItem
    {
        public ConvertFormat(string keyName, string goalFormat)
        {
            ArgumentException.ThrowIfNullOrEmpty(keyName, nameof(keyName));
            ArgumentException.ThrowIfNullOrWhiteSpace(goalFormat, nameof(goalFormat));
            
            this.KeyName = keyName;
            this.GoalFormat = goalFormat;
        }

        public string KeyName { get; private set; }

        public string GoalFormat { get; private set; }

        public T Accept<T>(IWorkItemVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
