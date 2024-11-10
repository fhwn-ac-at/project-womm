namespace lib.storage
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class LocalStorageSystem : IStorageSystem
    {
        private readonly string _folder = "C:\\Users\\micha\\Desktop\\local-storage";

        public void Dispose()
        {
        }

        public void Download(string localPath, string keyName)
        {
            string item = Path.Combine(_folder, keyName);

            string newItem = Path.Combine(localPath, keyName);
            File.Copy(item, newItem);
        }

        public void Upload(string localPath, string keyName)
        {
            string newPath = Path.Combine(_folder, keyName);
            //File.Create(newPath);
            File.Copy(localPath, newPath, true);
        }
    }
}
