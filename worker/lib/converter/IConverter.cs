namespace lib.parser
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IConverter<Input, Output>
    {
        Output Parse(Input input);
    }
}
