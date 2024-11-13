namespace lib.item_handler.work_items
{
    using lib.exceptions;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class Split : IWorkItem
    {
        public Split(string keyName, string segmentTime)
        {
            ArgumentException.ThrowIfNullOrEmpty(keyName);
            InvalidTimeSegmentException.ThrowIfNullOrInvalid(segmentTime);
            
            this.SegmentTime = segmentTime;
            this.KeyName = keyName;
        }

        public string SegmentTime { get; private set; }

        public string KeyName { get; private set; }

        public T Accept<T>(IWorkItemVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
