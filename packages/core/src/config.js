/**
 * AutoTracker SDK 配置模块
 * @module core/config
 */

import { deepMerge } from '@auto-tracker/utils';

// --- Validation Helper Functions ---
function logError(path, expected, actual) {
  console.error(`[AutoTracker Config] Invalid configuration at '${path}': Expected ${expected}, but got '${actual}' (type: ${typeof actual}). This may cause unexpected behavior.`);
}

function logWarning(path, expected, actual, defaultValueDescription) {
  console.warn(`[AutoTracker Config] Invalid configuration at '${path}': Expected ${expected}, but got '${actual}' (type: ${typeof actual}). ${defaultValueDescription || ''}`);
}

function isTypeOf(value, typeString, path, shouldWarn = true) {
  if (typeof value !== typeString) {
    if (shouldWarn) {
      logWarning(path, `type ${typeString}`, value, `Reverting to default or ignoring.`);
    }
    return false;
  }
  return true;
}

function isStringNonEmpty(value, path, isCritical = true) {
  if (typeof value !== 'string' || value.trim() === '') {
    const message = `a non-empty string`;
    if (isCritical) {
      logError(path, message, value);
    } else {
      logWarning(path, message, value);
    }
    return false;
  }
  return true;
}

function isNumberInRange(value, min, max, path, shouldWarn = true) {
  if (typeof value !== 'number' || value < min || value > max) {
    if (shouldWarn) {
      logWarning(path, `a number between ${min} and ${max} (inclusive)`, value, `Reverting to default.`);
    }
    return false;
  }
  return true;
}

function isValidUrl(value, path, isCritical = true) {
  if (typeof value !== 'string' || !value.startsWith('http://') && !value.startsWith('https://')) {
    const message = `a valid URL starting with http:// or https://`;
    if (isCritical) {
      logError(path, message, value);
    } else {
      logWarning(path, message, value);
    }
    return false;
  }
  return true;
}


/**
 * AutoTracker SDK 默认配置对象。
 * 用户在初始化SDK时提供的配置将与此默认配置深度合并。
 * 各项配置的详细说明请参考具体属性。
 *
 * @readonly
 * @type {object}
 */
