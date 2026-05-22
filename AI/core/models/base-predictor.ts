import { BaseConfig, PredictionData, PredictionResult, TrainingResult } from '../../../app/services/ai/types/ai-types';

export abstract class BasePredictor {
  protected config: BaseConfig;
  protected isTrained: boolean = false;
  protected model: any = null;
  protected performanceMetrics: Record<string, number> = {};

  constructor(config: BaseConfig) {
    this.config = config;
  }

  // 公共接口
  async predict(data: PredictionData, horizon: number): Promise<PredictionResult> {
    if (!this.isTrained) {
      throw new Error('Model must be trained before prediction');
    }
    
    const preprocessedData = await this.preprocessData(data);
    return this.predictModel(preprocessedData, horizon);
  }

  async train(data: PredictionData): Promise<TrainingResult> {
    const preprocessedData = await this.preprocessData(data);
    const result = await this.trainModel(preprocessedData);
    
    if (result.success) {
      this.isTrained = true;
      this.performanceMetrics = result.metrics;
    }
    
    return result;
  }

  async evaluate(testData: PredictionData): Promise<Record<string, number>> {
    if (!this.isTrained) {
      throw new Error('Model must be trained before evaluation');
    }
    
    const preprocessedData = await this.preprocessData(testData);
    return this.evaluateModel(preprocessedData);
  }

  async save(path: string): Promise<void> {
    if (!this.isTrained) {
      throw new Error('Cannot save untrained model');
    }
    
    const modelData = {
      model: this.model,
      config: this.config,
      performanceMetrics: this.performanceMetrics,
      timestamp: new Date().toISOString()
    };
    
    await this.saveModelData(path, modelData);
  }

  async load(path: string): Promise<void> {
    const modelData = await this.loadModelData(path);
    
    this.model = modelData.model;
    this.config = modelData.config;
    this.performanceMetrics = modelData.performanceMetrics;
    this.isTrained = true;
  }

  // 抽象方法，子类必须实现
  protected abstract predictModel(data: PredictionData, horizon: number): Promise<PredictionResult>;
  protected abstract trainModel(data: PredictionData): Promise<TrainingResult>;
  protected abstract evaluateModel(testData: PredictionData): Promise<Record<string, number>>;
  protected abstract preprocessData(data: PredictionData): Promise<PredictionData>;
  protected abstract saveModelData(path: string, data: any): Promise<void>;
  protected abstract loadModelData(path: string): Promise<any>;

  // 辅助方法
  protected calculateMetrics(actual: number[], predicted: number[]): Record<string, number> {
    const mse = this.calculateMSE(actual, predicted);
    const mae = this.calculateMAE(actual, predicted);
    const rmse = Math.sqrt(mse);
    const mape = this.calculateMAPE(actual, predicted);
    
    return {
      mse,
      mae,
      rmse,
      mape,
      r2: this.calculateR2(actual, predicted)
    };
  }

  private calculateMSE(actual: number[], predicted: number[]): number {
    return actual.reduce((sum, val, idx) => 
      sum + Math.pow(val - predicted[idx], 2), 0
    ) / actual.length;
  }

  private calculateMAE(actual: number[], predicted: number[]): number {
    return actual.reduce((sum, val, idx) => 
      sum + Math.abs(val - predicted[idx]), 0
    ) / actual.length;
  }

  private calculateMAPE(actual: number[], predicted: number[]): number {
    return actual.reduce((sum, val, idx) => 
      sum + Math.abs((val - predicted[idx]) / val), 0
    ) / actual.length * 100;
  }

  private calculateR2(actual: number[], predicted: number[]): number {
    const actualMean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssRes = actual.reduce((sum, val, idx) => 
      sum + Math.pow(val - predicted[idx], 2), 0
    );
    const ssTot = actual.reduce((sum, val) => 
      sum + Math.pow(val - actualMean, 2), 0
    );
    
    return 1 - (ssRes / ssTot);
  }
}
