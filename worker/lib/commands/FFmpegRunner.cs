namespace lib.commands
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class FFmpegRunner
    {
        public static void RunFFmpeg(string arguments)
        {
            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true   
            };

            using (Process process = new Process())
            {
                process.StartInfo = startInfo;
                //process.OutputDataReceived += (sender, data) =>
                //{
                //    if (data.Data != null)
                //        Console.WriteLine(data.Data);
                //};
                //process.ErrorDataReceived += (sender, data) =>
                //{
                //    if (data.Data != null)
                //    {
                //        throw new InvalidOperationException(data.Data);
                //    }
                //};

                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                process.WaitForExit();
            }
        }
    }
}
