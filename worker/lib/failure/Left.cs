namespace lib.failure;

/// <summary>
/// Represents the error state of an <see cref="IEither{TLeft, TRight}"/> instance.
/// </summary>
/// <typeparam name="TLeft">The type of data to be stored when failing.</typeparam>
/// <typeparam name="TRight">The type of data to be stored when successful.</typeparam>
public class Left<TLeft, TRight> : IEither<TLeft, TRight>
{
    private readonly TLeft value;

    /// <summary>
    /// Initializes a new instance of the <see cref="Left{TLeft, TRight}"/> class.
    /// </summary>
    /// <param name="value">Error data.</param>
    public Left(TLeft value)
    {
        ArgumentNullException.ThrowIfNull(value, nameof(value));

        this.value = value;
    }

    /// <summary>
    /// Gets a value indicating whether the instance contains valid data.
    /// </summary>
    public bool IsRight => false;

    /// <summary>
    /// Gets the left value or throws an exception if the instance is successful.
    /// </summary>
    /// <returns>Data representing an error state.</returns>
    /// <exception cref="InvalidOperationException">Thrown if the instance contains valid data.</exception>
    public TLeft GetLeftOrThrow()
    {
        return this.value;
    }

    /// <summary>
    /// Gets the right value or throws an exception if the instance is a failure.
    /// </summary>
    /// <returns>Valid data.</returns>
    /// <exception cref="InvalidOperationException">Thrown if the instance contains error data.</exception>
    public TRight GetRightOrThrow()
    {
        throw new InvalidOperationException();
    }
}