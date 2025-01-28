    namespace lib.tasks.data;

    public class TaskData
    {
        public string taskId { get; set; }
        public string[] results { get; set; }
        public string name { get; set; }
        public IParameter parameters { get; set; }
    }

    public interface IParameter
    {
    }

    public class ConvertParameters : IParameter
    {
        public string goalFormat { get; set; }
        public string keyName { get; set; }
    }

    public class SplitParameters : IParameter
    {
        public double to { get; set; }

        public double from { get; set; }

        public string keyName { get; set; }
    }

    public class SpliceParameters : IParameter
    {
        public string[] fileKeys { get; set; }
    }