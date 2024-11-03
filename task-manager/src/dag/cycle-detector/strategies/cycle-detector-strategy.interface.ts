import { DAG } from "src/dag/entities/dag.entity";
import { CycleDetectorResponse } from "./cycle-detector-result";

export interface CycleDetectorStrategy {

  hasCycles(dag: DAG): Promise<CycleDetectorResponse>
} 
