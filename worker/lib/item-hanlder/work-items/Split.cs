﻿namespace lib.item_hanlder.work_items
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class Split : IWorkItem
    {
        public string InputPath { get; set; }

        public int Pieces { get; set; }

        public T Accept<T>(IWorkItemVisitor<T> visitor)
        {
            return visitor.Visit(this);
        }
    }
}
