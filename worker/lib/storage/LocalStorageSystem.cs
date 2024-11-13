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

        public void UploadMany(string localFolder, bool recursive)
        {
            IEnumerable<string> items = new List<string>();
            
            if (recursive)
            {
                items = Directory.EnumerateFiles(localFolder, string.Empty, SearchOption.AllDirectories);
            }
            else
            {
                items = Directory.EnumerateFiles(localFolder, string.Empty, SearchOption.TopDirectoryOnly);
            }

            foreach (var item in items)
            {
                var key = Path.GetFileName(item);
                Upload(item, key);
            }
        }
    }
}
