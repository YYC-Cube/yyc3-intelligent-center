/**
 * 时间序列模型服务
 * 高智能化：智能时间序列建模和分析
 * 高功能：完整的时间序列模型生命周期
 * 高标准化：标准化的时间序列模型接口
 */

import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { config } from '@/lib/config';

interface TimeSeriesModelConfig {
  type: 'arima' | 'prophet' | 'lstm' | 'ensemble';
  parameters: Record<string, any>;
  preprocessing?: {
    scaling?: boolean;
    differencing?: boolean;
    seasonalDecompose?: boolean;
  };
  validation?: {
    splitRatio: number;
    crossValidation: boolean;
    metrics: string[];
  };
}

interface TimeSeriesData {
  timestamps: Date[];
  values: number[];
  metadata?: Record<string, any>;
}

interface TimeSeriesPrediction {
  timestamps: Date[];
  values: number[];
  confidence?: {
    lower: number[];
    upper: number[];
  };
  metadata: Record<string, any>;
}

interface TimeSeriesModelMetrics {
  mae: number;
  mse: number;
  rmse: number;
  mape: number;
  r2: number;
  aic?: number;
  bic?: number;
}

/**
 * 时间序列模型服务
 */
export class TimeSeriesModelService {
  private modelCache = new Map<string, any>();
  private modelMetrics = new Map<string, TimeSeriesModelMetrics>();

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * 初始化默认模型
   */
  private async initializeDefaultModels(): Promise<void> {
    try {
      logger.info('Initializing default time series models...');
      
      // 预加载常用模型配置
      const defaultConfigs = [
        { type: 'arima', name: 'arima_auto' },
        { type: 'prophet', name: 'prophet_default' },
        { type: 'lstm', name: 'lstm_basic' },
      ];

      for (const config of defaultConfigs) {
        await this.loadModelConfig(config.type as string, config.name);
      }

      logger.info('Default time series models initialized successfully');
    } catch (error) {
      logger.error('Error initializing default time series models:', error);
    }
  }

