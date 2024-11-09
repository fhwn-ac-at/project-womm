namespace lib.storage
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IRemoteStorage
    {
        public void Upload(string localPath, string keyName);

        public void Download(string localPath, string keyName);
    }
}
