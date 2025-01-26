# Overview
The following document describes the syntax to to provide tasks for the worker and also documentaion for simple deployment.

## Tasks Structure
```json
{
  "taskId": "32",
  "results": ["video-part-1.mp4", "video-part-2.mp4"],
  "name": "Split",
  "parameters": {
    "AdditionalData": "42"
  }
}
```

<!---
## Analyse
video analysieren und render path gengerieren.
--->
## Convert
Converts the provided video into other formats.

Param: 
- `keyName` : Unique key to identify the source file.
- `goalFormat` : Format to convert the video into.

```json
{
  "taskId": "34",
  "results": ["task-1/converted-video.avi"],
  "name": "ConvertFormat",
  "parameters": {
    "keyName": "task-1/merged-video.mp4",
    "goalFormat": ".avi"
  }
}
```

## Split
Splits the video into equaly sized segments.

Param: 
- `keyName` : Unique key to identify the source file.
- `segmentTime` : Size of the segments.

```json
{
  "taskId": "32",
  "results": ["task-1/video-part-1.mp4", "task-1/video-part-2.mp4", "task-1/video-part-3.mp4"],
  "name": "Split",
  "parameters": {
      "keyName": "task-1/file_example.mp4",
      "segmentTime": "00:00:12"
  }
}
```
<!---
video aufteilen an 1s 3s 4s 

c# native ffmpeg 
cli
ffmpeg -ss 3.3 -t 6 -c copy -i file 
--->
## Splice
Merges the given videos together.
- `fileKeys` : The videos in the order they shall be merged.
```json
{
  "taskId": "33",
  "results": ["task-1/merged-video.mp4"],
  "name": "Splice",
  "parameters": {
    "fileKeys": ["task-1/video-part-1.mp4", "task-1/video-part-2.mp4", "task-1/video-part-3.mp4"]
  }
}
```

## How to Deploy a Worker 
After implementing changes to the worker, it is neccessary to run docker build to create a docker image.
This command uses the default configuration from the file worker\app\appsettings.json 
```bash
cd project-womm/worker
docker build -t womm-worker .
```

To load the configuration into the docker contianer after building the image the following command can be used.
Make sure the appsettings.json file is in the directory you execute the command in.
```bash
docker run -v .\appsettings.json:/app/appsettings.json womm-worker
```

For testing the worker a docker-compose file is provided, which uses minio and rabbitmq containers, to use it run the following command.
The compose creates a single worker instance using the configuration in the \deploy\appsettings.json file.
```bash
cd project-womm\deploy
docker compose up
```

Notice that, rabbitmq queues neccessary for the worker, are also being created on deployment. If you change the names of TaskQueueName, ArtifactQueueName or WorkerQueueName, make sure to change them in /deplyoment/rabbit/rabbitmq-defs.json as well.
