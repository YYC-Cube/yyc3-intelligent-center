API接口升级：
```plaintext
// 路径: app/api/recommend/route.ts
import { EnhancedRecommendationService, 
UserPreferences } from "@/app/services/
enhanced-recommendation";

export async function POST(req: Request) {
  try {
    const { messages, userPreferences } = await 
    req.json();
    const recommendationService = new 
    EnhancedRecommendationService();
    
    // 分析用户需求
    const userNeeds = await recommendationService.
    analyzeUserNeeds(messages);
    
    // 获取用户偏好数据 (实际应用中从数据库或缓存获取)
    const preferences: UserPreferences = 
    userPreferences || {
      favoriteCategories: [],
      frequentlyUsedIntegrations: [],
      interactionHistory: [],
      businessGoals: []
    };
    
    // 生成个性化推荐
    const recommendations = await 
    recommendationService.
    generatePersonalizedRecommendations(
      integrations, preferences, userNeeds
    );
    
    return Response.json({ recommendations, 
    analysis: userNeeds });
  } catch (error) {
    console.error("推荐生成失败:", error);
    return Response.json({ recommendations: [], 
    error: "生成推荐时出错" }, { status: 500 });
  }
}

```
依赖更新：
- 在package.json中添加： "@tensorflow/tfjs": "^4.17.0" (用于高级机器学习功能) 2. 智能集成配置建议
    实现方案：
