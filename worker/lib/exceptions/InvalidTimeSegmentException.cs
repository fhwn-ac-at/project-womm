namespace lib.exceptions
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    internal class InvalidTimeSegmentException : Exception
    {
        public static void ThrowIfNullOrInvalid(string time)
        {
            if (time == null)
            {
                throw new InvalidTimeSegmentException();
            }

            var parts = time.Split(':');

            if (parts.Length != 3)
            {
                throw new InvalidTimeSegmentException();
            }

            if (!IsIntegerInBounds(parts[0], 24)) 
            {
                throw new InvalidTimeSegmentException();
            }

            if (!IsIntegerInBounds(parts[1], 60))
            {
                throw new InvalidTimeSegmentException();
            }

            if (!IsIntegerInBounds(parts[2], 60))
            {
                throw new InvalidTimeSegmentException();
            }
        }

        private static bool IsIntegerInBounds(string value, int upperBound, int lowerBound = 0)
        {
            int number;

            if (!int.TryParse(value, out number))
            {
                return false;
            }

            if (number < lowerBound || number > upperBound)
            {
                return false;
            }

            return true;
        }
    }
}
