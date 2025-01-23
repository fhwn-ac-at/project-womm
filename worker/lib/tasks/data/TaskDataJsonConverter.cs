using System.Diagnostics;
using lib.exceptions;
using Newtonsoft.Json;

namespace lib.tasks.data;

using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using lib.tasks.data;

public class TaskDataJsonConverter : JsonConverter<TaskData>
{
    public override TaskData Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        JsonDocument jsonDoc;
        try
        {
            jsonDoc = JsonDocument.ParseValue(ref reader);
        }
        catch (JsonReaderException e)
        {
            Debug.WriteLine($"JSON parsing error: {e.Message}");
            throw;
        }
        catch (JsonException e)
        {
            Debug.WriteLine($"General JSON error: {e.Message}");
            throw;
        }
        
        var root = jsonDoc.RootElement;
        
        var taskData = new TaskData
        {
            taskId = root.GetProperty("taskId").GetString() 
                     ?? throw new InvalidTaskException("Cannot find taskId property"),
            results = JsonSerializer.Deserialize<string[]>(root.GetProperty("results").GetRawText(), options)
                      ?? throw new InvalidTaskException("Cannot find results property"),
            name = root.GetProperty("name").GetString() 
                   ?? throw new InvalidTaskException("Cannot find name property"),
        };
        
        var parametersJson = root.GetProperty("parameters").GetRawText();
        taskData.parameters = taskData?.name switch
        {
            "ConvertFormat" => JsonSerializer.Deserialize<ConvertParameters>(parametersJson, options),
            "Split" => JsonSerializer.Deserialize<SplitParameters>(parametersJson, options),
            "Splice" => JsonSerializer.Deserialize<SpliceParameters>(parametersJson, options),
            _ => throw new InvalidTaskException($"Unsupported task type: {taskData.name}")
        };
        return taskData;
    }

    public override void Write(Utf8JsonWriter writer, TaskData value, JsonSerializerOptions options)
    {
    }
}