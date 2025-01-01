using System.Text.Json;
using lib.exceptions;
using lib.item_handler;
using lib.item_handler.results;
using lib.parser;

namespace lib.converter;

public class TaskConverter : ITaskConverter
{
    private JsonSerializerOptions _options;

    public TaskConverter()
    {
        _options = new JsonSerializerOptions
        {
            Converters = { new JSONTaskConverter() }
        };
    }
        
    public ITask Convert(string item)
    {
        ITask task;

        try
        {
            task = JsonSerializer.Deserialize<ITask>(item, _options) ?? 
                   throw new TaskConversionException("Deserialization returned null value. Ensure the JSON is valid and matches the expected structure.");
        }
        catch (NotSupportedException e)
        {
            throw new TaskConversionException("Converter for JSON type has not been registered.", e);
        }
        catch (JsonException e)
        {
            throw new TaskConversionException("Found invalid JSON. Ensure the JSON is valid and matches the expected structure.", e);
        }
        
        return task;
    }

    public string Convert(TaskProcessedResult result)
    {
        return JsonSerializer.Serialize(result, _options);
    }
}