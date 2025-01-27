using Amazon;
using Amazon.Runtime;
using Amazon.Runtime.Endpoints;
using Amazon.S3;
using Amazon.S3.Transfer;
using lib.exceptions;
using lib.options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace lib.storage
{
    public class AmazonS3Storage : IStorageSystem
    {
        private readonly ILogger<AmazonS3Storage> _logger;
        private readonly IAmazonS3 _client;
        private readonly StorageOptions _options;

        private bool _disposed;

        public AmazonS3Storage(IOptions<StorageOptions> options, ILogger<AmazonS3Storage> logger)
        {
            ArgumentNullException.ThrowIfNull(options.Value, nameof(options));
            _logger = logger;
            _options = options.Value;

            var config = new AmazonS3Config
            {
                ServiceURL = _options.Endpoint,
                ForcePathStyle = true
            };
            
            _client = new AmazonS3Client(_options.AccessKey, _options.SecreteKey, config);
        }

        public void Download(string localPath, string keyName)
        {
            if (!Path.Exists(localPath))
            {
                throw new ArgumentException($"The given path does not exist: {localPath}");
            }
            _logger.LogInformation($"Downloading file {keyName} into local path {localPath}");

            TransferUtility transferUtility = new TransferUtility(_client);
            
            var obj = _client.GetObjectAsync(_options.BucketName, keyName).Result;
            
            TransferUtilityDownloadRequest request = new()
            {
                BucketName = _options.BucketName,
                Key = keyName,
                FilePath = Path.Join(localPath, obj.Key),
            };

            try
            {
                transferUtility.Download(request);
            }
            catch (AmazonS3Exception e)
            {
                _logger.LogError($"Error downloading file {keyName}: {e.Message}");
                throw new InvalidOperationException(e.Message);
            }
        }

        public void Upload(string localPath, string keyName)
        {
            if (!Path.Exists(localPath))
            {
                throw new ArgumentException($"The given path does not exist: {localPath}");
            }
            _logger.LogInformation($"Uploading file {keyName} from local path {localPath}");

            TransferUtility transferUtility = new TransferUtility(_client);
            try
            {
                if (File.Exists(localPath))
                {
                    TransferUtilityUploadRequest fileRequest = new()
                    {
                        BucketName = _options.BucketName,
                        Key = keyName,
                        FilePath = localPath
                    };

                    transferUtility.Upload(fileRequest);
                }
                else if (Directory.Exists(localPath))
                {
                    TransferUtilityUploadDirectoryRequest request = new()
                    {
                        BucketName = _options.BucketName,
                        Directory = localPath
                    };
                    
                    transferUtility.UploadDirectory(request);
                }
                else
                {
                    _logger.LogError($"File {keyName} does not exist in local path {localPath}");
                    throw new ArgumentException($"The given path is neither a file nor a directory: {localPath}");
                }
            }
            catch (AmazonS3Exception e)
            {
                _logger.LogError($"Error uploading {keyName}: {e.Message}");
                throw new InvalidOperationException($"Failed to upload to S3: {e.Message}", e);
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
    }
}