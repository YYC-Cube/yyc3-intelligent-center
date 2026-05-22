import { PredictionData, PredictionResult, TrainingResult } from '../../types/ai-types';
import { BasePredictor } from './base-predictor';

export interface EnsembleModel {
  id: string;
  type: 'bagging' | 'boosting' | 'stacking' | 'voting' | 'blending';
  baseModels: BasePredictor[];
  weights?: number[];
  metaModel?: any;
  parameters: Record<string, any>;
  performance: Record<string, number>;
}

export class BasicEnsembleModel implements EnsembleModel {
  id: string;
  type: 'bagging' | 'boosting' | 'stacking' | 'voting' | 'blending';
  baseModels: BasePredictor[];
  weights?: number[];
  metaModel?: any;
  parameters: Record<string, any>;
  performance: Record<string, number>;

  constructor(
    id: string,
    type: 'bagging' | 'boosting' | 'stacking' | 'voting' | 'blending',
    baseModels: BasePredictor[],
    parameters: Record<string, any> = {}
  ) {
    this.id = id;
    this.type = type;
    this.baseModels = baseModels;
    this.parameters = parameters;
    this.performance = {};
    
    // 为每个基础模型设置相等的权重（如果没有指定权重）
    if (!this.parameters.weights) {
      this.weights = baseModels.map(() => 1 / baseModels.length);
    } else {
      this.weights = this.parameters.weights;
    }
  }

  // 保存模型性能指标
  updatePerformance(metrics: Record<string, number>): void {
    this.performance = metrics;
  }

  // 获取模型配置信息
  getConfiguration(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      baseModelCount: this.baseModels.length,
      parameters: this.parameters,
      performance: this.performance
    };
  }
}