import { Logger } from "@nestjs/common";
import { ExecutiableFunction, ExecutionStrategy } from "./execution-strategy";


export class RandomBackoff implements ExecutionStrategy {

  private readonly logger: Logger = new Logger(RandomBackoff.name);

  constructor(
    private readonly maxRetries: number,
    private readonly baseDelay: number,
    private readonly jitter: number,
  ) { }

  async execute<T>(func: ExecutiableFunction<T>): Promise<T> {
    let retries = 0;
    let lastError;
    while (retries <= this.maxRetries) {
      try {
        return await func();
      } catch (e) {
        const jitter = (Math.random() * this.baseDelay * this.jitter * 2) - this.baseDelay;
        const backoff = Math.pow(2, retries) * jitter;
        const delay = Math.trunc(this.baseDelay + backoff);
        this.logger.verbose(`Function call failed. Calculated jitter ${jitter}, backoff ${backoff}, delay ${delay}. Based on retries ${retries}/${this.maxRetries}, base delay ${this.baseDelay}, jitter ${this.jitter}`);
        this.logger.debug(`Function call failed with error: ${e.message}. Retrying in ${delay}ms (${retries}/${this.maxRetries})`);
        retries++;
        lastError = e;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
}
