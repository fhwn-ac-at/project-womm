# Tasks
Tasks are the core concepts of the application, that are used 
to store relevant data and distribute work between workers.

All tasks have to implement the `ITask` interface to be executed by the system.
For adding a new task, the `ITaskHandler` and corresponding implementations
have to be extended by one method for each task.

## General Structure
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
- `KeyName` : Unique key to identify the source file.
- `GoalFormat` : Format to convert the video into.

```json
{
  "taskId": "32",
  "results": ["some-converted-video.mp4"],
  "name": "ConvertFormat",
  "parameters": {
    "goalFormat": ".avi",
    "keyName": "some-video.mp4"
  }
}
```

## Split
Splits the video into equaly sized segments.

Param: 
- `KeyName` : Unique key to identify the source file.
- `SegmentTime` : Size of the segments.

```json+
{
  "taskId": "32",
  "results": ["video-part-1.mp4", "video-part-2.mp4"],
  "name": "Split",
  "parameters": {
      "segmentTime": "00:00:05",
      "keyName": "some-video.mp4"
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
```json
{
  "taskId": "32",
  "results": ["merged-video.mp4"],
  "name": "Splice",
  "parameters": {
    "fileKeys": ["input1.mp4", "input2.mp4", "input3.mp4"]
  }
}
```

<!---
ffmpeg -i "concat:input1.mp4|input2.mp4|input3.mp4|input4.mp4" -c copy output10.mp4
--->

## Overlap
videos übereinander
