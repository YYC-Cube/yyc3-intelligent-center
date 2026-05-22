import { 
  mockDataService,
  mockUsers,
  mockAiModels,
  mockConversations,
  mockMessages,
  mockUserPreferences,
  mockApiKeys,
  mockUsageStats
} from "./mock-data"

// 用户类型
export type User = {
  id: number
  email: string
  name: string
  created_at: Date
  updated_at: Date
}

// AI模型类型
export type AiModel = {
  id: number
  name: string
  provider: string
  model_id: string
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// 对话会话类型
export type Conversation = {
  id: number
  user_id: number
  title: string
  model_id: number | null
  system_prompt: string | null
  is_pinned: boolean
  created_at: Date
  updated_at: Date
}

// 消息类型
export type Message = {
  id: number
  conversation_id: number
  role: "user" | "assistant" | "system"
  content: string
  tokens_used: number | null
  created_at: Date
}

// 用户偏好设置类型
export type UserPreference = {
  user_id: number
  default_model_id: number | null
  default_system_prompt: string | null
  temperature: number
  max_tokens: number
  theme: string
  language: string
  created_at: Date
  updated_at: Date
}

// 用户数据访问对象
export const userDao = {
  // 创建用户
  async createUser(email: string, name: string): Promise<User> {
    const newUser: User = {
      id: mockUsers.length + 1,
      email,
      name,
      created_at: new Date(),
      updated_at: new Date()
    }
    mockUsers.push(newUser)
    return newUser
  },

  // 根据ID获取用户
  async getUserById(id: number): Promise<User | null> {
    return mockDataService.getUser(id) || null
  },

  // 根据邮箱获取用户
  async getUserByEmail(email: string): Promise<User | null> {
    return mockDataService.getUserByEmail(email) || null
  },
}

// AI模型数据访问对象
export const aiModelDao = {
  // 创建AI模型
  async createModel(model: Omit<AiModel, "id" | "created_at" | "updated_at">): Promise<AiModel> {
    const newModel: AiModel = {
      ...model,
      id: mockAiModels.length + 1,
      created_at: new Date(),
      updated_at: new Date()
    }
    mockAiModels.push(newModel)
    return newModel
  },

  // 获取所有活跃的AI模型
  async getActiveModels(): Promise<AiModel[]> {
    return mockDataService.getActiveModels()
  },

  // 根据ID获取AI模型
  async getModelById(id: number): Promise<AiModel | null> {
    return mockDataService.getModelById(id) || null
  },
}

// 对话会话数据访问对象
export const conversationDao = {
  // 创建对话会话
  async createConversation(
    conversation: Omit<Conversation, "id" | "created_at" | "updated_at">,
  ): Promise<Conversation> {
    const newConversation: Conversation = {
      ...conversation,
      id: mockConversations.length + 1,
      created_at: new Date(),
      updated_at: new Date()
    }
    mockConversations.push(newConversation)
    return newConversation
  },

  // 获取用户的所有对话会话
  async getUserConversations(userId: number): Promise<Conversation[]> {
    return mockDataService.getUserConversations(userId)
  },

  // 根据ID获取对话会话
  async getConversationById(id: number): Promise<Conversation | null> {
    return mockDataService.getConversationById(id) || null
  },

  // 更新对话会话
  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const conversation = mockConversations.find(c => c.id === id)
    if (!conversation) throw new Error(`对话不存在: ${id}`)
    
    Object.assign(conversation, updates)
    conversation.updated_at = new Date()
    return conversation
  },

  // 删除对话会话
  async deleteConversation(id: number): Promise<boolean> {
    const index = mockConversations.findIndex(c => c.id === id)
    if (index === -1) return false
    
    mockConversations.splice(index, 1)
    // 同时删除相关消息
    if (mockMessages[id]) {
      delete mockMessages[id]
    }
    return true
  },
}

// 消息数据访问对象
export const messageDao = {
  // 创建消息
  async createMessage(message: Omit<Message, "id" | "created_at">): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: Object.values(mockMessages).flat().length + 1,
      created_at: new Date()
    }
    
    if (!mockMessages[message.conversation_id]) {
      mockMessages[message.conversation_id] = []
    }
    mockMessages[message.conversation_id].push(newMessage)
    return newMessage
  },

  // 获取对话会话的所有消息
  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return mockMessages[conversationId] || []
  },
}

// 用户偏好设置数据访问对象
export const userPreferenceDao = {
  // 获取用户偏好设置
  async getUserPreference(userId: number): Promise<UserPreference | null> {
    return mockUserPreferences[userId] || null
  },

  // 创建或更新用户偏好设置
  async upsertUserPreference(preference: Partial<UserPreference> & { user_id: number }): Promise<UserPreference> {
    const now = new Date()
    const existingPreference = mockUserPreferences[preference.user_id]
    
    if (existingPreference) {
      // 更新现有偏好
      const updatedPreference: UserPreference = {
        ...existingPreference,
        ...preference,
        updated_at: now
      }
      mockUserPreferences[preference.user_id] = updatedPreference
      return updatedPreference
    } else {
      // 创建新偏好
      const newPreference: UserPreference = {
        default_model_id: null,
        default_system_prompt: null,
        temperature: 0.7,
        max_tokens: 4096,
        theme: "light",
        language: "en",
        created_at: now,
        updated_at: now,
        ...preference
      }
      mockUserPreferences[preference.user_id] = newPreference
      return newPreference
    }
  },
}

// API密钥数据访问对象
export const apiKeyDao = {
  // 获取用户的API密钥
  async getUserApiKeys(userId: number): Promise<{provider: string, api_key: string}[]> {
    const keys: {provider: string, api_key: string}[] = []
    Object.entries(mockApiKeys).forEach(([key, value]) => {
      const [id, provider] = key.split('_')
      if (parseInt(id) === userId) {
        keys.push({provider, api_key: value})
      }
    })
    return keys
  },

  // 保存API密钥
  async saveApiKey(userId: number, provider: string, apiKey: string): Promise<boolean> {
    const key = `${userId}_${provider}`
    mockApiKeys[key] = apiKey
    return true
  },

  // 获取API密钥
  async getApiKey(userId: number, provider: string): Promise<string | null> {
    const key = `${userId}_${provider}`
    return mockApiKeys[key] || null
  },
}

// 使用统计数据访问对象
export const usageStatisticsDao = {
  // 记录使用情况
  async recordUsage(userId: number, modelId: number, tokensUsed: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0]
    const model = mockAiModels.find(m => m.id === modelId)
    const existingIndex = mockUsageStats.findIndex(
      stat => stat.date === today && stat.model_name === model?.name && stat.provider === model?.provider
    )
    
    if (existingIndex !== -1) {
      mockUsageStats[existingIndex] = {
        ...mockUsageStats[existingIndex],
        tokens_used: mockUsageStats[existingIndex].tokens_used + tokensUsed,
        request_count: mockUsageStats[existingIndex].request_count + 1
      }
    } else if (model) {
      mockUsageStats.push({
        date: today,
        tokens_used: tokensUsed,
        request_count: 1,
        model_name: model.name,
        provider: model.provider
      })
    }
  },

  // 获取用户使用统计
  async getUserUsageStats(userId: number, startDate?: string, endDate?: string): Promise<any[]> {
    let filteredStats = [...mockUsageStats]
    
    if (startDate) {
      filteredStats = filteredStats.filter(stat => stat.date >= startDate)
    }
    
    if (endDate) {
      filteredStats = filteredStats.filter(stat => stat.date <= endDate)
    }
    
    return filteredStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },
}
