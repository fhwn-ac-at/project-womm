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
        public Split(string keyName, string segmentTime, string id)
        {
            ArgumentException.ThrowIfNullOrEmpty(keyName);
            ArgumentException.ThrowIfNullOrEmpty(id);
            InvalidTimeSegmentException.ThrowIfNullOrInvalid(segmentTime);
            
            SegmentTime = segmentTime;
            KeyName = keyName;
            ID = id;
        }
        
        public string ID { get; set; }

        public string SegmentTime { get; set; }

        public string KeyName { get; set; }

        public T Accept<T>(ITaskVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
