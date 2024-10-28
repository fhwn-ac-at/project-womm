

export class DagCreationError extends Error {

  constructor(message: string) {
    super(`Error during DAG creation: ${message}`);
  }

}