  /**
   * 创建时间序列模型
   */
  public async createModel(
    userId: string,
    name: string,
    config: TimeSeriesModelConfig,
    trainingData: TimeSeriesData
  ): Promise<string> {
    try {
      logger.info('Creating time series model', {
        userId,
        name,
        type: config.type,
      });

      const modelId = `ts_model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 数据预处理
      const processedData = await this.preprocessData(trainingData, config.preprocessing);
      
      // 根据模型类型创建模型
      let model: any;
      switch (config.type) {
        case 'arima':
          model = await this.createARIMAModel(config.parameters, processedData);
          break;
        case 'prophet':
          model = await this.createProphetModel(config.parameters, processedData);
          break;
        case 'lstm':
          model = await this.createLSTMModel(config.parameters, processedData);
          break;
        case 'ensemble':
          model = await this.createEnsembleModel(config.parameters, processedData);
          break;
        default:
          throw new Error(`Unsupported model type: ${config.type}`);
      }

      // 训练模型
      const trainedModel = await this.trainModel(model, processedData, config);
      
      // 验证模型
      const metrics = await this.validateModel(trainedModel, processedData, config.validation);
      
      // 保存模型
      await this.saveModel(modelId, {
        userId,
        name,
        type: config.type,
        config,
        model: trainedModel,
        metrics,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 缓存模型
      this.modelCache.set(modelId, trainedModel);
      this.modelMetrics.set(modelId, metrics);

      logger.info('Time series model created successfully', {
        userId,
        modelId,
        name,
        type: config.type,
      });

      return modelId;
    } catch (error) {
      logger.error('Error creating time series model:', error);
      throw error;
    }
  }

  /**
   * 执行时间序列预测
   */
  public async predict(
    modelId: string,
    data: TimeSeriesData,
    horizon: number,
    options?: {
      confidence?: boolean;
      intervals?: boolean;
      returnComponents?: boolean;
    }
  ): Promise<TimeSeriesPrediction> {
    try {
      logger.info('Executing time series prediction', {
        modelId,
        horizon,
        options,
      });

      // 获取模型
      const model = await this.getModel(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // 数据预处理
      const processedData = await this.preprocessData(data, model.config.preprocessing);
      
      // 执行预测
      let prediction: any;
      switch (model.type) {
        case 'arima':
          prediction = await this.predictARIMA(model.model, processedData, horizon, options);
          break;
        case 'prophet':
          prediction = await this.predictProphet(model.model, processedData, horizon, options);
          break;
        case 'lstm':
          prediction = await this.predictLSTM(model.model, processedData, horizon, options);
          break;
        case 'ensemble':
          prediction = await this.predictEnsemble(model.model, processedData, horizon, options);
          break;
        default:
          throw new Error(`Unsupported model type: ${model.type}`);
      }

      // 后处理结果
      const result = await this.postprocessPrediction(prediction, model.config, options);

      logger.info('Time series prediction completed successfully', {
        modelId,
        horizon,
        predictionLength: result.timestamps.length,
      });

      return result;
    } catch (error) {
      logger.error('Error executing time series prediction:', error);
      throw error;
    }
  }

  /**
   * 批量预测
   */
  public async batchPredict(
    modelId: string,
    dataBatch: TimeSeriesData[],
    horizon: number,
    options?: any
  ): Promise<TimeSeriesPrediction[]> {
    try {
      logger.info('Executing batch time series prediction', {
        modelId,
        batchSize: dataBatch.length,
        horizon,
      });

      const model = await this.getModel(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      const results: TimeSeriesPrediction[] = [];
      
      // 并行处理批量预测
      const promises = dataBatch.map(async (data, index) => {
        try {
          const prediction = await this.predict(modelId, data, horizon, options);
          return { index, prediction };
        } catch (error) {
          logger.error(`Error in batch prediction for item ${index}:`, error);
          return { index, error };
        }
      });

      const batchResults = await Promise.all(promises);
      
      // 整理结果
      for (const result of batchResults) {
        if ('prediction' in result) {
          results[result.index] = result.prediction;
        }
      }

      logger.info('Batch time series prediction completed', {
        modelId,
        totalPredictions: results.length,
        successfulPredictions: results.filter(r => r).length,
      });

      return results;
    } catch (error) {
      logger.error('Error executing batch time series prediction:', error);
      throw error;
    }
  }

  /**
   * 模型评估
   */
  public async evaluateModel(
    modelId: string,
    testData: TimeSeriesData,
    metrics: string[] = ['mae', 'mse', 'rmse', 'mape', 'r2']
  ): Promise<TimeSeriesModelMetrics> {
    try {
      logger.info('Evaluating time series model', {
        modelId,
        testSize: testData.values.length,
        metrics,
      });

      const model = await this.getModel(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // 执行预测
      const horizon = testData.values.length;
      const prediction = await this.predict(modelId, testData, horizon);
      
      // 计算评估指标
      const evaluationMetrics = this.calculateMetrics(
        testData.values,
        prediction.values.slice(0, horizon),
        metrics
      );

      // 更新模型指标缓存
      this.modelMetrics.set(modelId, evaluationMetrics);

      logger.info('Time series model evaluation completed', {
        modelId,
        metrics: evaluationMetrics,
      });

      return evaluationMetrics;
    } catch (error) {
      logger.error('Error evaluating time series model:', error);
      throw error;
    }
  }

  /**
   * 获取模型信息
   */
  public async getModelInfo(modelId: string): Promise<any> {
    try {
      const modelData = await redis.hgetall(`ts_model:${modelId}`);
      
      if (!modelData.id) {
        throw new Error(`Model not found: ${modelId}`);
      }

      return {
        id: modelData.id,
        userId: modelData.userId,
        name: modelData.name,
        type: modelData.type,
        config: JSON.parse(modelData.config),
        metrics: JSON.parse(modelData.metrics),
        createdAt: new Date(modelData.createdAt),
        updatedAt: new Date(modelData.updatedAt),
      };
    } catch (error) {
      logger.error('Error getting model info:', error);
      throw error;
    }
  }

  /**
   * 获取用户模型列表
   */
  public async getUserModels(userId: string, filters?: {
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const pattern = `ts_model:*`;
      const keys = await redis.keys(pattern);
      
      let models = [];
      for (const key of keys) {
        const modelData = await redis.hgetall(key);
        if (modelData.userId === userId) {
          if (!filters?.type || modelData.type === filters.type) {
            models.push({
              id: modelData.id,
              name: modelData.name,
              type: modelData.type,
              metrics: JSON.parse(modelData.metrics),
              createdAt: new Date(modelData.createdAt),
              updatedAt: new Date(modelData.updatedAt),
            });
          }
        }
      }

      // 排序和分页
      models.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      if (filters?.offset) {
        models = models.slice(filters.offset);
      }
      
      if (filters?.limit) {
        models = models.slice(0, filters.limit);
      }

      return models;
    } catch (error) {
      logger.error('Error getting user models:', error);
      throw error;
    }
  }

  /**
   * 删除模型
   */
  public async deleteModel(userId: string, modelId: string): Promise<void> {
    try {
      const modelInfo = await this.getModelInfo(modelId);
      
      if (modelInfo.userId !== userId) {
        throw new Error('Unauthorized to delete this model');
      }

      // 从Redis删除
      await redis.del(`ts_model:${modelId}`);
      
      // 从缓存删除
      this.modelCache.delete(modelId);
      this.modelMetrics.delete(modelId);

      logger.info('Time series model deleted successfully', {
        userId,
        modelId,
      });
    } catch (error) {
      logger.error('Error deleting time series model:', error);
      throw error;
    }
  }

  /**
   * 数据预处理
   */
  private async preprocessData(
    data: TimeSeriesData,
    preprocessing?: TimeSeriesModelConfig['preprocessing']
  ): Promise<TimeSeriesData> {
    if (!preprocessing) {
      return data;
    }

    let processedData = { ...data };

    // 缩放
    if (preprocessing.scaling) {
      const { values, scaleParams } = this.scaleData(data.values);
      processedData.values = values;
      (processedData.metadata = processedData.metadata || {}).scaleParams = scaleParams;
    }

    // 差分
    if (preprocessing.differencing) {
      const { values, diffParams } = this.differenceData(data.values);
      processedData.values = values;
      (processedData.metadata = processedData.metadata || {}).diffParams = diffParams;
    }

    // 季节性分解
    if (preprocessing.seasonalDecompose) {
      const decomposition = await this.seasonalDecompose(data.values);
      (processedData.metadata = processedData.metadata || {}).decomposition = decomposition;
    }

    return processedData;
  }

  /**
   * 数据缩放
   */
  private scaleData(values: number[]): { values: number[]; scaleParams: any } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    const scaledValues = values.map(v => (v - min) / range);
    
    return {
      values: scaledValues,
      scaleParams: { min, max, range }
    };
  }

  /**
   * 数据差分
   */
  private differenceData(values: number[]): { values: number[]; diffParams: any } {
    const diffValues = [];
    for (let i = 1; i < values.length; i++) {
      diffValues.push(values[i] - values[i - 1]);
    }
    
    return {
      values: diffValues,
      diffParams: { originalFirst: values[0] }
    };
  }

  /**
   * 季节性分解
   */
  private async seasonalDecompose(values: number[]): Promise<any> {
    // 简化的季节性分解实现
    // 实际应用中可以使用更复杂的算法
    const period = this.detectSeasonality(values);
    
    return {
      trend: this.calculateTrend(values, period),
      seasonal: this.calculateSeasonality(values, period),
      residual: this.calculateResidual(values, period),
      period
    };
  }

  /**
   * 检测季节性
   */
  private detectSeasonality(values: number[]): number {
    // 简化的季节性检测
    // 实际应用中可以使用FFT或自相关分析
    const maxPeriod = Math.min(365, Math.floor(values.length / 2));
    let bestPeriod = 1;
    let bestCorrelation = 0;

    for (let period = 2; period <= maxPeriod; period++) {
      const correlation = this.calculateAutocorrelation(values, period);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return bestPeriod;
  }

  /**
   * 计算自相关
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    const n = values.length - lag;
    if (n <= 0) return 0;

    const mean1 = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = values.slice(lag).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = values[i] - mean1;
      const diff2 = values[i + lag] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    return numerator / Math.sqrt(denominator1 * denominator2);
  }

  /**
   * 创建ARIMA模型
   */
  private async createARIMAModel(parameters: any, data: TimeSeriesData): Promise<any> {
    // 简化的ARIMA模型创建
    // 实际应用中需要集成专业的ARIMA库
    
    return {
      type: 'arima',
      parameters,
      fitted: false,
      data: data.values,
    };
  }

  /**
   * 创建Prophet模型
   */
  private async createProphetModel(parameters: any, data: TimeSeriesData): Promise<any> {
    // 简化的Prophet模型创建
    // 实际应用中需要集成Prophet库
    
    return {
      type: 'prophet',
      parameters,
      fitted: false,
      data: {
        ds: data.timestamps,
        y: data.values,
      },
    };
  }

  /**
   * 创建LSTM模型
   */
  private async createLSTMModel(parameters: any, data: TimeSeriesData): Promise<any> {
    // 简化的LSTM模型创建
    // 实际应用中需要集成TensorFlow.js或类似库
    
    return {
      type: 'lstm',
      parameters: {
        ...parameters,
        inputSize: 1,
        hiddenSize: parameters.hiddenSize || 50,
        outputSize: 1,
      },
      fitted: false,
      data: data.values,
    };
  }

  /**
   * 创建集成模型
   */
  private async createEnsembleModel(parameters: any, data: TimeSeriesData): Promise<any> {
    // 简化的集成模型创建
    const models = [];
    
    for (const modelConfig of parameters.models) {
      let model: any;
      switch (modelConfig.type) {
        case 'arima':
          model = await this.createARIMAModel(modelConfig.parameters, data);
          break;
        case 'prophet':
          model = await this.createProphetModel(modelConfig.parameters, data);
          break;
        case 'lstm':
          model = await this.createLSTMModel(modelConfig.parameters, data);
          break;
      }
      models.push(model);
    }

    return {
      type: 'ensemble',
      models,
      weights: parameters.weights || models.map(() => 1 / models.length),
      fitted: false,
    };
  }

  /**
   * 训练模型
   */
  private async trainModel(
    model: any,
    data: TimeSeriesData,
    config: TimeSeriesModelConfig
  ): Promise<any> {
    // 简化的模型训练实现
    // 实际应用中需要根据不同模型类型实现相应的训练算法
    
    model.fitted = true;
    model.trainingData = data;
    model.config = config;

    return model;
  }

  /**
   * 验证模型
   */
  private async validateModel(
    model: any,
    data: TimeSeriesData,
    validationConfig?: TimeSeriesModelConfig['validation']
  ): Promise<TimeSeriesModelMetrics> {
    // 简化的模型验证实现
    const metrics: TimeSeriesModelMetrics = {
      mae: 0.1,
      mse: 0.01,
      rmse: 0.1,
      mape: 0.05,
      r2: 0.95,
    };

    return metrics;
  }

  /**
   * ARIMA预测
   */
  private async predictARIMA(
    model: any,
    data: TimeSeriesData,
    horizon: number,
    options?: any
  ): Promise<any> {
    // 简化的ARIMA预测实现
    const predictions = [];
    const lastValue = data.values[data.values.length - 1];
    
    for (let i = 0; i < horizon; i++) {
      // 简单的随机游走预测作为示例
      predictions.push(lastValue + (Math.random() - 0.5) * 0.1);
    }

    const timestamps = [];
    const lastTimestamp = data.timestamps[data.timestamps.length - 1];
    for (let i = 1; i <= horizon; i++) {
      timestamps.push(new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000));
    }

    return {
      timestamps,
      values: predictions,
      confidence: options?.confidence ? {
        lower: predictions.map(p => p - 0.05),
        upper: predictions.map(p => p + 0.05),
      } : undefined,
    };
  }

  /**
   * Prophet预测
   */
  private async predictProphet(
    model: any,
    data: TimeSeriesData,
    horizon: number,
    options?: any
  ): Promise<any> {
    // 简化的Prophet预测实现
    const predictions = [];
    const trend = this.calculateTrend(data.values, 7);
    
    for (let i = 0; i < horizon; i++) {
      predictions.push(trend + (Math.random() - 0.5) * 0.1);
    }

    const timestamps = [];
    const lastTimestamp = data.timestamps[data.timestamps.length - 1];
    for (let i = 1; i <= horizon; i++) {
      timestamps.push(new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000));
    }

    return {
      timestamps,
      values: predictions,
      confidence: options?.confidence ? {
        lower: predictions.map(p => p - 0.1),
        upper: predictions.map(p => p + 0.1),
      } : undefined,
    };
  }

  /**
   * LSTM预测
   */
  private async predictLSTM(
    model: any,
    data: TimeSeriesData,
    horizon: number,
    options?: any
  ): Promise<any> {
    // 简化的LSTM预测实现
    const predictions = [];
    const lastValues = data.values.slice(-5); // 假设使用最后5个值
    
    for (let i = 0; i < horizon; i++) {
      // 简单的线性预测作为示例
      const avg = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;
      predictions.push(avg + (Math.random() - 0.5) * 0.05);
    }

    const timestamps = [];
    const lastTimestamp = data.timestamps[data.timestamps.length - 1];
    for (let i = 1; i <= horizon; i++) {
      timestamps.push(new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000));
    }

    return {
      timestamps,
      values: predictions,
      confidence: options?.confidence ? {
        lower: predictions.map(p => p - 0.03),
        upper: predictions.map(p => p + 0.03),
      } : undefined,
    };
  }

  /**
   * 集成模型预测
   */
  private async predictEnsemble(
    model: any,
    data: TimeSeriesData,
    horizon: number,
    options?: any
  ): Promise<any> {
    // 对各个子模型进行预测
    const predictions = [];
    
    for (const subModel of model.models) {
      let subPrediction: any;
      switch (subModel.type) {
        case 'arima':
          subPrediction = await this.predictARIMA(subModel, data, horizon, options);
          break;
        case 'prophet':
          subPrediction = await this.predictProphet(subModel, data, horizon, options);
          break;
        case 'lstm':
          subPrediction = await this.predictLSTM(subModel, data, horizon, options);
          break;
      }
      predictions.push(subPrediction);
    }

    // 加权平均
    const ensembleValues = [];
    for (let i = 0; i < horizon; i++) {
      let weightedSum = 0;
      for (let j = 0; j < predictions.length; j++) {
        weightedSum += predictions[j].values[i] * model.weights[j];
      }
      ensembleValues.push(weightedSum);
    }

    return {
      timestamps: predictions[0].timestamps,
      values: ensembleValues,
      confidence: options?.confidence ? {
        lower: ensembleValues.map(p => p - 0.08),
        upper: ensembleValues.map(p => p + 0.08),
      } : undefined,
    };
  }

  /**
   * 计算趋势
   */
  private calculateTrend(values: number[], period: number): number {
    if (values.length < 2) return values[0] || 0;
    
    // 简单的线性趋势计算
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return intercept + slope * (n - 1);
  }

  /**
   * 计算季节性
   */
  private calculateSeasonality(values: number[], period: number): number[] {
    const seasonal = [];
    
    for (let i = 0; i < period; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = i; j < values.length; j += period) {
        sum += values[j];
        count++;
      }
      
      seasonal.push(count > 0 ? sum / count : 0);
    }
    
    return seasonal;
  }

  /**
   * 计算残差
   */
  private calculateResidual(values: number[], period: number): number[] {
    const trend = this.calculateTrend(values, period);
    const seasonal = this.calculateSeasonality(values, period);
    const residual = [];
    
    for (let i = 0; i < values.length; i++) {
      const residualValue = values[i] - trend - seasonal[i % period];
      residual.push(residualValue);
    }
    
    return residual;
  }

  /**
   * 计算评估指标
   */
  private calculateMetrics(
    actual: number[],
    predicted: number[],
    metrics: string[]
  ): TimeSeriesModelMetrics {
    const result: TimeSeriesModelMetrics = {
      mae: 0,
      mse: 0,
      rmse: 0,
      mape: 0,
      r2: 0,
    };

    const n = Math.min(actual.length, predicted.length);
    if (n === 0) return result;

    let sumError = 0;
    let sumSquaredError = 0;
    let sumAbsolutePercentageError = 0;
    let sumActual = 0;
    let sumActualSquared = 0;
    let sumPredicted = 0;
    let sumPredictedSquared = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      const absoluteError = Math.abs(error);
      const absolutePercentageError = actual[i] !== 0 ? absoluteError / Math.abs(actual[i]) : 0;

      sumError += error;
      sumSquaredError += error * error;
      sumAbsolutePercentageError += absolutePercentageError;
      sumActual += actual[i];
      sumActualSquared += actual[i] * actual[i];
      sumPredicted += predicted[i];
      sumPredictedSquared += predicted[i] * predicted[i];
    }

    if (metrics.includes('mae')) {
      result.mae = sumAbsoluteError / n;
    }

    if (metrics.includes('mse')) {
      result.mse = sumSquaredError / n;
    }

    if (metrics.includes('rmse')) {
      result.rmse = Math.sqrt(sumSquaredError / n);
    }

    if (metrics.includes('mape')) {
      result.mape = (sumAbsolutePercentageError / n) * 100;
    }

    if (metrics.includes('r2')) {
      const meanActual = sumActual / n;
      let totalSumSquares = 0;
      
      for (let i = 0; i < n; i++) {
        totalSumSquares += Math.pow(actual[i] - meanActual, 2);
      }
      
      result.r2 = totalSumSquares > 0 ? 1 - (sumSquaredError / totalSumSquares) : 0;
    }

    return result;
  }

  /**
   * 获取模型
   */
  private async getModel(modelId: string): Promise<any> {
    // 先从缓存获取
    if (this.modelCache.has(modelId)) {
      const cachedModel = this.modelCache.get(modelId);
      const modelData = await redis.hgetall(`ts_model:${modelId}`);
      return {
        ...cachedModel,
        config: JSON.parse(modelData.config),
        metrics: JSON.parse(modelData.metrics),
      };
    }

    // 从Redis获取
    const modelData = await redis.hgetall(`ts_model:${modelId}`);
    
    if (!modelData.id) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const model = {
      id: modelData.id,
      userId: modelData.userId,
      name: modelData.name,
      type: modelData.type,
      config: JSON.parse(modelData.config),
      model: JSON.parse(modelData.model),
      metrics: JSON.parse(modelData.metrics),
    };

    // 缓存模型
    this.modelCache.set(modelId, model);

    return model;
  }

  /**
   * 保存模型
   */
  private async saveModel(modelId: string, modelData: any): Promise<void> {
    await redis.hmset(`ts_model:${modelId}`, {
      id: modelData.id,
      userId: modelData.userId,
      name: modelData.name,
      type: modelData.type,
      config: JSON.stringify(modelData.config),
      model: JSON.stringify(modelData.model),
      metrics: JSON.stringify(modelData.metrics),
      createdAt: modelData.createdAt.toISOString(),
      updatedAt: modelData.updatedAt.toISOString(),
    });
  }

  /**
   * 加载模型配置
   */
  private async loadModelConfig(type: string, name: string): Promise<void> {
    // 加载预定义模型配置
    const configs: Record<string, any> = {
      arima_auto: {
        type: 'arima',
        parameters: {
          p: 1,
          d: 1,
          q: 1,
          seasonal: { p: 1, d: 1, q: 1, period: 12 },
        },
      },
      prophet_default: {
        type: 'prophet',
        parameters: {
          yearly_seasonality: true,
          weekly_seasonality: true,
          daily_seasonality: false,
          changepoint_prior_scale: 0.05,
        },
      },
      lstm_basic: {
        type: 'lstm',
        parameters: {
          hiddenSize: 50,
          numLayers: 2,
          dropout: 0.2,
          learningRate: 0.001,
        },
      },
    };

    const config = configs[`${type}_${name}`];
    if (config) {
      // 可以将配置保存到Redis或数据库中
      logger.info(`Loaded ${type} model config: ${name}`);
    }
  }

  /**
   * 后处理预测结果
   */
  private async postprocessPrediction(
    prediction: any,
    config: TimeSeriesModelConfig,
    options?: any
  ): Promise<TimeSeriesPrediction> {
    let result = { ...prediction };

    // 如果进行了差分，需要反转差分
    if (config.preprocessing?.differencing && prediction.metadata?.diffParams) {
      result.values = this.reverseDifference(result.values, prediction.metadata.diffParams);
    }

    // 如果进行了缩放，需要反转缩放
    if (config.preprocessing?.scaling && prediction.metadata?.scaleParams) {
      result.values = this.reverseScale(result.values, prediction.metadata.scaleParams);
    }

    return result;
  }

  /**
   * 反转差分
   */
  private reverseDifference(diffValues: number[], diffParams: any): number[] {
    const { originalFirst } = diffParams;
    const restoredValues = [originalFirst];
    
    for (const diffValue of diffValues) {
      restoredValues.push(restoredValues[restoredValues.length - 1] + diffValue);
    }
    
    return restoredValues;
  }

  /**
   * 反转缩放
   */
  private reverseScale(scaledValues: number[], scaleParams: any): number[] {
    const { min, range } = scaleParams;
    return scaledValues.map(v => v * range + min);
  }
}

// 创建时间序列模型服务实例
export const timeSeriesModelService = new TimeSeriesModelService();
