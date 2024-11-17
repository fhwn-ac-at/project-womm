namespace test.mock
{
    using lib.exceptions;
    using lib.storage;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class FaultyStorageSystem : IStorageSystem
    {
        private int _count;
        private readonly IStorageSystem _actualStorageSystem;
        private int _throwOnNthCall;

        public FaultyStorageSystem(IStorageSystem actualStorageSystem, int throwOnNthCall)
        {
            ArgumentNullException.ThrowIfNull(actualStorageSystem);

            _actualStorageSystem = actualStorageSystem;
            _throwOnNthCall = throwOnNthCall;
        }

        public void Dispose()
        {
        }

        public void Download(string localPath, string keyName)
        {
            if (_count >= _throwOnNthCall)
            {
                throw new StorageException(string.Empty, new Exception());
            }

            _count++;
            _actualStorageSystem.Download(localPath, keyName);
        }

        public void Upload(string localPath, string keyName)
        {
            if (_count >= _throwOnNthCall)
            {
                throw new StorageException(string.Empty, new Exception());
            }

            _count++;
            _actualStorageSystem.Upload(localPath, keyName);
        }
    }
}
