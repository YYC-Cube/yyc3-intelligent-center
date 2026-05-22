import { EnsembleEngine } from './ensemble-engine';
import { PredictionData, PredictionResult, UserPreferences } from '../types/ai-types';

/**
 * 预测引擎 - 负责处理各种预测任务
 */
export class PredictionEngine {
  private ensembleEngine: EnsembleEngine;
  private predictionCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5分钟

  constructor() {
    this.ensembleEngine = new EnsembleEngine({
      id: 'prediction_ensemble',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      type: 'stacking',
      basePredictors: ['arima', 'lstm', 'prophet', 'transformer'],
      metaLearner: 'gradient_boosting',
      diversityThreshold: 0.7,
      crossValidationFolds: 5
    });
  }

  /**
   * 时间序列预测
   * @param data 预测数据
   * @param horizon 预测范围
   * @param options 预测选项
   */
  async predictTimeSeries(
    data: PredictionData,
    horizon: number,
    options: {
      includeSeasonality?: boolean;
      confidenceInterval?: number;
      customModel?: string;
    } = {}
  ): Promise<PredictionResult & {
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality: boolean;
    anomalies: number[];
  }> {
    // 检查缓存
    const cacheKey = this.generateCacheKey(data, horizon, options);
    const cached = this.getFromCache<PredictionResult & {
      trend: 'increasing' | 'decreasing' | 'stable';
      seasonality: boolean;
      anomalies: number[];
    }>(cacheKey);
    if (cached) return cached;

    // 数据预处理
    const processedData = await this.preprocessTimeSeriesData(data, options);

    // 使用集成模型预测
    const prediction = await this.ensembleEngine.predictModel(processedData, horizon);

    // 分析趋势
    const trend = this.analyzeTrend(prediction.predictions);
    
    // 检测季节性
    const seasonality = this.detectSeasonality(processedData);
    
    // 检测异常
    const anomalies = this.detectAnomalies(prediction.predictions);

    const result = {
      ...prediction,
      trend,
      seasonality,
      anomalies
    };

    // 缓存结果
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * 数据预处理
   * @param data 原始数据
   * @param options 处理选项
   */
  private async preprocessTimeSeriesData(
    data: PredictionData,
    options: any
  ): Promise<PredictionData> {
    // 处理缺失值
    const filledTargets = this.fillMissingValues(data.targets);
    
    // 平滑处理
    const smoothedTargets = options.includeSeasonality ? 
      this.applySeasonalDecomposition(filledTargets) : 
      this.applyMovingAverage(filledTargets);

    return {
      ...data,
      targets: smoothedTargets
    };
  }

  /**
   * 填充缺失值
   * @param values 数据值
   */
  private fillMissingValues(values: (number | null)[]): number[] {
    return values.map((value, index) => {
      if (value !== null) return value;

      // 线性插值
      let prev: number | null = null;
      let next: number | null = null;
      
      // 寻找前一个有效值
      for (let i = index - 1; i >= 0; i--) {
        if (values[i] !== null) {
          prev = values[i] as number;
          break;
        }
      }
      
      // 寻找后一个有效值
      for (let i = index + 1; i < values.length; i++) {
        if (values[i] !== null) {
          next = values[i] as number;
          break;
        }
      }
      
      return prev !== null && next !== null ? (prev + next) / 2 : prev || next || 0;
    });
  }

  /**
   * 应用移动平均
   * @param values 数据值
   * @param windowSize 窗口大小
   */
  private applyMovingAverage(values: number[], windowSize = 3): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
      const window = values.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(avg);
    }
    
    return result;
  }

  /**
   * 应用季节性分解
   * @param values 数据值
   */
  private applySeasonalDecomposition(values: number[]): number[] {
    // 简化的季节性分解实现
    const result = [...values];
    
    // 这里可以实现更复杂的季节性分解算法
    // 例如使用STL分解或傅里叶变换
    
    return result;
  }

  /**
   * 分析趋势
   * @param predictions 预测结果
   */
  private analyzeTrend(predictions: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (predictions.length < 3) return 'stable';
    
    const first = predictions[0];
    const last = predictions[predictions.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * 检测季节性
   * @param data 预测数据
   */
  private detectSeasonality(data: PredictionData): boolean {
    // 简化的季节性检测逻辑
    // 由于PredictionData类型上没有frequency属性，我们返回默认值true
    // 在实际应用中，应该根据数据的特性来判断季节性
    return true;
  }

  /**
   * 检测异常
   * @param predictions 预测结果
   */
  private detectAnomalies(predictions: number[]): number[] {
    const anomalies: number[] = [];
    const mean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;
    const variance = predictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / predictions.length;
    const stdDev = Math.sqrt(variance);
    const threshold = 2 * stdDev;
    
    predictions.forEach((val, index) => {
      if (Math.abs(val - mean) > threshold) {
        anomalies.push(index);
      }
    });
    
    return anomalies;
  }

  /**
   * 生成缓存键
   * @param data 数据
   * @param horizon 预测范围
   * @param options 选项
   */
  private generateCacheKey(data: PredictionData, horizon: number, options: any): string {
    return JSON.stringify({
      dataHash: this.hashCode(JSON.stringify(data)),
      horizon,
      options
    });
  }

  /**
   * 简单的哈希函数
   * @param str 字符串
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }

  /**
   * 从缓存获取数据
   * @param key 缓存键
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.predictionCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.predictionCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 数据
   */
  private setCache(key: string, data: any): void {
    this.predictionCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // 清理过期缓存
    this.cleanupCache();
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    this.predictionCache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheExpiry) {
        this.predictionCache.delete(key);
      }
    });
  }
}