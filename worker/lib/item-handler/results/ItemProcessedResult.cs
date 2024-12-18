﻿namespace lib.item_handler.results
{
    using lib.item_handler;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class ItemProcessedResult
    {
        public ItemProcessedResult(IEnumerable<string> files)
        {
            ArgumentNullException.ThrowIfNull(files);

            this.Files = files;
        }

        public IEnumerable<string> Files { get; }
    }
}
