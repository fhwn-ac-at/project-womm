namespace lib.storage
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class LocalStorageSystem(string rootFolder) : IStorageSystem
    {
        public void Dispose()
        {
        }

        public void Download(string localPath, string keyName)
        {
            string item = Path.Combine(rootFolder, keyName);

            string newItem = Path.Combine(localPath, keyName);
            File.Copy(item, newItem);
        }

        public void Upload(string localPath, string keyName)
        {
            string newPath = Path.Combine(rootFolder, keyName);

            File.Create(newPath).Dispose();
            File.Copy(localPath, newPath, true);
        }
    }
}
