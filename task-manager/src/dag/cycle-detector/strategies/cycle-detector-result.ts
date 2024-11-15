import internal from "stream"


export interface CycleDetectorResponse {

  hasCycle: boolean;

  cycleDescription?: string;

}