```plaintext
// 路径: app/components/
intelligent-configuration-assistant.tsx
import { useState, useEffect } from "react";
import { useEncryption } from "@/app/context/
encryption-context";
import { Integration } from "@/app/data/
integrations";

interface IntelligentConfigAssistantProps {
  integration: Integration;
  onConfigGenerated: (config: any) => void;
}

export function IntelligentConfigAssistant({ 
integration, onConfigGenerated }: 
IntelligentConfigAssistantProps) {
  const [isLoading, setIsLoading] = useState
  (false);
  const [recommendations, setRecommendations] = 
  useState<string[]>([]);
  const [suggestedConfig, setSuggestedConfig] = 
  useState<any>(null);
  const { encrypt } = useEncryption();

  // 生成配置建议
  const generateConfigSuggestions = async () => {
    setIsLoading(true);
    try {
      // 调用后端API获取配置建议
      const response = await fetch('/api/
      configure/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/
        json' },
        body: JSON.stringify({ integrationId: 
        integration.id })
      });
      const data = await response.json();
      setRecommendations(data.recommendations || 
      []);
      setSuggestedConfig(data.suggestedConfig || 
      null);
      
      // 如果有建议的配置，加密后传递给父组件
      if (data.suggestedConfig) {
        const encryptedConfig = await encrypt
        (JSON.stringify(data.suggestedConfig));
        onConfigGenerated({ encryptedConfig });
      }
    } catch (error) {
      console.error("生成配置建议失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 当集成应用信息加载完成后，自动生成配置建议
    if (integration && integration.id) {
      generateConfigSuggestions();
    }
  }, [integration]);

  // 组件UI实现...
}

```
## 二、用户体验优化
### 当前现状
系统已有基本的用户界面和交互，但在复杂集成场景中的引导和帮助信息不够详细。
### 改进建议 1. 复杂集成场景引导
实现方案：
```plaintext
// 路径: app/components/integration-wizard.tsx
import { useState } from "react";
import { Steps } from "@/components/ui/steps";
import { Card, CardContent, CardDescription, 
CardFooter, CardHeader, CardTitle } from "@/
components/ui/card";
import { Button } from "@/components/ui/button";

// 定义集成向导步骤类型
export type WizardStep = {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{ onComplete: () 
  => void; data: any; setData: React.
  Dispatch<React.SetStateAction<any>> }>;
};

interface IntegrationWizardProps {
  steps: WizardStep[];
  onComplete: (data: any) => void;
  initialData?: any;
}

export function IntegrationWizard({ steps, 
onComplete, initialData = {} }: 
IntegrationWizardProps) {
  const [currentStep, setCurrentStep] = useState
  (0);
  const [formData, setFormData] = useState
  (initialData);
  const [stepStatus, setStepStatus] = 
  useState<Array<'pending' | 'completed' | 
  'error'>>(
    Array(steps.length).fill('pending')
  );

  // 处理下一步
  const handleNext = () => {
    setStepStatus(prev => {
      const newStatus = [...prev];
      newStatus[currentStep] = 'completed';
      return newStatus;
    });
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  // 处理上一步
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 当前步骤组件
  const CurrentStepComponent = steps[currentStep].
  component;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>集成配置向导</CardTitle>
        <CardDescription>请按照步骤完成集成配置，确保
        所有必填项都已填写</CardDescription>
      </CardHeader>
      <CardContent>
        <Steps value={currentStep} 
        className="mb-8">
          {steps.map((step, index) => (
            <Steps.Item key={step.id} title={step.
            title} description={step.
            description} />
          ))}
        </Steps>
        
        <CurrentStepComponent
          onComplete={handleNext}
          data={formData}
          setData={setFormData}
        />
      </CardContent>
      <CardFooter className="flex 
      justify-between">
        {currentStep > 0 && (
          <Button variant="secondary" onClick=
          {handleBack}>
            上一步
          </Button>
        )}
        <Button onClick={handleNext}>
          {currentStep < steps.length - 1 ? '下一
          步' : '完成'}
        </Button>
      </CardFooter>
    </Card>
  );
}

```
创建详细的集成步骤组件：
```plaintext
// 路径: app/components/integration-steps/
basic-info-step.tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/
textarea";
import { Select, SelectContent, SelectItem, 
SelectTrigger, SelectValue } from "@/components/
ui/select";
import { Tooltip, TooltipContent, 
TooltipProvider, TooltipTrigger } from "@/
components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface BasicInfoStepProps {
  onComplete: () => void;
  data: any;
  setData: React.Dispatch<React.
  SetStateAction<any>>;
}

export function BasicInfoStep({ onComplete, data, 
setData }: BasicInfoStepProps) {
  // 处理表单变化
  const handleChange = (field: string, value: 
  any) => {
    setData(prev => ({ ...prev, [field]: 
    value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center">
          <Label htmlFor="integration-name">集成名
          称</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="ml-2 h-4 
                w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>请输入集成应用的名称，将用于在系统中
                标识此集成</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="integration-name"
          value={data.name || ''}
          onChange={(e) => handleChange('name', e.
          target.value)}
          placeholder="例如：客户关系管理系统"
          required
        />
      </div>

      {/* 更多表单项... */}

      <div className="bg-blue-50 p-4 rounded-md 
      border border-blue-200">
        <h4 className="font-medium text-blue-800 
        mb-2">配置提示</h4>
        <ul className="list-disc pl-5 text-sm 
        text-blue-700 space-y-1">
          <li>请确保输入的集成名称与实际应用名称一致，以
          便于识别</li>
          <li>描述信息应清晰说明此集成的主要功能和用途</
          li>
          <li>选择正确的类别有助于系统为您提供更准确的推
          荐和配置建议</li>
        </ul>
      </div>

      <Button onClick={onComplete} 
      className="w-full" disabled={!data.name}>继
      续</Button>
    </div>
  );
}

```
## 三、性能优化
### 当前现状
系统已有一些基本的性能优化措施，如搜索防抖，但在大数据量和高并发场景下需要进一步优化。
### 改进建议 1. 大数据量处理优化
实现方案：
```plaintext
// 路径: app/services/caching-service.ts
import type { Integration } from "@/app/data/
integrations";

// 缓存服务类
export class CachingService {
  private cache: Map<string, { data: any; 
  timestamp: number; ttl: number }> = new Map();
  private static instance: CachingService;
  
  // 单例模式
  static getInstance(): CachingService {
    if (!CachingService.instance) {
      CachingService.instance = new CachingService
      ();
    }
    return CachingService.instance;
  }

  // 设置缓存
  set(key: string, data: any, ttl: number = 
  3600000): void { // 默认1小时
    this.cache.set(key, { data, timestamp: Date.
    now(), ttl });
    // 清理过期缓存
    this.cleanupExpiredCache();
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // 删除缓存
  delete(key: string): void {
    this.cache.delete(key);
  }

  // 清理过期缓存
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries
    ()) {
      if (now > item.timestamp + item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

```
优化现有筛选逻辑：
```plaintext
// 路径: app/hooks/use-optimized-filter.ts
import { useMemo, useState, useEffect, 
useCallback } from "react";
import type { Integration } from "@/app/data/
integrations";
import { CachingService } from "@/app/services/
caching-service";

// 防抖Hook
export function useDebounce<T>(value: T, delay: 
number): T {
  const [debouncedValue, setDebouncedValue] = 
  useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 高级筛选选项
export interface FilterOptions {
  category: string;
  subcategory?: string;
  searchQuery: string;
  priceType?: "free" | "paid" | "freemium";
  rating?: number;
  tags?: string[];
  sortBy?: "name" | "rating" | "installCount" | 
  "releaseDate";
  sortOrder?: "asc" | "desc";
  featured?: boolean;
  new?: boolean;
  popular?: boolean;
}

export function useOptimizedFilter(integrations: 
Integration[], options: FilterOptions) {
  const [filteredIntegrations, 
  setFilteredIntegrations] = useState<Integration
  []>([]);
  const [isLoading, setIsLoading] = useState
  (false);
  const cacheService = CachingService.getInstance
  ();
  
  // 防抖搜索查询
  const debouncedSearchQuery = useDebounce
  (options.searchQuery, 300);
  
  // 创建缓存键
  const createCacheKey = useCallback(() => {
    return JSON.stringify({
      category: options.category,
      subcategory: options.subcategory,
      searchQuery: debouncedSearchQuery,
      priceType: options.priceType,
      rating: options.rating,
      tags: options.tags,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      featured: options.featured,
      new: options.new,
      popular: options.popular,
      integrationsLength: integrations.length
    });
  }, [options, debouncedSearchQuery, integrations.
  length]);

  // 优化的筛选逻辑
  useEffect(() => {
    const filterIntegrations = async () => {
      setIsLoading(true);
      const cacheKey = createCacheKey();
      
      // 检查缓存
      const cachedResult = cacheService.
      get<Integration[]>(cacheKey);
      if (cachedResult) {
        setFilteredIntegrations(cachedResult);
        setIsLoading(false);
        return;
      }

      // 使用requestAnimationFrame延迟执行以避免UI阻
      塞
      requestAnimationFrame(() => {
        let result = [...integrations];

        // 使用Web Worker进行大数据量筛选（如果可用）
        if (typeof window !== 'undefined' && 
        window.Worker && integrations.length > 
        1000) {
          // 创建Web Worker进行并行筛选
          const worker = new Worker('/filter.
          worker.js');
          worker.postMessage({
            integrations: result,
            options: {
              ...options,
              searchQuery: debouncedSearchQuery
            }
          });
          
          worker.onmessage = (e) => {
            const filteredData = e.data.result;
            cacheService.set(cacheKey, 
            filteredData, 300000); // 缓存5分钟
            setFilteredIntegrations(filteredData);
            setIsLoading(false);
            worker.terminate();
          };
          
          worker.onerror = () => {
            // 降级到主线程筛选
            result = this.performFiltering
            (result);
            cacheService.set(cacheKey, result, 
            300000);
            setFilteredIntegrations(result);
            setIsLoading(false);
            worker.terminate();
          };
        } else {
          // 主线程筛选
          result = this.performFiltering(result);
          cacheService.set(cacheKey, result, 
          300000);
          setFilteredIntegrations(result);
          setIsLoading(false);
        }
      });
    };

    filterIntegrations();
  }, [integrations, options, 
  debouncedSearchQuery, createCacheKey]);

  // 实际执行筛选的方法
  const performFiltering = useCallback((result: 
  Integration[]) => {
    // 分类筛选
    if (options.category !== "全部分类") {
      result = result.filter((integration) => 
      integration.category === options.category);
    }

    // 其他筛选逻辑...

    return result;
  }, [options]);

  return { filteredIntegrations, isLoading };
}

```
## 四、测试覆盖率提升
### 当前现状
项目使用Jest作为测试框架，但测试文件相对较少，覆盖率不足。
### 改进建议 1. 增加单元测试和集成测试
实现方案：
创建加密服务的单元测试：
```plaintext
// 路径: tests/services/encryption.test.ts
import { 
  deriveKey, 
  encryptData, 
  decryptData, 
  generateSalt, 
  generateIV,
  isEncryptionSupported 
} from "@/app/services/encryption";

describe("Encryption Service", () => {
  // 模拟浏览器加密API
  beforeAll(() => {
    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: {
          importKey: jest.fn(),
          deriveKey: jest.fn(),
          encrypt: jest.fn(),
          decrypt: jest.fn()
        },
        getRandomValues: jest.fn().
        mockImplementation((buffer) => {
          return new Uint8Array(buffer.length).
          fill(1);
        })
      },
      writable: true
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deriveKey", () => {
    it("should derive a key from password and 
    salt successfully", async () => {
      const mockKey = {} as CryptoKey;
      (window.crypto.subtle.importKey as jest.
      Mock).mockResolvedValue({});
      (window.crypto.subtle.deriveKey as jest.
      Mock).mockResolvedValue(mockKey);

      const password = "testPassword123";
      const salt = new Uint8Array(16).fill(0);
      const result = await deriveKey(password, 
      salt);

      expect(result).toBe(mockKey);
      expect(window.crypto.subtle.importKey).
      toHaveBeenCalled();
      expect(window.crypto.subtle.deriveKey).
      toHaveBeenCalled();
    });

    it("should handle errors during key 
    derivation", async () => {
      (window.crypto.subtle.importKey as jest.
      Mock).mockRejectedValue(new Error("Import 
      failed"));

      const password = "testPassword123";
      const salt = new Uint8Array(16).fill(0);

      await expect(deriveKey(password, salt)).
      rejects.toThrow("Import failed");
    });
  });

  // 更多测试用例...
});

```
创建API路由的集成测试：
```plaintext
// 路径: tests/api/recommend.test.ts
import { NextRequest } from "next/server";
import { POST } from "@/app/api/recommend/route";
import { openai } from "@ai-sdk/openai";

// Mock AI SDK
jest.mock("@ai-sdk/openai");
const mockOpenai = openai as jest.
MockedFunction<typeof openai>;
jest.mock("ai", () => ({
  generateText: jest.fn()
}));
import { generateText } from "ai";
const mockGenerateText = generateText as jest.
MockedFunction<typeof generateText>;

// Mock integrations data
jest.mock("@/app/data/integrations", () => ({
  integrations: [
    { id: "1", name: "数据分析工具", description: "
    强大的数据分析平台", category: "数据分析" },
    { id: "2", name: "营销自动化", description: "自
    动化营销流程", category: "营销工具" }
  ]
}));

describe("Recommend API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenai.mockReturnValue({} as any);
  });

  it("should return recommendations based on user 
  messages", async () => {
    // 设置模拟返回值
    mockGenerateText.mockResolvedValue({
      text: "数据分析,营销,自动化"
    });

    // 创建模拟请求
    const request = new NextRequest("http://
    localhost/api/recommend", {
      method: "POST",
      body: JSON.stringify({ messages: ["我需要数据
      分析和营销工具"] })
    });

    // 调用API
    const response = await POST(request);
    const data = await response.json();

    // 验证结果
    expect(response.status).toBe(200);
    expect(data.recommendations).toHaveLength(2);
    expect(mockGenerateText).toHaveBeenCalledWith
    (expect.objectContaining({
      model: expect.any(Object),
      prompt: expect.stringContaining("分析以下对话
      内容")
    }));
  });

  it("should handle errors gracefully", async () 
  => {
    // 模拟错误
    mockGenerateText.mockRejectedValue(new Error
    ("AI service unavailable"));

    const request = new NextRequest("http://
    localhost/api/recommend", {
      method: "POST",
      body: JSON.stringify({ messages: ["我需要数据
      分析工具"] })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.recommendations).toEqual([]);
  });
});

```
配置测试覆盖率报告：
```plaintext
// 路径: jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load 
  next.config.js and .env files in your test 
  environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // 配置测试覆盖率
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/page.tsx',
    '!app/**/_*.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 
  'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

export default createJestConfig(config)

```
## 五、安全性增强
### 当前现状
系统已实现端到端加密功能，使用Web Crypto API进行数据加密和解密。
### 改进建议 1. 完善数据安全和隐私保护机制
实现方案：
```plaintext
// 路径: app/services/security-audit.ts
import { useAuth } from "@/app/context/
auth-context";

export type AuditLogLevel = 'info' | 'warning' | 
'error' | 'critical';

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  userId: string | null;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  level: AuditLogLevel;
  success: boolean;
};

// 安全审计服务
export class SecurityAuditService {
  // 记录安全事件
  static async logEvent(
    action: string,
    resource: string,
    details: Record<string, any>,
    level: AuditLogLevel = 'info',
    success: boolean = true,
    request?: Request
  ): Promise<void> {
    try {
      const { user } = useAuth();
      const userId = user?.id || null;
      
      // 获取IP地址和用户代理
      let ipAddress = 'unknown';
      let userAgent = 'unknown';
      
      if (request) {
        // 从请求头获取IP和用户代理
        ipAddress = request.headers.get
        ('x-forwarded-for') || 
                    request.headers.get
                    ('x-real-ip') || 'unknown';
        userAgent = request.headers.get
        ('user-agent') || 'unknown';
      }
      
      const logEntry: AuditLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId,
        action,
        resource,
        details: this.sanitizeDetails
        (details), // 清理敏感信息
        ipAddress,
        userAgent,
        level,
        success
      };
      
      // 发送日志到服务器或存储
      await this.sendLog(logEntry);
      
      // 对于严重安全事件，触发实时警报
      if (level === 'critical' || level === 
      'error') {
        await this.triggerAlert(logEntry);
      }
    } catch (error) {
      console.error("记录安全日志失败:", error);
      // 即使日志记录失败，也不能影响主流程
    }
  }
  
  // 清理敏感信息
  private static sanitizeDetails(details: 
  Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 
    'apiKey', 'secret', 'creditCard', 'auth', 
    'key'];
    const sanitizedDetails = { ...details };
    
    // 递归清理所有敏感键
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === 
      null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject
        (item));
      }
      
      const result: Record<string, any> = {};
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => 
        lowerKey.includes(sensitive))) {
          result[key] = '******';
        } else {
          result[key] = sanitizeObject(obj[key]);
        }
      }
      return result;
    };
    
    return sanitizeObject(sanitizedDetails);
  }
  
  // 发送日志到服务器
  private static async sendLog(logEntry: 
  AuditLogEntry): Promise<void> {
    try {
      // 在实际应用中，这里会发送日志到后端API
      console.log("Security log:", logEntry);
      
      // 模拟API调用
      // await fetch('/api/security/log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 
      'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
    } catch (error) {
      console.error("发送安全日志失败:", error);
      // 降级存储：在本地存储失败的日志，稍后重试
      this.storeFailedLogLocally(logEntry);
    }
  }
  
  // 本地存储失败的日志
  private static storeFailedLogLocally(logEntry: 
  AuditLogEntry): void {
    try {
      const failedLogs = JSON.parse(localStorage.
      getItem('failedSecurityLogs') || '[]');
      failedLogs.push(logEntry);
      // 限制存储的日志数量
      if (failedLogs.length > 100) {
        failedLogs.splice(0, failedLogs.length - 
        100);
      }
      localStorage.setItem('failedSecurityLogs', 
      JSON.stringify(failedLogs));
    } catch (error) {
      console.error("存储失败日志到本地失败:", 
      error);
    }
  }
  
  // 触发安全警报
  private static async triggerAlert(logEntry: 
  AuditLogEntry): Promise<void> {
    // 在实际应用中，这里会触发警报系统
    console.warn("Security alert triggered:", 
    logEntry);
  }
}

```
增强加密上下文安全性：
```plaintext
// 路径: app/context/encryption-context.tsx
import { SecurityAuditService } from "@/app/
services/security-audit";

// 增强的加密上下文提供者
// ...现有代码...

// 设置加密
const setupEncryption = useCallback(
  async (password: string, hint?: string): 
  Promise<boolean> => {
    if (!isAuthenticated || !user || 
    !isSupported) {
      SecurityAuditService.logEvent(
        'encryption_setup_attempt',
        'user_data',
        { status: 'failed', reason: 
        'not_authenticated_or_unsupported' },
        'warning',
        false
      );
      
      toast({
        title: "设置加密失败",
        description: "请先登录或使用支持的浏览器",
        variant: "destructive",
      });
      return false;
    }

    try {
      setEncryptionStatus("initializing");

      // 生成密钥包
      const keyPackage = await generateKeyPackage
      (password);

      // 保存密钥包
      saveKeyPackage(user.id, keyPackage);

      // 从密码派生密钥
      const salt = Uint8Array.from(atob
      (keyPackage.salt), (c) => c.charCodeAt(0));
      const key = await deriveKey(password, salt);
      setEncryptionKey(key);

      // 更新加密设置
      const newSettings: EncryptionSettings = {
        ...encryptionSettings,
        enabled: true,
        passwordHint: hint || "",
        lastChanged: new Date().toISOString()
      };
      setEncryptionSettings(newSettings);
      saveUserEncryptionSettings(user.id, 
      newSettings);

      setEncryptionStatus("enabled");

      // 记录安全事件
      SecurityAuditService.logEvent(
        'encryption_enabled',
        'user_data',
        { status: 'success' },
        'info',
        true
      );

      toast({
        title: "加密已启用",
        description: "您的数据现在将使用端到端加密进行
        保护",
      });

      return true;
    } catch (error) {
      console.error("设置加密失败:", error);
      setEncryptionStatus("error");
      
      // 记录安全事件
      SecurityAuditService.logEvent(
        'encryption_setup_failed',
        'user_data',
        { error: String(error) },
        'error',
        false
      );

      toast({
        title: "设置加密失败",
        description: "无法设置加密，请稍后重试",
        variant: "destructive",
      });

      return false;
    }
  },
  [isAuthenticated, user, isSupported, 
  encryptionSettings,toast],
)
