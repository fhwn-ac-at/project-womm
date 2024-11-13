namespace lib.storage
{
    using Amazon.Runtime;
    using Amazon.S3;
    using Amazon.S3.Model;
    using Amazon.S3.Transfer;
    using lib.aspects.logging;
    using lib.options;
    using Microsoft.Extensions.Options;
    using System;
    using System.Collections.Generic;
    using System.Globalization;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    [LoggingClass]
    public class AmazonS3Storage : IStorageSystem
    {
        private readonly StorageOptions _options;

        private readonly IAmazonS3 _client;

        private bool _disposed;

        public AmazonS3Storage(IOptions<StorageOptions> options)
        {
            ArgumentNullException.ThrowIfNull(options.Value, nameof(options));
            _options = options.Value;

            AmazonS3Config config = new();
            config.RegionEndpoint = Amazon.RegionEndpoint.EUCentral1;

            AWSCredentials credentials = new BasicAWSCredentials(
                accessKey: _options.AccessKey,
                secretKey: _options.SecreteKey);

            _client = new AmazonS3Client(credentials, config);
        }

        public void Download(string localPath, string keyName)
        {
            if (!Path.Exists(localPath))
            {
                throw new ArgumentException($"The given path does not exist: {localPath}");
            }

            TransferUtility transferUtility = new TransferUtility(_client);
            TransferUtilityUploadRequest request = new()
            {
                BucketName = _options.BucketName,
                Key = keyName,
                FilePath = localPath
            };

            try
            {
                transferUtility.Upload(request);
            }
            catch (AmazonS3Exception e)
            {
                throw new InvalidOperationException(e.Message);
            }
        }

        public void Upload(string localPath, string keyName)
        {
            if (!Path.Exists(localPath))
            {
                throw new ArgumentException($"The given path does not exist: {localPath}");
            }

            TransferUtility transferUtility = new TransferUtility(_client);
            TransferUtilityDownloadRequest request = new()
            {
                BucketName = _options.BucketName,
                Key = keyName,
                FilePath = localPath
            };

            try
            {
                transferUtility.Download(request);
            }
            catch (AmazonS3Exception e)
            {
                throw new InvalidOperationException(e.Message);
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        { 
            if (_disposed)
            {
                return;
            }

            if (disposing)
            {
                _client.Dispose();
                
            }

            _disposed = true;
        }

        public void UploadMany(string localFolder, bool recursive)
        {
            throw new NotImplementedException();
        }
    }
}
