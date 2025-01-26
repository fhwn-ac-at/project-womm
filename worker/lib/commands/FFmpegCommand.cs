namespace lib.commands
{
    using lib.exceptions;
    using Metalama.Framework.Code;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class FFmpegCommand
    {
        private readonly string _destination;

        private StringBuilder _stringBuilder;

        public FFmpegCommand(string source, string destination)
        {
            ArgumentException.ThrowIfNullOrEmpty(destination, nameof(destination));

            _destination = destination;

            _stringBuilder = new StringBuilder();

            if (!string.IsNullOrEmpty(source))
            {
                _stringBuilder.Append("-i");
                _stringBuilder.Append(' ');
                _stringBuilder.Append(source);
                _stringBuilder.Append(' ');
            }
        }

        public void AddArgument(string name, string value)
        {
            ArgumentException.ThrowIfNullOrEmpty(name, nameof(name));

            _stringBuilder.Append(name);
            _stringBuilder.Append(' ');
            _stringBuilder.Append(value);
            _stringBuilder.Append(' ');
        }

        public void AddArgument(string name)
        {
            ArgumentException.ThrowIfNullOrEmpty(name, nameof(name));
            _stringBuilder.Append(name);
            _stringBuilder.Append(' ');
        }

        public void Execute()
        {
            _stringBuilder.Append(_destination);
            string command = string.Empty;
            try
            {
                command = _stringBuilder.ToString();
                FFmpegRunner.RunFFmpeg(command);
            }
            catch (Exception e)
            {
                throw new CommandExecutionException(e.Message +": "+ command, e.InnerException);
            }
        }
    }
}
