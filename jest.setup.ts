// Jest配置文件，在每个测试文件执行前运行

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// 添加全局API polyfill
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// TransformStream polyfill (for AI SDK)
if (typeof (global as any).TransformStream === 'undefined') {
  class MockTransformStream {
    readable: any;
    writable: any;
    constructor() {
      this.readable = {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: undefined }),
          releaseLock: jest.fn(),
        }),
        pipeTo: jest.fn(),
        cancel: jest.fn(),
      };
      this.writable = {
        getWriter: () => ({
          write: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
          abort: jest.fn(),
        }),
      };
    }
  }
  (global as any).TransformStream = MockTransformStream as any;
}

// Mock环境变量
process.env.NEXT_PUBLIC_APP_VERSION = 'test-version';
process.env.NEXT_PUBLIC_BUILD_DATE = '2024-01-01';

// Mock浏览器API - matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock fetch API
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ok: true,
  } as Response)
);

// Mock Web Crypto API for encryption tests
if (!window.crypto?.subtle) {
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256)
        }
        return array
      },
      subtle: {
        importKey: jest.fn().mockResolvedValue({ type: 'raw' }),
        deriveKey: jest.fn().mockResolvedValue({
          type: 'secret',
          algorithm: { name: 'AES-GCM' },
          extractable: false,
          usages: ['encrypt', 'decrypt'],
        }),
        encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(64)),
        decrypt: jest.fn().mockImplementation(async (_algorithm: any, _key: any, data: any) => {
          return data
        }),
        generateKey: jest.fn(),
        exportKey: jest.fn(),
        digest: jest.fn(),
      },
    },
    writable: true,
  })
}

console.log('✅ Jest setup completed');
