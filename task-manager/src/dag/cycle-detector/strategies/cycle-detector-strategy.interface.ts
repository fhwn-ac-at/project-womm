import { DAG } from "../../../dag/entities/dag.entity";
import { CycleDetectorResponse } from "./cycle-detector-result";

export interface CycleDetectorStrategy {

  hasCycles(dag: DAG): Promise<CycleDetectorResponse>
} 
