import { RandomBackoff } from "./strategies/random-backoff";


export class FunctionExecutorBuilder {


  private randomBackoffBuilder: RandomBackoffBuilder;

  public withRandomBackoff(randomBuilder: (builder: RandomBackoffBuilder) => RandomBackoffBuilder) {
    this.randomBackoffBuilder = randomBuilder(new RandomBackoffBuilder());
    return this;
  }

  public build() {
    if (!this.randomBackoffBuilder) {
      throw new Error('Random backoff builder is required');
    }

    return this.randomBackoffBuilder.build();
  }

}

class RandomBackoffBuilder {

  private maxRetries: number;
  private baseDelay: number;
  private jitter: number;

  public withMaxTries(maxRetries: number) {
    this.maxRetries = maxRetries;
    return this;
  }

  public withBaseDelay(baseDelay: number) {
    this.baseDelay = baseDelay;
    return this;
  }

  public withJitter(jitter: number) {
    this.jitter = jitter;
    return this;
  }

  public build() {
    if (!this.maxRetries) {
      throw new Error('Max retries is required');
    }
    if (!this.baseDelay) {
      throw new Error('Base delay is required');
    }
    if (!this.jitter) {
      throw new Error('Jitter is required');
    }
    return new RandomBackoff(this.maxRetries, this.baseDelay, this.jitter);
  }

}
