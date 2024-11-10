namespace lib.item_hanlder
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class SuccessfulUpload : IWorkItemResult
    {
        private string _fileKey;

        public SuccessfulUpload(string fileKey)
        {
            this._fileKey = fileKey;
        }

        public string FileKey
        {
            get { return _fileKey; }
        }
    }
}
