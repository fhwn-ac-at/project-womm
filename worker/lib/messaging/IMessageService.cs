namespace lib.messaging
{
    public interface IMessageService
    {
        /// <summary>
        /// Generates a heartbeat message for a worker.
        /// </summary>
        /// <param name="workerName">Name of the worker sending the heartbeat.</param>
        /// <param name="taskQueueName">Name of the task queue the worker listens to.</param>
        /// <returns>Serialized JSON heartbeat message.</returns>
        string GetHeartbeat(string workerName, string taskQueueName);

        /// <summary>
        /// Generates a message indicating that processing has started for a task.
        /// </summary>
        /// <param name="taskId">ID of the task being processed.</param>
        /// <param name="workerName">Name of the worker processing the task.</param>
        /// <returns>Serialized JSON processing started message.</returns>
        string GetProcessingStarted(string taskId, string workerName);

        /// <summary>
        /// Generates a message indicating that processing has completed for a task.
        /// </summary>
        /// <param name="taskId">ID of the task that has been processed.</param>
        /// <param name="workerName">Name of the worker that completed the task.</param>
        /// <returns>Serialized JSON processing completed message.</returns>
        string GetProcessingCompleted(string taskId, string workerName);

        /// <summary>
        /// Generates a message indicating that processing has failed for a task.
        /// </summary>
        /// <param name="taskId">ID of the task that failed.</param>
        /// <param name="workerName">Name of the worker that attempted the task.</param>
        /// <returns>Serialized JSON processing failed message.</returns>
        string GetProcessingFailed(string taskId, string workerName, string error);

        /// <summary>
        /// Generates a message indicating that an artifact has been uploaded.
        /// </summary>
        /// <param name="taskId">ID of the task associated with the artifact.</param>
        /// <param name="artifactId">ID of the uploaded artifact.</param>
        /// <returns>Serialized JSON artifact uploaded message.</returns>
        string GetArtifactUploaded(string taskId, string artifactId);
    }
}