/**
 * AutoTracker SDK 工具函数
 * 包含选择器生成、数据缓存、设备信息等通用功能
 */

/**
 * 生成元素的唯一选择器
 * @param {HTMLElement} element - DOM元素
 * @param {Boolean} optimized - 是否优化选择器长度
 * @return {String} 元素的CSS选择器
 */
export function generateSelector(element, optimized = true) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  // 如果元素有ID，直接使用ID选择器
  if (element.id && optimized) {
    return `#${element.id}`;
  }
  
  // 获取元素的标签名
  let selector = element.tagName.toLowerCase();
  
  // 添加类名（最多使用前两个类名）
  if (element.classList && element.classList.length && optimized) {
    const classes = Array.from(element.classList).slice(0, 2);
    selector += classes.map(c => `.${c}`).join('');
  }
  
  // 如果是根元素或已经到达body，则返回
  if (element === document.documentElement || element === document.body) {
    return selector;
  }
  
  // 如果有父元素，递归生成父元素的选择器
  if (element.parentElement) {
    // 查找同级相同标签的元素，确定元素在其中的位置
    if (!optimized || !element.id) {
      const sameTagSiblings = Array.from(element.parentElement.children)
        .filter(child => child.tagName === element.tagName);
      
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(element) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    // 递归处理父元素，但限制选择器的最大长度
    const parentSelector = optimized 
      ? generateSelector(element.parentElement, false).split(' ').slice(-2).join(' ')
      : generateSelector(element.parentElement, false);
    
    return parentSelector ? `${parentSelector} > ${selector}` : selector;
  }
  
  return selector;
}

/**
 * 数据缓存类
 * 支持过期时间、最大容量限制
 */
export class Cache {
  constructor(maxSize = 100, defaultExpiration = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultExpiration = defaultExpiration; // 默认过期时间，单位毫秒
  }
  
  /**
   * 设置缓存
   * @param {String} key - 缓存键
   * @param {*} value - 缓存值
   * @param {Number} expiration - 过期时间(ms)，默认1小时
   */
  set(key, value, expiration = this.defaultExpiration) {
    // 如果缓存已满，删除最早的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const expires = expiration ? Date.now() + expiration : 0;
    this.cache.set(key, { value, expires });
    
    return this;
  }
  
