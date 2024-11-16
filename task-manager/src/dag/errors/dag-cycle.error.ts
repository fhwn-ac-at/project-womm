import { BadRequestException, ConflictException } from "@nestjs/common";
import { CycleDetectorResponse } from "../cycle-detector/strategies/cycle-detector-result";

export class DagCycleError extends ConflictException {

  constructor(cycleDetectorResponse: CycleDetectorResponse) {
    super(`Unable to create workflow plan since it contains a cycle: ${cycleDetectorResponse.cycleDescription}`);
  }

}
