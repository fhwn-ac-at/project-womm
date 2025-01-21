namespace lib.messaging
{
    using lib.options;
    using Microsoft.Extensions.Options;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Text.Json;
    using System.Threading.Tasks;

    public class MessageService : IMessageService
    {
        private MessagingOptions _options;

        public MessageService(IOptions<MessagingOptions>options)
        {
            _options = options.Value;
        }

        public string GetHeartbeat(string workerName, string taskQueueName)
        {
            var message = new
            {
                pattern = _options.Heartbeat,
                data = new
                {
                    name = workerName, 
                    listensOn = taskQueueName
                }
            };

            return JsonSerializer.Serialize(message);
        }

        public string GetProcessingStarted(string taskId, string workerName)
        {
            var message = new
            {
                pattern = _options.ProcessingStarted,
                data = new
                {
                    taskId = taskId,
                    worker = workerName
                }
            };

            return JsonSerializer.Serialize(message);
        }

        public string GetProcessingCompleted(string taskId, string workerName)
        {
            var message = new
            {
                pattern = _options.ProcessingCompleted,
                data = new
                {
                    taskId = taskId,
                    worker = workerName
                }
            };

            return JsonSerializer.Serialize(message);
        }

        public string GetProcessingFailed(string taskId, string workerName, string error)
        {
            var message = new
            {
                pattern = _options.ProcessingFailed,
                data = new
                {
                    taskId = taskId,
                    worker = workerName,
                    error = error
                }
            };

            return JsonSerializer.Serialize(message);
        }

        public string GetArtifactUploaded(string taskId, string artifactId)
        {
            var message = new
            {
                pattern = _options.ArtifactUploaded,
                data = new
                {
                    taskId = taskId,
                    artifactId = artifactId
                }
            };

            return JsonSerializer.Serialize(message);
        }
    }
}
