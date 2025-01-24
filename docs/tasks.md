# Tasks Structure
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
    "keyName": "task-1/merged-video.mp4"
    "goalFormat": ".avi",
  }
}
```

## Split
Splits the video into equaly sized segments.

Param: 
- `keyName` : Unique key to identify the source file.
- `segmentTime` : Size of the segments.

```json+
{
  "taskId": "32",
  "results": ["task-1/video-part-1.mp4", "task-1/video-part-2.mp4", "task-1/video-part-3.mp4"],
  "name": "Split",
  "parameters": {
      "keyName": "task-1/file_example.mp4"
      "segmentTime": "00:00:10",
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

<!---
ffmpeg -i "concat:input1.mp4|input2.mp4|input3.mp4|input4.mp4" -c copy output10.mp4
--->
