namespace lib.item_handler.work_items
{
    using Amazon.Runtime.SharedInterfaces;
    using lib.exceptions;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class Split : ITask
    {
        private string _id;

        public Split(string keyName, string segmentTime)
        {
            ArgumentException.ThrowIfNullOrEmpty(keyName);
            InvalidTimeSegmentException.ThrowIfNullOrInvalid(segmentTime);
            
            this.SegmentTime = segmentTime;
            this.KeyName = keyName;
        }

        public string SegmentTime { get; private set; }

        public string KeyName { get; private set; }

        public string ID
        {
            get
            {
                return _id;
            }

            private set
            {
                ArgumentException.ThrowIfNullOrEmpty(value, nameof(ID));
                _id = value;
            }
        }

        public T Accept<T>(ITaskVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
