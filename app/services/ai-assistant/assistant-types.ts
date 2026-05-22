/**
 * AI助手前端接口定义
 * 用于React Context的状态管理
 */

// AI助手状态接口
export interface AssistantState {
  currentSession: AssistantSession | null;
  sessions: AssistantSession[];
  isLoading: boolean;
  isProcessing: boolean; // 兼容旧代码
  error: string | null;
  config: AssistantConfig;
}

// AI助手配置
export interface AssistantConfig {
  model: string;
  provider?: string; // openai | anthropic | gemini | local
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

// AI消息
export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
}

// AI会话
export interface AssistantSession {
  id: string;
  title: string;
  messages: AssistantMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// 事件类型
export type AssistantEventType = 
  | 'messageSent'
  | 'responseReceived'
  | 'processingStarted'
  | 'requestCancelled'
  | 'error'
  | 'sessionCreated'
  | 'sessionSwitched'
  | 'sessionDeleted'
  | 'configChanged'
  | 'sessionsLoaded';

// 事件监听器类型
export type EventListener = (...args: any[]) => void;

/**
 * 前端AI助手服务接口（用于Context）
 * 包装实际的数据库服务，添加事件系统和状态管理
 */
export interface IAssistantService {
  // 状态管理
  getState(): AssistantState;
  
  // 事件系统
  on(event: AssistantEventType, listener: EventListener): () => void;
  off(event: AssistantEventType, listener: EventListener): void;
  removeAllListeners(): void;
  
  // 会话管理
  createSession(title?: string): AssistantSession;
  switchSession(sessionId: string): AssistantSession | null;
  deleteSession(sessionId: string): boolean;
  
  // 消息操作
  sendMessage(content: string): Promise<AssistantMessage | null>;
  cancelRequest(): void;
  
  // 配置管理
  configureAssistant(config: Partial<AssistantConfig>): void;
  
  // 持久化
  loadSessionsFromStorage(): void;
  saveSessionsToStorage(): void;
  
  // 生命周期
  dispose(): void;
}
