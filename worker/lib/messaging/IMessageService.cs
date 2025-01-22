namespace lib.messaging
{
    public interface IMessageService
    {
        string GetHeartbeatMessage(string workerName, string taskQueueName);
        
        public string GetTaskStatusChangeMessage(string statusPattern, string taskId, string workerName);
        
        public string GetTaskStatusChangeMessage(string statusPattern, string taskId, string workerName, string error);
        
        string GetArtifactUploadedMessage(string taskId, string artifactId);
    }
}