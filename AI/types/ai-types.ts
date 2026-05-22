// 基础类型定义
	export interface BaseConfig {
	  id: string;
	  version: string;
	  timestamp: string;
	}
	// 集成配置
	export interface EnsembleConfig extends BaseConfig {
	  type: 'bagging' | 'boosting' | 'stacking' | 'voting' | 'blending';
	  basePredictors: string[];
	  metaLearner?: string;
	  diversityThreshold: number;
	  crossValidationFolds: number;
	  maxModels?: number;
	  selectionCriteria?: 'accuracy' | 'diversity' | 'balanced';
	}
	// 预测数据
	export interface PredictionData {
	  features: number[][];
	  targets: number[];
	  timestamps?: string[];
	  metadata?: Record<string, any>;
	  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	}
	// 预测结果
	export interface PredictionResult {
	  predictions: number[];
	  confidence: number;
	  metadata?: {
	    modelCount?: number;
	    ensembleType?: string;
	    timestamp?: string;
	    [key: string]: any;
	  };
	}
	// 训练结果
	export interface TrainingResult {
	  success: boolean;
	  accuracy: number;
	  loss: number;
	  metrics: Record<string, number>;
	  modelId: string;
	  duration?: number;
	  warnings?: string[];
	}
	// 模型类型
	export type ModelType = 'arima' | 'lstm' | 'prophet' | 'transformer' | 'linear' | 'forest';
	// 用户偏好
	export interface UserPreferences {
	  favoriteCategories: string[];
	  frequentlyUsedIntegrations: string[];
	  interactionHistory: Array<{
	    integrationId: string;
	    action: string;
	    timestamp: string;
	    satisfaction?: number;
	    context?: string;
	  }>;
	  businessGoals: string[];
	  learningStyle: 'visual' | 'textual' | 'interactive';
	  technicalLevel: 'beginner' | 'intermediate' | 'advanced';
	  industryInsights: {
	    sector: string;
	    companySize: string;
	    primaryChallenges: string[];
	  };
	}
	// AI分析结果
	export interface AIAnalysisResult {
	  intent: string;
	  keyRequirements: string[];
	  industryContext?: string;
	  technicalConstraints?: string[];
	  confidenceScore: number;
	  emotionalTone: 'urgent' | 'exploratory' | 'frustrated' | 'confident';
	  urgencyLevel: number;
	}
	// 推荐结果
	export interface RecommendationResult {
	  recommendations: any[];
	  confidenceScores: number[];
	  reasoning: string[];
	  adaptationPlan: string;
	}
	// 学习反馈
	export interface LearningFeedback {
	  userId: string;
	  interactionId: string;
	  satisfaction: number;
	  actualUsage: string[];
	  unexpectedBenefits?: string[];
	  issues?: string[];
	  timestamp: string;
	}
	// 性能指标
	export interface PerformanceMetrics {
	  accuracy: number;
	  precision: number;
	  recall: number;
	  f1Score: number;
	  auc?: number;
	  latency: number;
	  memoryUsage: number;
	  throughput: number;
	}