  /**
   * 获取缓存
   * @param {String} key - 缓存键
   * @return {*} 缓存值，如果不存在或已过期则返回null
   */
  get(key) {
    const item = this.cache.get(key);
    
    // 如果项不存在，返回null
    if (!item) return null;
    
    // 如果已过期，删除并返回null
    if (item.expires && item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  /**
   * 删除缓存
   * @param {String} key - 缓存键
   * @return {Boolean} 是否成功删除
   */
  delete(key) {
    return this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * 获取缓存大小
   * @return {Number} 缓存项数量
   */
  size() {
    return this.cache.size;
  }
}

/**
 * 获取设备和浏览器信息
 * @return {Object} 设备和浏览器信息
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  
  // 浏览器信息
  const browser = {
    name: '',
    version: ''
  };
  
  // 操作系统信息
  const os = {
    name: '',
    version: ''
  };
  
  // 设备类型
  let deviceType = 'unknown';
  
  // 检测浏览器
  if (/Edge|Edg/.test(ua)) {
    browser.name = 'Edge';
    browser.version = ua.match(/Edge?\/([0-9.]+)/)[1];
  } else if (/Chrome/.test(ua)) {
    browser.name = 'Chrome';
    browser.version = ua.match(/Chrome\/([0-9.]+)/)[1];
  } else if (/Firefox/.test(ua)) {
    browser.name = 'Firefox';
    browser.version = ua.match(/Firefox\/([0-9.]+)/)[1];
  } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browser.name = 'Safari';
    browser.version = ua.match(/Version\/([0-9.]+)/)[1];
  } else if (/MSIE|Trident/.test(ua)) {
    browser.name = 'IE';
    browser.version = ua.match(/(?:MSIE |rv:)([0-9.]+)/)[1];
  }
  
  // 检测操作系统
  if (/Windows/.test(ua)) {
    os.name = 'Windows';
    os.version = ua.match(/Windows NT ([0-9.]+)/)[1];
  } else if (/Mac/.test(platform)) {
    os.name = 'MacOS';
    os.version = ua.match(/Mac OS X ([0-9._]+)/)[1].replace(/_/g, '.');
  } else if (/Linux/.test(platform)) {
    os.name = 'Linux';
  } else if (/Android/.test(ua)) {
    os.name = 'Android';
    os.version = ua.match(/Android ([0-9.]+)/)[1];
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os.name = 'iOS';
    os.version = ua.match(/OS ([0-9_]+)/)[1].replace(/_/g, '.');
  }
  
  // 检测设备类型
  if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/.test(ua)) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }
  
  return {
    browser,
    os,
    deviceType,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    language: navigator.language,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData
    } : null
  };
}

/**
 * 生成UUID
 * @return {String} UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 获取当前页面URL信息
 * @return {Object} URL信息
 */
export function getPageInfo() {
  const { href, pathname, search, hash, origin } = window.location;
  
  return {
    url: href,
    path: pathname,
    query: search,
    hash: hash,
    origin: origin,
    title: document.title,
    referrer: document.referrer
  };
}

/**
 * 检查是否应该根据采样率采集数据
 * @param {Number} samplingRate - 采样率，0-1之间的数字
 * @return {Boolean} 是否应该采集
 */
export function shouldSample(samplingRate) {
  if (samplingRate >= 1) return true;
  if (samplingRate <= 0) return false;
  
  return Math.random() < samplingRate;
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @return {Object} 合并后的对象
 */
export function deepMerge(target, source) {
  const result = { ...target };
  
  if (!source) return result;
  
  Object.keys(source).forEach(key => {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  });
  
  return result;
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {Number} delay - 延迟时间(ms)
 * @return {Function} 节流后的函数
 */
export function throttle(fn, delay) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {Number} delay - 延迟时间(ms)
 * @return {Function} 防抖后的函数
 */
export function debounce(fn, delay) {
  let timer = null;
  
  return function(...args) {
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 安全地获取嵌套对象属性
 * @param {Object} obj - 对象
 * @param {String} path - 属性路径，如 'a.b.c'
 * @param {*} defaultValue - 默认值
 * @return {*} 属性值或默认值
 */
export function safeGet(obj, path, defaultValue = undefined) {
  if (!obj || !path) return defaultValue;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
}

/**
 * 脱敏处理敏感信息
 * @param {String} text - 原始文本
 * @param {Boolean} isEmail - 是否为邮箱
 * @return {String} 脱敏后的文本
 */
export function maskSensitiveData(text, isEmail = false) {
  if (!text) return text;
  
  // 邮箱脱敏
  if (isEmail || /^[^@]+@[^@]+\.[^@]+$/.test(text)) {
    const [username, domain] = text.split('@');
    const maskedUsername = username.length > 2 
      ? `${username.slice(0, 2)}${'*'.repeat(username.length - 2)}`
      : username;
    
    return `${maskedUsername}@${domain}`;
  }
  
  // 手机号脱敏
  if (/^\d{10,11}$/.test(text)) {
    return text.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
  }
  
  // 身份证号脱敏
  if (/^\d{15,18}$/.test(text)) {
    return text.replace(/^(\d{4})\d+(\d{4})$/, '$1**********$2');
  }
  
  // 普通文本，保留首尾字符
  if (text.length > 5) {
    return `${text.slice(0, 2)}${'*'.repeat(text.length - 4)}${text.slice(-2)}`;
  }
  
  return text;
}

/**
 * 检查浏览器是否支持某个特性
 * @param {String} feature - 特性名称
 * @return {Boolean} 是否支持
 */
export function isSupported(feature) {
  const features = {
    sendBeacon: 'sendBeacon' in navigator,
    performance: 'performance' in window,
    performanceObserver: 'PerformanceObserver' in window,
    mutationObserver: 'MutationObserver' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    webWorker: 'Worker' in window,
    serviceWorker: 'serviceWorker' in navigator,
    fetch: 'fetch' in window,
    promise: 'Promise' in window
  };
  
  return feature in features ? features[feature] : false;
}

/**
 * 获取错误的指纹
 * @param {Error} error - 错误对象
 * @return {String} 错误指纹
 */
export function getErrorFingerprint(error) {
  if (!error) return '';
  
  const message = error.message || '';
  const name = error.name || '';
  const stack = error.stack || '';
  
  // 提取堆栈中的关键信息
  const stackLines = stack.split('\n').slice(0, 3).join('');
  
  // 生成指纹
  const fingerprint = `${name}:${message}:${stackLines}`;
  
  // 使用简单的哈希算法
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return hash.toString(16);
}

/**
 * 格式化错误对象
 * @param {Error|Event} error - 错误对象或错误事件
 * @return {Object} 格式化后的错误信息
 */
export function formatError(error) {
  // 如果是错误事件
  if (error instanceof Event) {
    if (error.target && error.target.nodeName === 'SCRIPT') {
      // 脚本加载错误
      return {
        type: 'resource_error',
        subType: 'script',
        message: `Failed to load script: ${error.target.src || 'inline script'}`,
        source: error.target.src || window.location.href,
        stack: '',
        lineno: 0,
        colno: 0
      };
    } else if (error.target && error.target.nodeName === 'LINK') {
      // 样式表加载错误
      return {
        type: 'resource_error',
        subType: 'stylesheet',
        message: `Failed to load stylesheet: ${error.target.href || 'inline style'}`,
        source: error.target.href || window.location.href,
        stack: '',
        lineno: 0,
        colno: 0
      };
    } else if (error.target && error.target.nodeName === 'IMG') {
      // 图片加载错误
      return {
        type: 'resource_error',
        subType: 'image',
        message: `Failed to load image: ${error.target.src || 'unknown'}`,
        source: error.target.src || window.location.href,
        stack: '',
        lineno: 0,
        colno: 0
      };
    } else if (error instanceof ErrorEvent) {
      // JS错误事件
      return {
        type: 'js_error',
        subType: 'uncaught',
        message: error.message || 'Unknown error',
        source: error.filename || window.location.href,
        stack: error.error ? (error.error.stack || '') : '',
        lineno: error.lineno || 0,
        colno: error.colno || 0
      };
    }
  }
  
  // 如果是Promise拒绝事件
  if (error instanceof PromiseRejectionEvent) {
    const reason = error.reason;
    return {
      type: 'promise_error',
      subType: 'unhandled',
      message: reason instanceof Error ? reason.message : String(reason),
      source: window.location.href,
      stack: reason instanceof Error ? (reason.stack || '') : '',
      lineno: 0,
      colno: 0
    };
  }
  
  // 如果是普通错误对象
  if (error instanceof Error) {
    return {
      type: 'js_error',
      subType: 'caught',
      message: error.message || 'Unknown error',
      source: window.location.href,
      stack: error.stack || '',
      lineno: 0,
      colno: 0
    };
  }
  
  // 其他情况
  return {
    type: 'unknown_error',
    subType: 'unknown',
    message: String(error),
    source: window.location.href,
    stack: '',
    lineno: 0,
    colno: 0
  };
}

/**
 * 检查是否应该忽略错误
 * @param {Object} error - 格式化后的错误信息
 * @param {Array} ignorePatterns - 忽略的错误模式
 * @return {Boolean} 是否应该忽略
 */
export function shouldIgnoreError(error, ignorePatterns = []) {
  if (!error || !error.message) return true;
  
  // 检查是否匹配忽略模式
  for (const pattern of ignorePatterns) {
    if (pattern instanceof RegExp) {
      if (pattern.test(error.message)) {
        return true;
      }
    } else if (typeof pattern === 'string') {
      if (error.message.includes(pattern)) {
        return true;
      }
    }
  }
  
  // 忽略跨域脚本错误
  if (error.message === 'Script error.' || error.message === 'Script error') {
    return true;
  }
  
  // 忽略浏览器插件错误
  if (error.source && (
    error.source.includes('chrome-extension://') ||
    error.source.includes('moz-extension://') ||
    error.source.includes('safari-extension://')
  )) {
    return true;
  }
  
  return false;
}
