using lib.item_handler.work_items;

namespace lib.converter
{
    using lib.item_handler;
    using lib.item_handler.results;
    using lib.parser;
    using System;
    using System.Text.Json;
    using System.Text.Json.Serialization;

    public class JSONTaskConverter : JsonConverter<ITask>
    {
        public override ITask? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            using var doc = JsonDocument.ParseValue(ref reader);
            var jsonObject = doc.RootElement;
            var type = jsonObject.GetProperty("Type").GetString();

            return type switch
            {
                "Split" => JsonSerializer.Deserialize<Split>(jsonObject.GetRawText(), options),
                "ConvertFormat" => JsonSerializer.Deserialize<ConvertFormat>(jsonObject.GetRawText(), options),
                _ => throw new NotSupportedException($"Unknown task type: {type}")
            };
        }

        public override void Write(Utf8JsonWriter writer, ITask value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize(writer, value, value.GetType(), options);
        }
    }
}
