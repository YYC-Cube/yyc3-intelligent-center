// 共享类型定义

// 集成类型枚举
export enum IntegrationType {
  SDK = 'sdk',
  API = 'api',
  PLUGIN = 'plugin',
  SERVICE = 'service',
}

// 集成分类枚举
export enum IntegrationCategory {
  CUSTOMER_SERVICE = 'customer_service',
  SPEECH = 'speech',
  NLP = 'nlp',
  VISION = 'vision',
  KNOWLEDGE = 'knowledge',
  SECURITY = 'security',
  DEVOPS = 'devops',
  OTHER = 'other',
}

// 定价计划接口
export interface PricingPlan {
  name: string;
  price: number;
  unit?: string;
  features: string[];
}

// 定价信息接口
export interface Pricing {
  free: boolean;
  plans: PricingPlan[];
}

// 集成项接口
export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory | string;
  icon: string;
  logo: string;
  version: string;
  isOfficial: boolean;
  isFeatured: boolean;
  isNew: boolean;
  compatibilityScore: number;
  rating: number;
  reviews: number;
  tags: string[];
  features: string[];
  installationSteps: string[];
  documentationUrl: string;
  supportUrl: string;
  pricing: Pricing;
  createdAt: string;
  updatedAt: string;
  dependencies: string[];
  integrationType: IntegrationType | string;
  isFavorite?: boolean;
}

// 用户接口
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  token?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

// API响应接口
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页数据接口
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 分页API响应接口
export interface PaginatedApiResponse<T> extends ApiResponse<PaginatedData<T>> {
  // 继承ApiResponse的所有属性
}

// 安装配置接口
export interface InstallationConfig {
  [key: string]: any;
}

// 安装结果接口
export interface InstallationResult {
  integrationId: string;
  integrationName: string;
  status: 'installed' | 'failed' | 'pending';
  installationDate: string;
  configuration: InstallationConfig;
  error?: string;
}

// 系统健康检查接口
export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  version: string;
  timestamp: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  components?: {
    [key: string]: {
      status: 'UP' | 'DOWN' | 'DEGRADED';
      details?: any;
    };
  };
}

// 管理员仪表盘数据接口
export interface DashboardData {
  totalUsers: number;
  activeUsers: number;
  totalIntegrations: number;
  activeIntegrations: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  recentActivities: Activity[];
}

// 活动日志接口
export interface Activity {
  id: string;
  type: 'install' | 'register' | 'update' | 'delete' | 'login' | 'logout';
  user?: string;
  integration?: string;
  time: string;
  details?: any;
}

// 版本信息接口
export interface VersionInfo {
  version: string;
  buildDate: string;
  commitHash?: string;
  environment?: 'development' | 'staging' | 'production';
  dependencies?: { name: string; version: string }[];
}

// 错误日志接口
export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  stack?: string;
  context?: any;
  userId?: string;
  endpoint?: string;
  method?: string;
}

// 环境变量接口
export interface EnvVariable {
  key: string;
  value: string;
  required: boolean;
  description: string;
  secure: boolean;
  status: 'valid' | 'invalid' | 'missing';
}

// 搜索参数接口
export interface SearchParams {
  query?: string;
  category?: string;
  featured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}