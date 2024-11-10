namespace lib.item_hanlder.work_items
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
            if (string.IsNullOrEmpty(keyName))
            {
                throw new ArgumentException($"'{nameof(keyName)}' cannot be null or empty.", nameof(keyName));
            }

            if (string.IsNullOrEmpty(goalFormat))
            {
                throw new ArgumentException($"'{nameof(goalFormat)}' cannot be null or empty.", nameof(goalFormat));
            }

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
