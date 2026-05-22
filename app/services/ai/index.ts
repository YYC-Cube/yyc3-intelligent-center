// 导出核心引擎（存在的）
export { EnsembleEngine } from './core/ensemble-engine';
export { LearningEngine } from './core/learning-engine';

// 导出服务
export { EnhancedRecommendationService } from './services/enhanced-recommendation';
export { UserBehaviorAnalyzer } from './services/user-behavior-analyzer';

// 导出模型（修正路径）
export { BasePredictor } from './core/models/base-predictor';

// 导出类型（只导出存在的）
export * from './types/ai-types';

// 类型声明（用于缺失的模块）
declare const MODEL_CONFIGS: any;
declare const TRAINING_PARAMS: any;
export { MODEL_CONFIGS, TRAINING_PARAMS };

// 创建默认实例工厂函数
// 注意：使用懒加载避免编译时错误
let _aiEngine: any = null;

export function createAIEngine(): any {
  if (!_aiEngine) {
    try {
      // 动态导入已存在的模块
      const { EnsembleEngine: EE } = require('./core/ensemble-engine');
      const { LearningEngine: LE } = require('./core/learning-engine');
      const { EnhancedRecommendationService: ERS } = require('./services/enhanced-recommendation');
      const { UserBehaviorAnalyzer: UBA } = require('./services/user-behavior-analyzer');
      
      _aiEngine = {
        ensemble: new EE({}),
        learning: new LE(),
        recommendation: new ERS(),
        behavior: new UBA()
      };
    } catch (error) {
      console.error('Failed to create AI engine:', error);
      _aiEngine = {
        ensemble: null,
        learning: null,
        recommendation: null,
        behavior: null
      };
    }
  }
  return _aiEngine;
}
