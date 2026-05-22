export const MODEL_CONFIGS = {
  // 集成模型配置
  ensemble: {
    default: {
      type: 'stacking',
      basePredictors: ['arima', 'lstm', 'prophet'],
      metaLearner: 'gradient_boosting',
      diversityThreshold: 0.7,
      crossValidationFolds: 5,
      maxModels: 10
    },
    time_series: {
      type: 'bagging',
      basePredictors: ['arima', 'prophet', 'lstm'],
      diversityThreshold: 0.8,
      crossValidationFolds: 10
    },
    classification: {
      type: 'voting',
      basePredictors: ['random_forest', 'svm', 'neural_network'],
      voting: 'soft'
    }
  },

  // 预测模型配置
  prediction: {
    arima: {
      p: [1, 2, 3],
      d: [0, 1],
      q: [1, 2, 3],
      seasonal: true,
      period: 12
    },
    lstm: {
      units: [50, 100, 150],
      layers: [1, 2, 3],
      dropout: 0.2,
      epochs: 100,
      batch_size: 32
    },
    prophet: {
      yearly_seasonality: true,
      weekly_seasonality: true,
      daily_seasonality: false,
      changepoint_prior_scale: 0.05
    }
  },

  // 学习引擎配置
  learning: {
    feedbackWeight: 0.8,
    adaptationRate: 0.1,
    memoryDecayFactor: 0.95,
    explorationRate: 0.15,
    updateThreshold: 10,
    performanceWindow: 30
  },

  // AI服务配置
  ai: {
    openai: {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1
    },
    cache: {
      ttl: 300000, // 5分钟
      maxSize: 1000
    }
  }
};

export const TRAINING_PARAMS = {
  // 数据分割
  trainTestSplit: 0.8,
  validationSplit: 0.2,
  
  // 早停参数
  earlyStopping: {
    patience: 10,
    minDelta: 0.001,
    restoreBestWeights: true
  },
  
  // 优化参数
  optimizer: {
    type: 'adam',
    learningRate: 0.001,
    beta1: 0.9,
    beta2: 0.999,
    epsilon: 1e-8
  },
  
  // 正则化
  regularization: {
    l1: 0.01,
    l2: 0.01,
    dropout: 0.2
  }
};
