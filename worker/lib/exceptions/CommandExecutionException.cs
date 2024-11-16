﻿namespace lib.exceptions
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class CommandExecutionException : Exception
    {
        public CommandExecutionException(string? message,
                                         Exception? innerException) : base(message, innerException)
        {
        }
    }
}