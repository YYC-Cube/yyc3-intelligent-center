// 导出核心引擎
export { EnsembleEngine } from './core/ensemble-engine';
export { PredictionEngine } from './core/prediction-engine';
export { LearningEngine } from './core/learning-engine';

// 导出服务
export { EnhancedRecommendationService } from './services/enhanced-recommendation';
export { UserBehaviorAnalyzer } from './services/user-behavior-analyzer';

// 导出模型
export { BasePredictor } from './models/base-predictor';

// 导出类型
export * from './types/ai-types';
export * from './types/prediction-types';
export * from './types/user-types';

// 导出配置
export { MODEL_CONFIGS, TRAINING_PARAMS } from './config/model-configs';

// 导出工具函数
export { DataPreprocessor } from './utils/data-preprocessor';
export { ModelEvaluator } from './utils/model-evaluator';
export { FeatureExtractor } from './utils/feature-extractor';
export { PerformanceMonitor } from './utils/performance-monitor';

// 创建默认实例
export const createAIEngine = () => ({
  ensemble: new EnsembleEngine(MODEL_CONFIGS.ensemble.default),
  prediction: new PredictionEngine(),
  learning: new LearningEngine(),
  recommendation: new EnhancedRecommendationService(),
  behavior: new UserBehaviorAnalyzer()
});
