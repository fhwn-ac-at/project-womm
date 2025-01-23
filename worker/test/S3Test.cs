using Amazon;
using Amazon.S3;
using Amazon.S3.Transfer;
using lib.options;
using lib.storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace test;

public class S3Test
{
    [Test]
    public async Task Test()
    {
        string bucketName = "womm";
        string accessKey = "womm-testing";
        string secret = "BgjNcIxRVUKDHiDDEPBJWFf9Yt85rK4R6CHXMoDe";
        string endpoint = "http://localhost:9000";
        
        var config = new AmazonS3Config
        {
            ServiceURL = endpoint,
            ForcePathStyle = true
        };
        
            
        var client = new AmazonS3Client(accessKey, secret, config);

        TransferUtility transferUtility = new TransferUtility(client);
        TransferUtilityUploadDirectoryRequest request = new()
        {
            BucketName = bucketName,
            Directory = ""
        };
        

    }
}