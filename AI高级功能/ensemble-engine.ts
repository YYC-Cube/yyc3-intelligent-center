/**
 * 集成学习引擎
 * 高智能化：智能集成学习策略优化
 * 高精度：高精度的多模型融合预测
 * 高灵活性：灵活的集成方法配置
 */

import { BasePredictor, PredictionData, PredictionResult, TrainingResult, PredictorConfig } from './base-predictor';
import { ARIMAEngine } from './arima-engine';
import { ProphetEngine } from './prophet-engine';
import { LSTMEngine } from './lstm-engine';
import { logger } from '@/lib/logger';

export interface EnsembleConfig extends PredictorConfig {
  parameters: {
    method: 'bagging' | 'boosting' | 'stacking' | 'voting' | 'blending';
    baseModels: Array<{
      type: 'arima' | 'prophet' | 'lstm';
      config: PredictorConfig;
      weight?: number;
    }>;
    metaLearner?: {
      type: 'linear' | 'ridge' | 'lasso' | 'random_forest';
      config?: any;
    };
    crossValidation?: {
      folds: number;
      shuffle: boolean;
      stratified: boolean;
    };
    selection?: {
      method: 'all' | 'best' | 'diverse';
      maxModels?: number;
      diversityThreshold?: number;
    };
  };
}

export interface EnsembleModel {
  baseModels: any[];
  metaModel?: any;
  weights: number[];
  method: string;
  selectionHistory: Array<{
    iteration: number;
    selectedModels: string[];
    performance: number;
  }>;
  metadata: {
    trainedAt: Date;
    baseModelCount: number;
    metaLearnerType?: string;
  };
}

/**
 * 集成学习预测引擎
 */
export class EnsembleEngine extends BasePredictor {
  private ensembleModel: EnsembleModel | null = null;
  private basePredictors: Map<string, BasePredictor> = new Map();

  constructor(config: EnsembleConfig) {
    super(config);
    this.initializeBasePredictors();
  }

  /**
   * 初始化基础预测器
   */
  private initializeBasePredictors(): void {
    for (const modelConfig of this.config.parameters.baseModels) {
      let predictor: BasePredictor;
      
      switch (modelConfig.type) {
        case 'arima':
          predictor = new ARIMAEngine(modelConfig.config as any);
          break;
        case 'prophet':
          predictor = new ProphetEngine(modelConfig.config as any);
          break;
        case 'lstm':
          predictor = new LSTMEngine(modelConfig.config as any);
          break;
        default:
          throw new Error(`Unsupported base model type: ${modelConfig.type}`);
      }
      
      this.basePredictors.set(modelConfig.type, predictor);
    }
  }

  /**
   * 数据预处理
   */
  protected async preprocessData(data: PredictionData): Promise<PredictionData> {
    // 集成学习使用基础预测器的预处理
    return data;
  }

