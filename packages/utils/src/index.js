/**
 * AutoTracker SDK 工具函数
 * 包含选择器生成、数据缓存、设备信息等通用功能
 */

// DOM相关工具函数
export { generateSelector } from './dom.js';

// 设备和环境检测相关工具函数
export { getDeviceInfo, getPageInfo, isSupported } from './device.js';

// 通用工具函数
export { 
  generateUUID, 
  shouldSample, 
  deepMerge, 
  throttle, 
  debounce, 
  safeGet, 
  maskSensitiveData 
} from './common.js';

// 错误处理相关工具函数
export { 
  getErrorFingerprint, 
  formatError, 
  shouldIgnoreError 
} from './error.js';

// 存储相关工具函数
export { Cache } from './storage.js';

// 平台检测
export { detectPlatform, Platform } from './platform.js';
