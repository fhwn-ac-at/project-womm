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

        public string GetHeartbeatMessage(string workerName, string taskQueueName)
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

        public string GetTaskStatusChangeMessage(string statusPattern, string taskId, string workerName)
        {
            var message = new
            {
                pattern = statusPattern,
                data = new
                {
                    taskId = taskId,
                    worker = workerName
                }
            };

            return JsonSerializer.Serialize(message);
        }
        
        public string GetTaskStatusChangeMessage(string statusPattern, string taskId, string workerName, string error)
        {
            var message = new
            {
                pattern = statusPattern,
                data = new
                {
                    taskId = taskId,
                    worker = workerName,
                    error = error
                }
            };

            return JsonSerializer.Serialize(message);
        }

        public string GetArtifactUploadedMessage(string taskId, string artifactId)
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
