namespace lib.storage
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using lib.aspects;

    public class LocalStorageSystem : IStorageSystem
    {
        private readonly string _rootFolder;

        public LocalStorageSystem(string rootFolder)
        {
            _rootFolder = rootFolder;
        }
        public void Dispose()
        {
        }

        public void Download(string localPath, string keyName)
        {
            string item = Path.Combine(_rootFolder, keyName);

            string newItem = Path.Combine(localPath, keyName);
            File.Copy(item, newItem);
        }

        public void Upload(string localPath, string keyName)
        {
            string newPath = Path.Combine(_rootFolder, keyName);

            File.Create(newPath).Dispose();
            File.Copy(localPath, newPath, true);
        }
    }
}