const defaultConfig = {
  /**
   * @property {string} appId - 应用ID。用于在数据上报时标识数据来源的应用。此项通常必填。
   */
  appId: '',
  /**
   * @property {boolean} debug - 是否开启调试模式。
   * 当设置为 `true` 时，SDK会在控制台输出详细的日志信息，包括事件跟踪、数据上报、错误等，便于开发调试。
   */
  debug: false,
  /**
   * @property {string} userId - 用户唯一标识符。
   * 用于关联用户行为数据。建议在用户登录后设置。
   */
  userId: '',
  /**
   * @property {object} userProperties - 用户自定义属性。
   * 用于补充描述用户的特征信息，如会员等级、用户标签等。
   */
  userProperties: {},
  
  /**
   * @property {object} event - 事件跟踪相关配置。
   */
  event: {
    /**
     * @property {object} click - 点击事件自动跟踪配置。
     * @property {boolean} click.enabled - 是否启用点击事件自动跟踪。默认为 `true`。
     * @property {string[]} click.ignoreSelectors - 忽略跟踪的元素CSS选择器列表。被匹配到的元素及其子元素上的点击事件将不会被自动跟踪。
     * @property {number} click.sampleRate - 点击事件采样率 (0.0 - 1.0)。1.0表示全部采集。默认为 `1.0`。
     */
    click: {
      enabled: true,
      ignoreSelectors: ['[data-auto-tracker-ignore]', 'input', 'textarea'],
      sampleRate: 1.0
    },
    /**
     * @property {object} scroll - 滚动事件自动跟踪配置。
     * @property {boolean} scroll.enabled - 是否启用滚动事件自动跟踪。默认为 `true`。
     * @property {number} scroll.throttleTime - 滚动事件处理的节流时间（毫秒）。默认为 `200`。
     * @property {number} scroll.sampleRate - 滚动事件采样率 (0.0 - 1.0)。默认为 `0.5`。
     * @property {number[]} scroll.reportPercents - 页面滚动到指定百分比时上报事件。默认为 `[25, 50, 75, 90, 100]`。
     */
    scroll: {
      enabled: true,
      throttleTime: 200,
      sampleRate: 0.5,
      reportPercents: [25, 50, 75, 90, 100]
    },
    /**
     * @property {object} pageView - 页面浏览事件自动跟踪配置。
     * @property {boolean} pageView.enabled - 是否启用页面浏览事件自动跟踪。默认为 `true`。
     * @property {number} pageView.sampleRate - 页面浏览事件采样率 (0.0 - 1.0)。默认为 `1.0`。
     */
    pageView: {
      enabled: true,
      sampleRate: 1.0
    },
    /**
     * @property {object} pageLeave - 页面离开事件自动跟踪配置。
     * @property {boolean} pageLeave.enabled - 是否启用页面离开事件自动跟踪。默认为 `true`。
     * @property {number} pageLeave.sampleRate - 页面离开事件采样率 (0.0 - 1.0)。默认为 `1.0`。
     */
    pageLeave: {
      enabled: true,
      sampleRate: 1.0
    }
  },
  
  /**
   * @property {object} performance - 性能监控相关配置。
   */
  performance: {
    /** @property {boolean} enabled - 是否启用性能监控。默认为 `true`。 */
    enabled: true,
    /** @property {number} sampleRate - 整体性能数据采样率 (0.0 - 1.0)。默认为 `0.1`。 */
    sampleRate: 0.1,
    /** @property {object} metrics - Web Vitals及其他关键性能指标采集配置。 */
    metrics: {
      /** @property {boolean} FP - 是否采集 First Paint。默认为 `true`。 */
      FP: true,
      /** @property {boolean} FCP - 是否采集 First Contentful Paint。默认为 `true`。 */
      FCP: true,
      /** @property {boolean} LCP - 是否采集 Largest Contentful Paint。默认为 `true`。 */
      LCP: true,
      /** @property {boolean} FID - 是否采集 First Input Delay。默认为 `true`。 */
      FID: true,
      /** @property {boolean} CLS - 是否采集 Cumulative Layout Shift。默认为 `true`。 */
      CLS: true,
      /** @property {boolean} TTFB - 是否采集 Time to First Byte。默认为 `true`。 */
      TTFB: true
    },
    /** @property {object} resourceTiming - 页面资源加载性能监控配置。 */
    resourceTiming: {
      /** @property {boolean} enabled - 是否启用资源加载性能监控。默认为 `true`。 */
      enabled: true,
      /** @property {number} sampleRate - 资源加载性能数据采样率 (0.0 - 1.0)。默认为 `0.1`。 */
      sampleRate: 0.1,
      /** @property {number} maxResourcesPerPage - 每页最多采集的资源数量。默认为 `50`。 */
      maxResourcesPerPage: 50,
      /** @property {string[]} includeTypes - 需要采集的资源类型列表。默认为 `['script', 'link', 'img', 'css', 'fetch', 'xmlhttprequest']`。 */
      includeTypes: ['script', 'link', 'img', 'css', 'fetch', 'xmlhttprequest']
    }
  },
  
  /**
   * @property {object} error - 错误监控相关配置。
   */
  error: {
    /** @property {boolean} enabled - 是否启用错误监控。默认为 `true`。 */
    enabled: true,
    /** @property {number} sampleRate - 错误数据采样率 (0.0 - 1.0)。默认为 `1.0`。 */
    sampleRate: 1.0,
    /** @property {object} types - 需要监控的错误类型。 */
    types: {
      /** @property {boolean} jsError - 是否监控 JavaScript 运行时错误。默认为 `true`。 */
      jsError: true,
      /** @property {boolean} resourceError - 是否监控资源加载错误。默认为 `true`。 */
      resourceError: true,
      /** @property {boolean} promiseError - 是否监控未处理的 Promise 拒绝。默认为 `true`。 */
      promiseError: true,
      /** @property {boolean} ajaxError - 是否监控 AJAX (XHR 和 Fetch) 请求错误。默认为 `true`。 */
      ajaxError: true
    },
    /** @property {RegExp[]} ignoreErrors - 需要忽略的错误信息正则表达式列表。 */
    ignoreErrors: [
      /^Script error\.?$/,
      /^ResizeObserver loop limit exceeded$/
    ],
    /** @property {number} maxErrorsPerPage - 每页最多上报的错误数量。默认为 `10`。 */
    maxErrorsPerPage: 10
  },
  
  /**
   * @property {object} beacon - 数据上报相关配置。
   */
  beacon: {
    /** 
     * @property {string} url - 数据上报接口地址。此项通常必填。
     * **安全提示：强烈建议使用 HTTPS 协议的 URL，以确保数据在传输过程中的安全。**
     */
    url: '',
    /** @property {string} method - 数据上报的 HTTP 方法。默认为 `'POST'`。 */
    method: 'POST',
    /** @property {number} batchSize - 批量上报的事件数量阈值。默认为 `10`。 */
    batchSize: 10,
    /** @property {number} batchTimeout - 批量上报的超时时间（毫秒）。默认为 `5000`。 */
    batchTimeout: 5000,
    /** @property {number} retryCount - 上报失败时的重试次数。默认为 `2`。 */
    retryCount: 2,
    /** @property {number} retryInterval - 上报失败时的重试间隔（毫秒）。默认为 `3000`。 */
    retryInterval: 3000,
    /** @property {boolean} useBeacon - 是否优先使用 `navigator.sendBeacon` API 进行数据上报 (仅 Web 平台)。默认为 `true`。 */
    useBeacon: true,
    /** @property {object} headers - 自定义上报请求头。 */
    headers: {
      'Content-Type': 'application/json'
    }
  },
  
  /**
   * @property {object} heatmap - 点击热图功能相关配置 (仅 Web 平台)。
   */
  heatmap: {
    /** @property {boolean} enabled - 是否启用热图功能。默认为 `true`。 */
    enabled: true,
    /** @property {number} throttleTime - 点击事件处理的节流时间（毫秒）。默认为 `200`。 */
    throttleTime: 200,
    /** @property {number} maxRecords - 热图数据最大记录数 (此项可能指内存中或单次上报，具体需看实现)。默认为 `10000`。 */
    maxRecords: 10000, // Note: This property's exact behavior (e.g., in-memory limit, per-batch limit) isn't fully clear from context.
    /** @property {string[]} ignoreSelectors - 忽略热图采集的元素CSS选择器列表。 */
    ignoreSelectors: ['[data-auto-tracker-ignore]', 'input', 'textarea', 'button'],
    /** @property {number} sampleRate - 热图数据采样率 (0.0 - 1.0)。默认为 `0.5`。 */
    sampleRate: 0.5
  },
  
  /**
   * @property {object} session - 会话指标跟踪相关配置 (仅 Web 平台)。
   */
  session: {
    /** @property {boolean} enabled - 是否启用会话指标跟踪。默认为 `true`。 */
    enabled: true,
    /** @property {number} sessionTimeout - 会话超时时间（秒）。超过此时间无活动，会话可能被视为结束。默认为 `1800` (30分钟)。 */
    sessionTimeout: 1800, 
    /** @property {boolean} trackBounceRate - 是否跟踪跳出率。默认为 `true`。 */
    trackBounceRate: true,
    /** @property {boolean} trackSessionDuration - 是否跟踪会话时长。默认为 `true`。 */
    trackSessionDuration: true,
    /** @property {number} sampleRate - 会话数据采样率 (0.0 - 1.0)。默认为 `1.0`。 */
    sampleRate: 1.0
  },
  
  /**
   * @property {object} funnel - 转化漏斗跟踪配置 (仅 Web 平台)。
   */
  funnel: { 
    /** @property {boolean} enabled - 是否启用漏斗跟踪。默认为 `true`。 */
    enabled: true,
    /** @property {number} maxFunnels - 最多允许创建的漏斗数量。默认为 `20`。 */
    maxFunnels: 20,
    /** @property {number} maxStepsPerFunnel - 每个漏斗最多允许的步骤数量。默认为 `10`。 */
    maxStepsPerFunnel: 10,
    /** @property {object[]} predefined - 预定义的漏斗列表。 */
    predefined: [
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
  /**
   * @property {object} miniProgram - 小程序平台特定配置。
   */
  miniProgram: {
    /** @property {object} wechat - 微信小程序特定配置。 */
    wechat: {
      /** @property {boolean} useNativeAPI - 是否使用微信原生API进行某些操作 (具体场景待定)。默认为 `true`。 */
      useNativeAPI: true,
      /** @property {string} reportPath - 微信小程序数据上报的特定路径 (如果需要)。 */
      reportPath: '/wechat-log'
    },
    /** @property {object} alipay - 支付宝小程序特定配置。 */
    alipay: {
      /** @property {boolean} useNativeAPI - 是否使用支付宝原生API进行某些操作。默认为 `true`。 */
      useNativeAPI: true,
      /** @property {string} reportPath - 支付宝小程序数据上报的特定路径 (如果需要)。 */
      reportPath: '/alipay-log'
    },
    /** @property {object} common - 小程序通用配置。 */
    common: {
      /** @property {boolean} trackAppLifecycle - 是否跟踪小程序的应用生命周期事件 (如 onLaunch, onShow, onHide)。默认为 `true`。 */
      trackAppLifecycle: true,
      /** @property {boolean} trackPageTransition - 是否跟踪小程序的页面切换事件 (如 onLoad, onShow, onHide, onUnload)。默认为 `true`。 */
      trackPageTransition: true
    }
  }
};

// 当前配置
let currentConfig = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone for initial config

/**
 * Validates specific configuration keys.
 * @param {Object} configToValidate - The configuration object to validate.
 * @param {Object} defaults - The default configuration to fall back to.
 * @param {Array<String>|null} keysToValidate - Optional array of keys (paths) to validate. If null, validates all relevant keys.
 */
function validateConfig(configToValidate, defaults, keysToValidate = null) {
  const validationMap = {
    'appId': () => isStringNonEmpty(configToValidate.appId, 'appId'),
    'debug': () => {
      if (!isTypeOf(configToValidate.debug, 'boolean', 'debug')) {
        configToValidate.debug = defaults.debug; // Revert to default
      }
    },
    'beacon.url': () => {
      if (configToValidate.beacon) {
        isStringNonEmpty(configToValidate.beacon.url, 'beacon.url');
        isValidUrl(configToValidate.beacon.url, 'beacon.url');
      }
    },
    'event.click.sampleRate': () => {
      if (configToValidate.event && configToValidate.event.click && !isNumberInRange(configToValidate.event.click.sampleRate, 0, 1, 'event.click.sampleRate')) {
        configToValidate.event.click.sampleRate = defaults.event.click.sampleRate;
      }
    },
    'event.scroll.sampleRate': () => {
      if (configToValidate.event && configToValidate.event.scroll && !isNumberInRange(configToValidate.event.scroll.sampleRate, 0, 1, 'event.scroll.sampleRate')) {
        configToValidate.event.scroll.sampleRate = defaults.event.scroll.sampleRate;
      }
    },
    'event.pageView.sampleRate': () => {
      if (configToValidate.event && configToValidate.event.pageView && !isNumberInRange(configToValidate.event.pageView.sampleRate, 0, 1, 'event.pageView.sampleRate')) {
        configToValidate.event.pageView.sampleRate = defaults.event.pageView.sampleRate;
      }
    },
    'event.pageLeave.sampleRate': () => {
      if (configToValidate.event && configToValidate.event.pageLeave && !isNumberInRange(configToValidate.event.pageLeave.sampleRate, 0, 1, 'event.pageLeave.sampleRate')) {
        configToValidate.event.pageLeave.sampleRate = defaults.event.pageLeave.sampleRate;
      }
    },
    'performance.sampleRate': () => {
      if (configToValidate.performance && !isNumberInRange(configToValidate.performance.sampleRate, 0, 1, 'performance.sampleRate')) {
        configToValidate.performance.sampleRate = defaults.performance.sampleRate;
      }
    },
    'performance.resourceTiming.sampleRate': () => {
      if (configToValidate.performance && configToValidate.performance.resourceTiming && !isNumberInRange(configToValidate.performance.resourceTiming.sampleRate, 0, 1, 'performance.resourceTiming.sampleRate')) {
        configToValidate.performance.resourceTiming.sampleRate = defaults.performance.resourceTiming.sampleRate;
      }
    },
    'error.sampleRate': () => {
      if (configToValidate.error && !isNumberInRange(configToValidate.error.sampleRate, 0, 1, 'error.sampleRate')) {
        configToValidate.error.sampleRate = defaults.error.sampleRate;
      }
    },
    'heatmap.sampleRate': () => {
      if (configToValidate.heatmap && !isNumberInRange(configToValidate.heatmap.sampleRate, 0, 1, 'heatmap.sampleRate')) {
        configToValidate.heatmap.sampleRate = defaults.heatmap.sampleRate;
      }
    },
    'session.sampleRate': () => {
      if (configToValidate.session && !isNumberInRange(configToValidate.session.sampleRate, 0, 1, 'session.sampleRate')) {
        configToValidate.session.sampleRate = defaults.session.sampleRate;
      }
    }
  };

  if (keysToValidate) {
    Object.keys(validationMap).forEach(path => {
      if (keysToValidate.some(key => path.startsWith(key))) {
        validationMap[path]();
      }
    });
  } else {
    Object.values(validationMap).forEach(validateFn => validateFn());
  }
}


/**
 * 初始化 SDK 配置。
 * 此函数会将用户提供的配置与默认配置进行深度合并，并对关键配置项进行验证。
 * 验证失败时，部分配置可能会回退到默认值，并在控制台打印错误或警告信息。
 *
 * @param {object} [userConfig={}] - 用户提供的配置对象。此对象将深度合并到 SDK 的默认配置中。
 *                                   如果未提供或提供空对象，则 SDK 将完全使用默认配置。
 * @returns {void} 此函数没有明确的返回值，其主要副作用是更新内部的 `currentConfig`。
 */
function init(userConfig = {}) {
  const freshDefaultConfig = JSON.parse(JSON.stringify(defaultConfig));
  currentConfig = deepMerge(freshDefaultConfig, userConfig);
  
  validateConfig(currentConfig, defaultConfig); 

  if (currentConfig.debug) {
    console.log('[AutoTracker] Initialized with config:', currentConfig);
  }
}

/**
 * 获取当前的 SDK 配置对象。
 * 返回的是当前生效的配置，它可能是默认配置、用户初始化时提供的配置、以及后续通过 `update` 方法更新后的配置的组合。
 *
 * @returns {object} 当前 SDK 的配置对象 (一个深拷贝的副本，以防止外部直接修改)。
 *                   注意：实际返回的是 `currentConfig` 的直接引用，文档描述为深拷贝副本是更安全的实践，
 *                   但当前实现返回的是直接引用。
 */
function get() {
  // Returning a deep copy is safer: return JSON.parse(JSON.stringify(currentConfig));
  // However, current implementation returns direct reference.
  return currentConfig;
}

/**
 * 更新 SDK 配置。
 * 此函数会将用户提供的新配置与当前配置进行深度合并。
 * 只有在 `newConfig` 中提供的键才会被更新，其他配置项将保持不变。
 * 更新后，会对被修改的配置项进行验证。
 *
 * @param {object} [newConfig={}] - 需要更新的配置项。只包含需要修改的配置键值对。
 * @returns {void} 此函数没有明确的返回值，其主要副作用是更新内部的 `currentConfig`。
 */
function update(newConfig = {}) {
  const updatedKeys = Object.keys(newConfig);
  currentConfig = deepMerge(currentConfig, newConfig);
  validateConfig(currentConfig, defaultConfig, updatedKeys); 

  if (currentConfig.debug) {
    console.log('[AutoTracker] Config updated:', currentConfig);
  }
}

export default {
  init,
  get,
  update
};
