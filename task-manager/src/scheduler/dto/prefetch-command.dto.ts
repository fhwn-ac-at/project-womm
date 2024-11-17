

export class PrefetchCommandDto {

  constructor(partial?: Partial<PrefetchCommandDto>) {
    Object.assign(this, partial);
  }

  /**
   * The artifacts that the worker needs to fetch now.
   */
  immediateArtifacts: string[];

  /**
   * Artifacts that the worker is currently working on creating.
   */
  persistentArtifacts: string[];
}
