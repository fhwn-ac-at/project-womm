
export type ExecutiableFunction<T> = (() => T) | (() => Promise<T>)

export interface ExecutionStrategy {
  execute<T>(func: ExecutiableFunction<T>): Promise<T>;
}
