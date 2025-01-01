# Tasks
Tasks are the core concepts of the application, that are used 
to store relevant data and distribute work between workers.

All tasks have to implement the `ITask` interface to be executed by the system.
For adding a new task, the `ITaskHandler` and corresponding implementations
have to be extended by one method for each task.

## General Structure

```json
{
  "Type": "SomeType",
  "ID": "42",
  "AdditionalData" : "42"
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
  "Type": "ConvertFormat",
  "ID": "42",
  "KeyName": "some-video.mp4",
  "GoalFormat": ".avi",
}
```



## Split
Splits the video into equaly sized segments.

Param: 
- `KeyName` : Unique key to identify the source file.
- `SegmentTime` : Size of the segments.

```json
  {
    "Type": "Split",
    "ID": "42",
    "KeyName": "some-video.mp4",
    "SegmentTime": "00:00:05",
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
    "Type": "Splice",
    "ID": "42",
    "FileKeys": ["input1.mp4", "input2.mp4", "input3.mp4"],
  }
```

<!---
ffmpeg -i "concat:input1.mp4|input2.mp4|input3.mp4|input4.mp4" -c copy output10.mp4
--->

## overlap
videos übereinander
