namespace lib.failure;

public interface IEither<TLeft, TRight>
{
    /// <summary>
    /// Gets a value indicating whether the instance contains valid data.
    /// </summary>
    public bool IsRight { get; }

    /// <summary>
    /// Gets the left value or throws an exception if the instance is successful.
    /// </summary>
    /// <returns>Data representing an error state.</returns>
    /// <exception cref="InvalidOperationException">Thrown if the instance contains valid data.</exception>
    public TLeft GetLeftOrThrow();

    /// <summary>
    /// Gets the right value or throws an exception if the instance is a failure.
    /// </summary>
    /// <returns>Valid data.</returns>
    /// <exception cref="InvalidOperationException">Thrown if the instance contains error data.</exception>
    public TRight GetRightOrThrow();
}