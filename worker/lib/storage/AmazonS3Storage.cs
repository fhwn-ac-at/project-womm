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
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    [LoggingClass]
    public class AmazonS3Storage : IRemoteStorage, IDisposable
    {
        private readonly StorageOptions _options;

        private readonly IAmazonS3 _client;

        // TODO: 
        // -- Implement Disposeable
        // -- proper exception handling on S3 operations
        // -- make download and upload maybe async

        public AmazonS3Storage(IOptions<StorageOptions> options)
        {
            ArgumentNullException.ThrowIfNull(options.Value, nameof(options));
            _options = options.Value;

            AmazonS3Config config = new();
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

            transferUtility.Upload(request);
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

            transferUtility.Download(request);
        }

        public void Dispose()
        {
            throw new NotImplementedException();
        }
    }
}
