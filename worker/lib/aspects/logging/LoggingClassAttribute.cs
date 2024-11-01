namespace lib.aspects.logging
{
    using Metalama.Framework.Code;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    [System.AttributeUsage(AttributeTargets.Class)]
    internal class LoggingClassAttribute : System.Attribute
    {
        public LoggingClassAttribute()
        {
            
        }
    }
}
