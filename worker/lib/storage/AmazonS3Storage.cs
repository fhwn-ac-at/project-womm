using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Transfer;
using lib.exceptions;
using lib.options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace lib.storage
{
    //TODO: Test with minIO
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

            AmazonS3Config config = new();
            config.RegionEndpoint = RegionEndpoint.EUCentral1;

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
            _logger.LogInformation($"Downloading file {keyName} into local path {localPath}");

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
            _logger.LogInformation($"Uploading file {keyName} into local path {localPath}");

            TransferUtility transferUtility = new TransferUtility(_client);
            try
            {
                if (File.Exists(localPath))
                {
                    string fileKey = keyName + Path.GetFileName(localPath);
                    TransferUtilityUploadRequest fileRequest = new()
                    {
                        BucketName = _options.BucketName,
                        Key = fileKey,
                        FilePath = localPath
                    };

                    transferUtility.Upload(fileRequest);
                }
                else if (Directory.Exists(localPath))
                {
                    var files = Directory.GetFiles(localPath, "*", SearchOption.AllDirectories);
                    if (files.Length == 0)
                    {
                        _logger.LogInformation($"Cannot upload from {localPath} since the directory is empty");
                        throw new StorageException("No files were found in " + localPath);
                    }

                    foreach (var file in files)
                    {
                        string fileKey = keyName + file;

                        TransferUtilityUploadRequest dirFileRequest = new()
                        {
                            BucketName = _options.BucketName,
                            Key = fileKey,
                            FilePath = file
                        };

                        transferUtility.Upload(dirFileRequest);
                    }
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