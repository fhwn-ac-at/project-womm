import { Injectable } from '@nestjs/common';
import { CycleDetectorStrategy } from './strategies/cycle-detector-strategy.interface';
import { DFSStrategy } from './strategies/dfs.strategy';
import { DAG } from '../entities/dag.entity';
import { CycleDetectorResponse } from './strategies/cycle-detector-result';


export enum CycleDetectorStrategies {
  DepthFirstSearch
}

@Injectable()
export class CycleDetectorService {

  private strategyMap: Map<CycleDetectorStrategies, CycleDetectorStrategy>;

  public constructor() {
    this.strategyMap = new Map();
    this.strategyMap.set(CycleDetectorStrategies.DepthFirstSearch, new DFSStrategy());
  }

  public async checkForCycle(dag: DAG, algorithm: CycleDetectorStrategies = CycleDetectorStrategies.DepthFirstSearch): Promise<CycleDetectorResponse> {
    const strategy = this.strategyMap.get(algorithm);
    return await strategy.hasCycles(dag);
  }
}
