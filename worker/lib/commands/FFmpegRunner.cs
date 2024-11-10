namespace lib.commands
{
    using System;
    using System.Diagnostics;
    using System.IO;
    using System.Text;

    internal class FFmpegRunner
    {
        public static void RunFFmpeg(string arguments)
        {
            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",  // Ensure ffmpeg is in the system PATH or provide full path to ffmpeg executable
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            try
            {
                using (Process process = new Process())
                {
                    process.StartInfo = startInfo;
                    //process.OutputDataReceived += (sender, data) =>
                    //{
                    //    if (data.Data != null)
                    //    {
                    //        Debug.WriteLine(data.Data);  // You can log it or process the standard output
                    //    }
                    //};
                    //process.ErrorDataReceived += (sender, data) =>
                    //{
                    //    if (data.Data != null)
                    //    {
                    //        Debug.WriteLine(data.Data);
                    //    }
                    //};

                    process.Start();
                    process.BeginOutputReadLine();
                    process.BeginErrorReadLine();
                    process.WaitForExit();

                    if (process.ExitCode != 0)
                    {
                        throw new InvalidOperationException($"FFmpeg execution failed with exit code {process.ExitCode}. Check error output for details.");
                    }
                }
            }
            catch (FileNotFoundException ex)
            {
                throw new InvalidOperationException("FFmpeg not found.", ex);
            }
            catch (UnauthorizedAccessException ex)
            {
                throw new InvalidOperationException("Permission denied while executing FFmpeg.", ex);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("An error occurred while running FFmpeg.", ex);
            }
        }
    }
}