  /**
   * 训练集成模型
   */
  protected async trainModel(data: PredictionData): Promise<TrainingResult> {
    try {
      const params = this.config.parameters;
      
      logger.info('Training ensemble model', {
        method: params.method,
        baseModelCount: params.baseModels.length,
        dataPoints: data.values.length,
      });

      // 选择基础模型
      const selectedModels = await this.selectBaseModels(data, params.selection);
      
      // 训练基础模型
      const trainedBaseModels = await this.trainBaseModels(selectedModels, data);
      
      // 根据集成方法构建最终模型
      let finalModel: EnsembleModel;
      switch (params.method) {
        case 'bagging':
          finalModel = await this.trainBaggingModel(trainedBaseModels, data);
          break;
        case 'boosting':
          finalModel = await this.trainBoostingModel(trainedBaseModels, data);
          break;
        case 'stacking':
          finalModel = await this.trainStackingModel(trainedBaseModels, data, params.metaLearner);
          break;
        case 'voting':
          finalModel = await this.trainVotingModel(trainedBaseModels, data);
          break;
        case 'blending':
          finalModel = await this.trainBlendingModel(trainedBaseModels, data);
          break;
        default:
          throw new Error(`Unsupported ensemble method: ${params.method}`);
      }

      this.ensembleModel = finalModel;

      // 评估集成模型
      const metrics = await this.evaluateEnsembleModel(finalModel, data);

      logger.info('Ensemble model trained successfully', {
        method: params.method,
        baseModels: finalModel.baseModels.length,
        metrics,
      });

      return {
        success: true,
        metrics,
        model: finalModel,
      };
    } catch (error) {
      logger.error('Error training ensemble model:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 集成预测
   */
  protected async predictModel(data: PredictionData, horizon: number): Promise<PredictionResult> {
    if (!this.ensembleModel) {
      throw new Error('Ensemble model is not trained');
    }

    try {
      const params = this.config.parameters;
      
      // 基础模型预测
      const basePredictions = await this.getBasePredictions(data, horizon);
      
      // 根据集成方法组合预测
      let finalPredictions: number[];
      switch (params.method) {
        case 'bagging':
        case 'voting':
          finalPredictions = this.combinePredictionsVoting(basePredictions);
          break;
        case 'boosting':
          finalPredictions = this.combinePredictionsBoosting(basePredictions);
          break;
        case 'stacking':
          finalPredictions = await this.combinePredictionsStacking(basePredictions, data);
          break;
        case 'blending':
          finalPredictions = await this.combinePredictionsBlending(basePredictions, data);
          break;
        default:
          throw new Error(`Unsupported ensemble method: ${params.method}`);
      }

      const timestamps = this.generateTimeSeries(
        data.timestamps[data.timestamps.length - 1],
        horizon
      );

      return {
        timestamps,
        values: finalPredictions,
        metadata: {
          model: 'ensemble',
          method: params.method,
          baseModels: this.ensembleModel.baseModels.length,
          basePredictions: basePredictions.length,
        },
      };
    } catch (error) {
      logger.error('Error in ensemble prediction:', error);
      throw error;
    }
  }

  /**
   * 评估集成模型
   */
  protected async evaluateModel(testData: PredictionData): Promise<Record<string, number>> {
    try {
      if (!this.ensembleModel) {
        throw new Error('Ensemble model is not trained');
      }

      // 使用时间序列交叉验证
      const cvResults = await this.timeSeriesCrossValidation(
        testData,
        this.config.parameters.crossValidation?.folds || 5
      );

      return {
        mae: cvResults.mae,
        mse: cvResults.mse,
        rmse: cvResults.rmse,
        mape: cvResults.mape,
        r2: cvResults.r2,
        baseModelPerformance: cvResults.baseModelPerformance,
      };
    } catch (error) {
      logger.error('Error evaluating ensemble model:', error);
      throw error;
    }
  }

  /**
   * 保存集成模型
   */
  protected async saveModelData(path: string, data: any): Promise<void> {
    const fs = require('fs').promises;
    
    // 保存基础模型
    const baseModelsDir = path.replace('.json', '_base_models');
    await fs.mkdir(baseModelsDir, { recursive: true });
    
    for (let i = 0; i < data.model.baseModels.length; i++) {
      const baseModelPath = `${baseModelsDir}/model_${i}.json`;
      await fs.writeFile(baseModelPath, JSON.stringify(data.model.baseModels[i], null, 2));
    }
    
    // 保存集成模型元数据
    const ensembleData = {
      ...data,
      model: {
        ...data.model,
        baseModels: data.model.baseModels.map((_: any, i: number) => `${baseModelsDir}/model_${i}.json`),
      },
    };
    
    await fs.writeFile(path, JSON.stringify(ensembleData, null, 2));
  }

  /**
   * 加载集成模型
   */
  protected async loadModelData(path: string): Promise<any> {
    const fs = require('fs').promises;
    const modelData = await fs.readFile(path, 'utf8');
    const data = JSON.parse(modelData);
    
    // 加载基础模型
    const baseModels: any[] = [];
    for (const basePath of data.model.baseModels) {
      const baseModelData = await fs.readFile(basePath, 'utf8');
      baseModels.push(JSON.parse(baseModelData));
    }
    
    data.model.baseModels = baseModels;
    return data;
  }

  /**
   * 选择基础模型
   */
  private async selectBaseModels(
    data: PredictionData,
    selectionConfig?: EnsembleConfig['parameters']['selection']
  ): Promise<EnsembleConfig['parameters']['baseModels']> {
    const baseModels = this.config.parameters.baseModels;
    
    if (!selectionConfig || selectionConfig.method === 'all') {
      return baseModels;
    }

    // 评估每个基础模型
    const modelPerformances: Array<{
      model: EnsembleConfig['parameters']['baseModels'][0];
      performance: number;
    }> = [];

    for (const modelConfig of baseModels) {
      try {
        const predictor = this.basePredictors.get(modelConfig.type);
        if (!predictor) continue;

        // 使用部分数据进行快速评估
        const evalData = {
          timestamps: data.timestamps.slice(0, Math.floor(data.timestamps.length * 0.7)),
          values: data.values.slice(0, Math.floor(data.values.length * 0.7)),
        };

        await predictor.train(evalData);
        const metrics = await predictor.evaluate({
          timestamps: data.timestamps.slice(Math.floor(data.timestamps.length * 0.7)),
          values: data.values.slice(Math.floor(data.values.length * 0.7)),
        });

        const performance = this.calculateOverallScore(metrics);
        modelPerformances.push({ model: modelConfig, performance });
      } catch (error) {
        logger.warn(`Failed to evaluate model ${modelConfig.type}:`, error);
      }
    }

    // 根据选择方法筛选模型
    let selectedModels: typeof baseModels;
    switch (selectionConfig.method) {
      case 'best':
        selectedModels = modelPerformances
          .sort((a, b) => b.performance - a.performance)
          .slice(0, selectionConfig.maxModels || baseModels.length)
          .map(item => item.model);
        break;
      case 'diverse':
        selectedModels = this.selectDiverseModels(
          modelPerformances,
          selectionConfig.diversityThreshold || 0.1
        );
        break;
      default:
        selectedModels = baseModels;
    }

    logger.info('Base models selected', {
      total: baseModels.length,
      selected: selectedModels.length,
      method: selectionConfig.method,
    });

    return selectedModels;
  }

  /**
   * 训练基础模型
   */
  private async trainBaseModels(
    modelConfigs: EnsembleConfig['parameters']['baseModels'],
    data: PredictionData
  ): Promise<any[]> {
    const trainedModels: any[] = [];

    for (const modelConfig of modelConfigs) {
      try {
        const predictor = this.basePredictors.get(modelConfig.type);
        if (!predictor) continue;

        logger.debug(`Training base model: ${modelConfig.type}`);
        
        const trainingResult = await predictor.train(data);
        if (trainingResult.success) {
          trainedModels.push({
            type: modelConfig.type,
            model: trainingResult.model,
            predictor,
            weight: modelConfig.weight || 1.0,
          });
        }
      } catch (error) {
        logger.warn(`Failed to train base model ${modelConfig.type}:`, error);
      }
    }

    return trainedModels;
  }

  /**
   * 训练Bagging模型
   */
  private async trainBaggingModel(
    baseModels: any[],
    data: PredictionData
  ): Promise<EnsembleModel> {
    // Bagging：使用所有基础模型的平均预测
    const weights = baseModels.map(model => model.weight || 1.0);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    return {
      baseModels,
      weights: normalizedWeights,
      method: 'bagging',
      selectionHistory: [],
      metadata: {
        trainedAt: new Date(),
        baseModelCount: baseModels.length,
      },
    };
  }

  /**
   * 训练Boosting模型
   */
  private async trainBoostingModel(
    baseModels: any[],
    data: PredictionData
  ): Promise<EnsembleModel> {
    // Boosting：顺序训练模型，每个模型关注前一个模型的错误
    const boostedModels: any[] = [];
    const weights: number[] = [];
    let residualData = { ...data };

    for (let i = 0; i < baseModels.length; i++) {
      const model = baseModels[i];
      
      // 在残差数据上训练模型
      await model.predictor.train(residualData);
      
      // 计算模型权重（基于性能）
      const predictions = await model.predictor.predict(data, data.values.length);
      const error = this.calculatePredictionError(data.values, predictions.values);
      const modelWeight = Math.exp(-error); // 错误越小，权重越大
      
      boostedModels.push(model);
      weights.push(modelWeight);
      
      // 更新残差
      if (i < baseModels.length - 1) {
        residualData.values = data.values.map((actual, idx) => 
          actual - predictions.values[idx]
        );
      }
    }

    // 归一化权重
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    return {
      baseModels: boostedModels,
      weights: normalizedWeights,
      method: 'boosting',
      selectionHistory: [],
      metadata: {
        trainedAt: new Date(),
        baseModelCount: boostedModels.length,
      },
    };
  }

  /**
   * 训练Stacking模型
   */
  private async trainStackingModel(
    baseModels: any[],
    data: PredictionData,
    metaLearnerConfig?: EnsembleConfig['parameters']['metaLearner']
  ): Promise<EnsembleModel> {
    // Stacking：使用元学习器组合基础模型的预测
    const metaFeatures: number[][] = [];
    const metaTargets: number[] = [];

    // 使用交叉验证生成元特征
    const folds = 5;
    const foldSize = Math.floor(data.values.length / folds);

    for (let fold = 0; fold < folds; fold++) {
      const testStart = fold * foldSize;
      const testEnd = (fold + 1) * foldSize;
      
      const trainData = {
        timestamps: [
          ...data.timestamps.slice(0, testStart),
          ...data.timestamps.slice(testEnd),
        ],
        values: [
          ...data.values.slice(0, testStart),
          ...data.values.slice(testEnd),
        ],
      };
      
      const testData = {
        timestamps: data.timestamps.slice(testStart, testEnd),
        values: data.values.slice(testStart, testEnd),
      };

      // 训练基础模型
      for (const model of baseModels) {
        await model.predictor.train(trainData);
      }

      // 生成元特征
      for (let i = 0; i < testData.values.length; i++) {
        const foldData = {
          timestamps: testData.timestamps.slice(0, i + 1),
          values: testData.values.slice(0, i + 1),
        };
        
        const features: number[] = [];
        for (const model of baseModels) {
          const prediction = await model.predictor.predict(foldData, 1);
          features.push(prediction.values[0]);
        }
        
        metaFeatures.push(features);
        metaTargets.push(testData.values[i]);
      }
    }

    // 训练元学习器
    const metaModel = await this.trainMetaLearner(metaFeatures, metaTargets, metaLearnerConfig);

    // 在全部数据上重新训练基础模型
    for (const model of baseModels) {
      await model.predictor.train(data);
    }

    return {
      baseModels,
      metaModel,
      weights: baseModels.map(() => 1.0 / baseModels.length),
      method: 'stacking',
      selectionHistory: [],
      metadata: {
        trainedAt: new Date(),
        baseModelCount: baseModels.length,
        metaLearnerType: metaLearnerConfig?.type || 'linear',
      },
    };
  }

  /**
   * 训练Voting模型
   */
  private async trainVotingModel(
    baseModels: any[],
    data: PredictionData
  ): Promise<EnsembleModel> {
    // Voting：简单平均或加权平均
    const weights = baseModels.map(model => model.weight || 1.0);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    return {
      baseModels,
      weights: normalizedWeights,
      method: 'voting',
      selectionHistory: [],
      metadata: {
        trainedAt: new Date(),
        baseModelCount: baseModels.length,
      },
    };
  }

  /**
   * 训练Blending模型
   */
  private async trainBlendingModel(
    baseModels: any[],
    data: PredictionData
  ): Promise<EnsembleModel> {
    // Blending：使用验证集学习组合权重
    const splitRatio = 0.8;
    const splitIndex = Math.floor(data.values.length * splitRatio);
    
    const trainData = {
      timestamps: data.timestamps.slice(0, splitIndex),
      values: data.values.slice(0, splitIndex),
    };
    
    const validData = {
      timestamps: data.timestamps.slice(splitIndex),
      values: data.values.slice(splitIndex),
    };

    // 训练基础模型
    for (const model of baseModels) {
      await model.predictor.train(trainData);
    }

    // 在验证集上学习最优权重
    const validationPredictions: number[][] = [];
    for (const model of baseModels) {
      const prediction = await model.predictor.predict(validData, validData.values.length);
      validationPredictions.push(prediction.values);
    }

    const optimalWeights = this.optimizeBlendingWeights(
      validationPredictions,
      validData.values
    );

    // 在全部数据上重新训练基础模型
    for (const model of baseModels) {
      await model.predictor.train(data);
    }

    return {
      baseModels,
      weights: optimalWeights,
      method: 'blending',
      selectionHistory: [],
      metadata: {
        trainedAt: new Date(),
        baseModelCount: baseModels.length,
      },
    };
  }

  /**
   * 获取基础模型预测
   */
  private async getBasePredictions(
    data: PredictionData,
    horizon: number
  ): Promise<Array<{ modelType: string; predictions: number[]; confidence?: any }>> {
    const predictions: Array<{
      modelType: string;
      predictions: number[];
      confidence?: any;
    }> = [];

    if (!this.ensembleModel) return predictions;

    for (const baseModel of this.ensembleModel.baseModels) {
      try {
        const prediction = await baseModel.predictor.predict(data, horizon);
        predictions.push({
          modelType: baseModel.type,
          predictions: prediction.values,
          confidence: prediction.confidence,
        });
      } catch (error) {
        logger.warn(`Failed to get prediction from ${baseModel.type}:`, error);
      }
    }

    return predictions;
  }

  /**
   * 投票组合预测
   */
  private combinePredictionsVoting(basePredictions: any[]): number[] {
    if (basePredictions.length === 0) return [];
    
    const horizon = basePredictions[0].predictions.length;
    const combinedPredictions: number[] = [];

    for (let i = 0; i < horizon; i++) {
      let weightedSum = 0;
      let totalWeight = 0;

      for (let j = 0; j < basePredictions.length; j++) {
        const weight = this.ensembleModel!.weights[j];
        weightedSum += basePredictions[j].predictions[i] * weight;
        totalWeight += weight;
      }

      combinedPredictions.push(weightedSum / totalWeight);
    }

    return combinedPredictions;
  }

  /**
   * Boosting组合预测
   */
  private combinePredictionsBoosting(basePredictions: any[]): number[] {
    // Boosting使用顺序累加
    return this.combinePredictionsVoting(basePredictions);
  }

  /**
   * Stacking组合预测
   */
  private async combinePredictionsStacking(
    basePredictions: any[],
    data: PredictionData
  ): Promise<number[]> {
    if (!this.ensembleModel?.metaModel) {
      return this.combinePredictionsVoting(basePredictions);
    }

    const horizon = basePredictions[0].predictions.length;
    const stackedPredictions: number[] = [];

    for (let i = 0; i < horizon; i++) {
      const metaFeatures = basePredictions.map(p => p.predictions[i]);
      const stackedPrediction = this.predictMetaLearner(
        this.ensembleModel.metaModel,
        metaFeatures
      );
      stackedPredictions.push(stackedPrediction);
    }

    return stackedPredictions;
  }

  /**
   * Blending组合预测
   */
  private async combinePredictionsBlending(
    basePredictions: any[],
    data: PredictionData
  ): Promise<number[]> {
    // Blending使用学习的权重
    return this.combinePredictionsVoting(basePredictions);
  }

  /**
   * 训练元学习器
   */
  private async trainMetaLearner(
    features: number[][],
    targets: number[],
    config?: EnsembleConfig['parameters']['metaLearner']
  ): Promise<any> {
    // 简化的线性回归作为元学习器
    const numFeatures = features[0].length;
    const weights = new Array(numFeatures).fill(0);
    const bias = 0;
    const learningRate = 0.01;
    const epochs = 1000;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalError = 0;

      for (let i = 0; i < features.length; i++) {
        // 前向传播
        let prediction = bias;
        for (let j = 0; j < numFeatures; j++) {
          prediction += weights[j] * features[i][j];
        }

        // 计算误差
        const error = prediction - targets[i];
        totalError += error * error;

        // 反向传播
        for (let j = 0; j < numFeatures; j++) {
          weights[j] -= learningRate * error * features[i][j];
        }
        bias -= learningRate * error;
      }

      if (epoch % 100 === 0) {
        logger.debug(`Meta learner epoch ${epoch}, error: ${totalError / features.length}`);
      }
    }

    return {
      type: 'linear',
      weights,
      bias,
      config,
    };
  }

  /**
   * 元学习器预测
   */
  private predictMetaLearner(metaModel: any, features: number[]): number {
    let prediction = metaModel.bias;
    for (let i = 0; i < features.length; i++) {
      prediction += metaModel.weights[i] * features[i];
    }
    return prediction;
  }

  /**
   * 优化Blending权重
   */
  private optimizeBlendingWeights(
    predictions: number[][],
    targets: number[]
  ): number[] {
    // 使用简单的优化算法寻找最优权重
    const numModels = predictions.length;
    let weights = new Array(numModels).fill(1.0 / numModels);
    const learningRate = 0.01;
    const epochs = 1000;

    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradients = new Array(numModels).fill(0);

      for (let i = 0; i < targets.length; i++) {
        // 计算当前预测
        let prediction = 0;
        for (let j = 0; j < numModels; j++) {
          prediction += weights[j] * predictions[j][i];
        }

        // 计算误差和梯度
        const error = prediction - targets[i];
        for (let j = 0; j < numModels; j++) {
          gradients[j] += error * predictions[j][i];
        }
      }

      // 更新权重
      for (let j = 0; j < numModels; j++) {
        weights[j] -= learningRate * gradients[j] / targets.length;
      }

      // 确保权重非负且和为1
      weights = this.normalizeWeights(weights);
    }

    return weights;
  }

  /**
   * 归一化权重
   */
  private normalizeWeights(weights: number[]): number[] {
    const positiveWeights = weights.map(w => Math.max(0, w));
    const sum = positiveWeights.reduce((a, b) => a + b, 0);
    return sum > 0 ? positiveWeights.map(w => w / sum) : weights.map(() => 1.0 / weights.length);
  }

  /**
   * 时间序列交叉验证
   */
  private async timeSeriesCrossValidation(
    data: PredictionData,
    folds: number
  ): Promise<any> {
    const foldSize = Math.floor(data.values.length / folds);
    const errors: number[] = [];
    const baseModelErrors: Array<{ type: string; errors: number[] }> = [];

    for (let fold = 1; fold <= folds; fold++) {
      const trainSize = fold * foldSize;
      
      const trainData = {
        timestamps: data.timestamps.slice(0, trainSize),
        values: data.values.slice(0, trainSize),
      };
      
      const testData = {
        timestamps: data.timestamps.slice(trainSize, trainSize + foldSize),
        values: data.values.slice(trainSize, trainSize + foldSize),
      };

      // 训练集成模型
      await this.train(trainData);
      
      // 预测并计算误差
      const predictions = await this.predict(testData, testData.values.length);
      const foldErrors = testData.values.map((actual, i) => 
        Math.pow(actual - predictions.values[i], 2)
      );
      
      errors.push(...foldErrors);
    }

    const mse = errors.reduce((a, b) => a + b, 0) / errors.length;
    const rmse = Math.sqrt(mse);
    const mae = errors.reduce((a, b) => a + Math.sqrt(b), 0) / errors.length;

    return {
      mse,
      rmse,
      mae,
      mape: 0, // 简化
      r2: 0, // 简化
      baseModelPerformance: baseModelErrors,
    };
  }

  /**
   * 评估集成模型
   */
  private async evaluateEnsembleModel(
    model: EnsembleModel,
    data: PredictionData
  ): Promise<Record<string, number>> {
    // 使用最后20%的数据作为测试集
    const splitIndex = Math.floor(data.values.length * 0.8);
    
    const testData = {
      timestamps: data.timestamps.slice(splitIndex),
      values: data.values.slice(splitIndex),
    };
    
    const predictions = await this.predictModel(testData, testData.values.length);
    
    return this.calculateMetrics(testData.values, predictions.values);
  }

  /**
   * 选择多样化模型
   */
  private selectDiverseModels(
    modelPerformances: Array<{ model: any; performance: number }>,
    diversityThreshold: number
  ): EnsembleConfig['parameters']['baseModels'][] {
    // 简化的多样性选择：选择性能好的但不过于相似的模型
    const sortedModels = modelPerformances.sort((a, b) => b.performance - a.performance);
    const selectedModels: any[] = [];
    
    for (const modelPerformance of sortedModels) {
      const selected = selectedModels.some(selected => 
        Math.abs(selected.performance - modelPerformance.performance) > diversityThreshold
      );
      
      if (selectedModels.length === 0 || selected) {
        selectedModels.push(modelPerformance.model);
      }
    }
    
    return selectedModels;
  }

  /**
   * 计算综合评分
   */
  private calculateOverallScore(metrics: Record<string, number>): number {
    // 简化的综合评分计算
    const weights = {
      mae: 0.3,
      mse: 0.3,
      rmse: 0.2,
      mape: 0.2,
    };
    
    let score = 0;
    let totalWeight = 0;
    
    for (const [metric, weight] of Object.entries(weights)) {
      if (metrics[metric] !== undefined) {
        // 误差指标越小越好，这里转换为得分
        score += (1 / (1 + metrics[metric])) * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * 计算预测误差
   */
  private calculatePredictionError(actual: number[], predicted: number[]): number {
    return actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / actual.length;
  }
}
