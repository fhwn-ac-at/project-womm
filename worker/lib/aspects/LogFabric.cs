namespace lib.aspects
{
    using Metalama.Framework.Fabrics;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class LogFabric : ProjectFabric
    {
        public override void AmendProject(IProjectAmender amender)
        {
            AddLogging(amender);
        }

        private static void AddLogging(IProjectAmender amender)
        {
            amender
                .SelectMany(p => p.Types)
                .SelectMany(t => t.Methods)
                .AddAspectIfEligible<LogAttribute>();
        }
    }
}
