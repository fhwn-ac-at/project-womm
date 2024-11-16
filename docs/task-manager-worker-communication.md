This document outlines the protocol for how a worker interacts with the task manager in the system. The worker communicates with the task manager primarily through RabbitMQ queues and processes tasks based on messages received.

## RabbitMQ Queues

- **worker_events**: Queue for worker-related events (e.g., heartbeat).
- **task_events**: Queue for task-related events (e.g., task started, completed, failed).
- **artifact_events**: Queue for artifact-related events (e.g., artifact uploaded).

## Message Structure

All messages sent to the queues are JSON objects with the following structure:

```json
{
  "pattern": "event_name",
  "data": {
    // event-specific data
  }
}
```

### Example

```json
{
  "pattern": "worker_heartbeat",
  "data": {
    "name": "worker1",
    "listensOn": "task_queue"
  }
}
```

## Worker Events

### Heartbeat

**Queue**: `worker_events`

**Pattern**: `worker_heartbeat`

**Data**:

- `name`: The name of the worker.
- `listensOn`: The queue the worker listens on.

**Example**:

```json
{
  "pattern": "worker_heartbeat",
  "data": {
    "name": "worker1",
    "listensOn": "task_queue"
  }
}
```

> **Note**: The worker needs to send the heartbeat periodically. If the worker does not send a heartbeat within 30 seconds (by default), it will be marked as stale and will not receive any more tasks.

### Task Processing Started

**Queue**: `task_events`

**Pattern**: `task_processing_started`

**Data**:

- `taskId`: The ID of the task.
-

worker

: The name of the worker.

**Example**:

```json
{
  "pattern": "task_processing_started",
  "data": {
    "taskId": "12345",
    "worker": "worker1"
  }
}
```

### Task Processing Completed

**Queue**: `task_events`

**Pattern**: `task_processing_completed`

**Data**:

- `taskId`: The ID of the task.
-

worker

: The name of the worker.

**Example**:

```json
{
  "pattern": "task_processing_completed",
  "data": {
    "taskId": "12345",
    "worker": "worker1"
  }
}
```

### Task Processing Failed

**Queue**: `task_events`

**Pattern**: `task_processing_failed`

**Data**:

- `taskId`: The ID of the task.
-

worker

: The name of the worker.

**Example**:

```json
{
  "pattern": "task_processing_failed",
  "data": {
    "taskId": "12345",
    "worker": "worker1"
  }
}
```

### Artifact Uploaded

**Queue**: `artifact_events`

**Pattern**: `artifact_uploaded`

**Data**:

- `taskId`: The ID of the task.
- `artifactId`: The ID of the uploaded artifact.

**Example**:

```json
{
  "pattern": "artifact_uploaded",
  "data": {
    "taskId": "12345",
    "artifactId": "artifact123"
  }
}
```

## Task Reception

The worker receives tasks from a specified queue. The task message is expected to be a JSON object that can be parsed into a `ScheduledTaskDto`

### Example

```json
{
  "id": "task123",
  "name": "Example Task",
  "data": {
    // task-specific data
  }
}
```

## Interaction Protocol

1. **Worker Registration**:

   - The worker sends a heartbeat message to the `worker_events` queue.

2. **Task Assignment**:

   - The task manager schedules a task for the worker and emits a task message to the worker's queue.

3. **Task Processing**:

   - The worker receives the task message from the queue.
   - The worker sends a `task_processing_started` message to the `task_events` queue.

4. **Task Completion**:

   - Upon completing the task, the worker sends a `task_processing_completed` message to the `task_events` queue.

5. **Task Failure**:

   - If the task fails, the worker sends a `task_processing_failed` message to the `task_events` queue.

6. **Artifact Upload**:
   - If the task involves uploading an artifact, the worker sends an `artifact_uploaded` message to the `artifact_events` queue.

## Example Code

Here is an example of how a worker might implement this protocol in TypeScript:

```typescript
import * as amqp from "amqplib";

class Worker {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private name: string;
  private listensOn: string;

  constructor(name: string, listensOn: string) {
    this.name = name;
    this.listensOn = listensOn;
  }

  async init() {
    this.connection = await amqp.connect("amqp://localhost");
    this.channel = await this.connection.createChannel();
  }

  async sendHeartbeat() {
    await this.channel.sendToQueue(
      "worker_events",
      Buffer.from(
        JSON.stringify({
          pattern: "worker_heartbeat",
          data: {
            name: this.name,
            listensOn: this.listensOn,
          },
        }),
        "utf-8"
      )
    );
  }

  async sendTaskProcessingStarted(taskId: string) {
    await this.channel.sendToQueue(
      "task_events",
      Buffer.from(
        JSON.stringify({
          pattern: "task_processing_started",
          data: {
            taskId,
            worker: this.name,
          },
        }),
        "utf-8"
      )
    );
  }

  async sendTaskProcessingCompleted(taskId: string) {
    await this.channel.sendToQueue(
      "task_events",
      Buffer.from(
        JSON.stringify({
          pattern: "task_processing_completed",
          data: {
            taskId,
            worker: this.name,
          },
        }),
        "utf-8"
      )
    );
  }

  async sendTaskProcessingFailed(taskId: string) {
    await this.channel.sendToQueue(
      "task_events",
      Buffer.from(
        JSON.stringify({
          pattern: "task_processing_failed",
          data: {
            taskId,
            worker: this.name,
          },
        }),
        "utf-8"
      )
    );
  }

  async sendArtifactUploaded(taskId: string, artifactId: string) {
    await this.channel.sendToQueue(
      "artifact_events",
      Buffer.from(
        JSON.stringify({
          pattern: "artifact_uploaded",
          data: {
            taskId,
            artifactId,
          },
        }),
        "utf-8"
      )
    );
  }

  async receiveTask() {
    const msg = await this.channel.get(this.listensOn, { noAck: false });
    if (msg) {
      const task = JSON.parse(msg.content.toString());
      this.channel.ack(msg);
      return task;
    }
    return null;
  }
}
```

This protocol ensures that the worker and task manager communicate effectively to process tasks and handle events.
