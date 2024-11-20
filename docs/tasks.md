# Tasks
Tasks are the core concepts of the application, that are used 
to store relevant data and distribute work between workers.

All tasks have to implement the `ITask` interface to be executed by the system.
For adding a new task, the `ITaskHandler` and corresponding implementations
have to be extended by one method for each task.

## General Structure
- `id` : Unique identifier for the task.
- `task` : Task to be executed. e.g. convert
- `param` : Parameters for the task.
```json
{
  "id": "123",
  "task": "task",
  "param": {
    // parameters for the task
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
- `fileKey` : Unique key to identify the source file.
- `goalFormat` : Format to convert the video into.

```json
{
  "id": "123",
  "task": "convert",
  "param": {
    "fileKey": "some-video.mp4",
    "goalFormat" : ".avi"
  }
}
```



## Split
Splits the video into equaly sized segments.

Param: 
- `fileKey` : Unique key to identify the source file.
- `segmentTime` : Size of the segments.

```json
{
  "id": "123",
  "task": "split",
  "param": {
    "fileKey": "some-video.mp4",
    "segmentTime" : "00:00:05"
  }
}
```

video aufteilen an 1s 3s 4s 

c# native ffmpeg 
cli
ffmpeg -ss 3.3 -t 6 -c copy -i file 

## Splice
videos zusammenführen
<!---
ffmpeg -i "concat:input1.mp4|input2.mp4|input3.mp4|input4.mp4" -c copy output10.mp4
--->

## overlap
videos übereinander
