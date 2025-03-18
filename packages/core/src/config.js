/**
 * AutoTracker SDK 配置模块
 */

import { deepMerge } from '@auto-tracker/utils';

// 默认配置
const defaultConfig = {
  // 基础配置
  appId: '',
  debug: false,
  userId: '',
  userProperties: {},
  
  // 事件跟踪配置
  event: {
    click: {
      enabled: true,
      ignoreSelectors: ['[data-auto-tracker-ignore]', 'input', 'textarea'],
      sampleRate: 1.0
    },
    scroll: {
      enabled: true,
      throttleTime: 200,
      sampleRate: 0.5,
      reportPercents: [25, 50, 75, 90, 100]
    },
    pageView: {
      enabled: true,
      sampleRate: 1.0
    },
    pageLeave: {
      enabled: true,
      sampleRate: 1.0
    }
  },
  
  // 性能监控配置
  performance: {
    enabled: true,
    sampleRate: 0.1,
    metrics: {
      FP: true,  // First Paint
      FCP: true, // First Contentful Paint
      LCP: true, // Largest Contentful Paint
      FID: true, // First Input Delay
      CLS: true, // Cumulative Layout Shift
      TTFB: true // Time to First Byte
    },
    resourceTiming: {
      enabled: true,
      sampleRate: 0.1,
      maxResourcesPerPage: 50,
      includeTypes: ['script', 'link', 'img', 'css', 'fetch', 'xmlhttprequest']
    }
  },
  
  // 错误监控配置
  error: {
    enabled: true,
    sampleRate: 1.0,
    types: {
      jsError: true,
      resourceError: true,
      promiseError: true,
      ajaxError: true
    },
    ignoreErrors: [
      /^Script error\.?$/,
      /^ResizeObserver loop limit exceeded$/
    ],
    maxErrorsPerPage: 10
  },
  
  // 数据上报配置
  beacon: {
    url: '',
    method: 'POST',
    batchSize: 10,
    batchTimeout: 5000,
    retryCount: 2,
    retryInterval: 3000,
    useBeacon: true,
    headers: {
      'Content-Type': 'application/json'
    }
  },
  
  // 热图配置
  heatmap: {
    enabled: true,
    throttleTime: 200,
    maxRecords: 10000,
    ignoreSelectors: ['[data-auto-tracker-ignore]', 'input', 'textarea', 'button'],
    sampleRate: 0.5
  },
  
  // 会话指标配置
  session: {
    enabled: true,
    sessionTimeout: 1800, // 会话超时时间（秒）
    trackBounceRate: true,
    trackSessionDuration: true,
    sampleRate: 1.0
  },
  
  // 漏斗配置
  funnel: {
    enabled: true,
    maxFunnels: 20,
    maxStepsPerFunnel: 10,
    // 预定义漏斗
    predefined: [
      // 示例：注册漏斗
      {
        id: 'registration',
        name: '用户注册漏斗',
        steps: [
          { id: 'view_register', name: '查看注册页' },
          { id: 'fill_form', name: '填写表单' },
          { id: 'submit_form', name: '提交表单' },
          { id: 'verify_email', name: '验证邮箱' },
          { id: 'complete_profile', name: '完成资料' }
        ]
      }
    ]
  },
  
  // 小程序配置
  miniProgram: {
    wechat: {
      useNativeAPI: true,
      reportPath: '/wechat-log'
    },
    alipay: {
      useNativeAPI: true,
      reportPath: '/alipay-log'
    },
    common: {
      trackAppLifecycle: true,
      trackPageTransition: true
    }
  }
};

// 当前配置
let currentConfig = { ...defaultConfig };

/**
 * 初始化配置
 * @param {Object} userConfig - 用户配置
 */
function init(userConfig = {}) {
  currentConfig = deepMerge(defaultConfig, userConfig);
  
  if (currentConfig.debug) {
    console.log('[AutoTracker] Initialized with config:', currentConfig);
  }
}

/**
 * 获取当前配置
 * @return {Object} 当前配置
 */
function get() {
  return currentConfig;
}

/**
 * 更新配置
 * @param {Object} newConfig - 新配置
 */
function update(newConfig = {}) {
  currentConfig = deepMerge(currentConfig, newConfig);
  
  if (currentConfig.debug) {
    console.log('[AutoTracker] Config updated:', currentConfig);
  }
}

export default {
  init,
  get,
  update
};
