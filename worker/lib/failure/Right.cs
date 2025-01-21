namespace lib.failure;

/// <summary>
/// Represents the successful state of an <see cref="IEither{TLeft, TRight}"/> instance.
/// </summary>
/// <typeparam name="TLeft">The type of data to be stored when failing.</typeparam>
/// <typeparam name="TRight">The type of data to be stored when successful.</typeparam>
public class Right<TLeft, TRight> : IEither<TLeft, TRight>
{
    private readonly TRight value;

    /// <summary>
    /// Initializes a new instance of the <see cref="Right{TLeft, TRight}"/> class.
    /// </summary>
    /// <param name="value">Valid data.</param>
    public Right(TRight value)
    {
        ArgumentNullException.ThrowIfNull(value, nameof(value));

        this.value = value;
    }

    /// <summary>
    /// Gets a value indicating whether the instance contains valid data.
    /// </summary>
    public bool IsRight => true;

    /// <summary>
    /// Gets the left value or throws an exception if the instance is successful.
    /// </summary>
    /// <returns>Data representing an error state.</returns>
    /// <exception cref="InvalidOperationException">Thrown if the instance contains valid data.</exception>
    public TLeft GetLeftOrThrow()
    {
        throw new InvalidOperationException();
    }

    /// <summary>
    /// Gets the right value or throws an exception if the instance is a failure.
    /// </summary>
    /// <returns>Valid data.</returns>
    /// <exception cref="InvalidOperationException">Thrown if the instance contains error data.</exception>
    public TRight GetRightOrThrow()
    {
        return this.value;
    }
}