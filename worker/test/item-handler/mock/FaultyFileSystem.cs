namespace test.item_handler
{
    using System;
    using System.Collections.Generic;
    using System.IO.Abstractions;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class FaultyFileSystem : IFileSystem
    {
        private int _count;
        
        private readonly IFileSystem _realFileSystem;

        private int _throwErrorOn;
        private readonly Exception _exceptionToTest;

        public FaultyFileSystem(IFileSystem realFileSystem, int throwErrorOnNthCall, Exception exceptionToTest)
        {
            _realFileSystem = realFileSystem;
            _throwErrorOn = throwErrorOnNthCall;
            _exceptionToTest = exceptionToTest;
        }

        public IFile File 
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.File;
                }

                throw _exceptionToTest;
            }
        }

        public IDirectory Directory
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.Directory;
                }

                throw _exceptionToTest;
            }
        }

        public IFileInfoFactory FileInfo
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.FileInfo;
                }

                throw _exceptionToTest;
            }
        }

        public IFileStreamFactory FileStream
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.FileStream;
                }

                throw _exceptionToTest;
            }
        }

        public IPath Path
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.Path;
                }

                throw _exceptionToTest;
            }
        }

        public IDirectoryInfoFactory DirectoryInfo
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.DirectoryInfo;
                }

                throw _exceptionToTest;
            }
        }

        public IDriveInfoFactory DriveInfo
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.DriveInfo;
                }

                throw _exceptionToTest;
            }
        }

        public IFileSystemWatcherFactory FileSystemWatcher
        {
            get
            {
                if (_count <= _throwErrorOn)
                {
                    _count++;
                    return _realFileSystem.FileSystemWatcher;
                }

                throw _exceptionToTest;
            }
        }
    }
}
