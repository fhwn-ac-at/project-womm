namespace lib.aspects.logging
{
    using Metalama.Extensions.DependencyInjection;
    using Metalama.Framework.Aspects;
    using Metalama.Framework.Code;
    using Metalama.Framework.Code.SyntaxBuilders;
    using Metalama.Framework.Eligibility;
    using Microsoft.Extensions.Logging;
    public class LogAttribute : OverrideMethodAspect
    {
        [IntroduceDependency] 
        private readonly ILogger _logger;

        public override void BuildEligibility(IEligibilityBuilder<IMethod> builder)
        {
            base.BuildEligibility(builder);

            builder
                .DeclaringType()
                .MustSatisfy(
                t => t.Attributes.FirstOrDefault(a => a.Type.Name == nameof(LoggingClassAttribute)) != null,
                t => $"{t} must have the {nameof(LoggingClassAttribute)}");
        }

        public override dynamic? OverrideMethod()
        {
            var entryMessage = BuildInterpolatedString(false);
            entryMessage.AddText(" started.");
            string em = entryMessage.ToValue();
            this._logger.LogInformation(em);
            
            try
            {
                var result = meta.Proceed();

                var successMessage = BuildInterpolatedString(true);

                if (meta.Target.Method.ReturnType.Is(typeof(void)))
                {
                    successMessage.AddText(" succeeded.");
                }
                else
                {
                    successMessage.AddText(" returned ");
                    successMessage.AddExpression(result);
                    successMessage.AddText(".");
                }

                string sm = successMessage.ToValue();
                this._logger.LogInformation(sm);

                return result;
            }
            catch (Exception e) 
            {
                var failureMessage = BuildInterpolatedString(false);
                failureMessage.AddText(" failed: ");
                failureMessage.AddExpression(e.Message);
                string fm = failureMessage.ToValue();
                this._logger.LogError(fm);

                throw;
            }
        }

        private static InterpolatedStringBuilder BuildInterpolatedString(bool includeOutParameters)
        {
            var stringBuilder = new InterpolatedStringBuilder();

            stringBuilder.AddText(
                meta.Target.Type.ToDisplayString(CodeDisplayFormat.MinimallyQualified));
            stringBuilder.AddText(".");
            stringBuilder.AddText(meta.Target.Method.Name);
            stringBuilder.AddText("(");
            var i = 0;

            foreach (var p in meta.Target.Parameters)
            {
                var comma = i > 0 ? ", " : "";

                if (p.RefKind == RefKind.Out && !includeOutParameters)
                {
                    stringBuilder.AddText($"{comma}{p.Name} = <out> ");
                }
                else
                {
                    stringBuilder.AddText($"{comma}{p.Name} = {{");
                    stringBuilder.AddExpression(p);
                    stringBuilder.AddText("}");
                }

                i++;
            }

            stringBuilder.AddText(")");

            return stringBuilder;
        }
    }
}
