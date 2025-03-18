/**
 * 错误处理相关工具函数
 */

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
  // 检查是否在浏览器环境
  const isBrowser = typeof window !== 'undefined';
  
  // 如果是错误事件
  if (isBrowser && error instanceof Event) {
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
        source: error.filename || (isBrowser ? window.location.href : ''),
        stack: error.error ? (error.error.stack || '') : '',
        lineno: error.lineno || 0,
        colno: error.colno || 0
      };
    }
  }
  
  // 如果是Promise拒绝事件
  if (isBrowser && typeof PromiseRejectionEvent !== 'undefined' && error instanceof PromiseRejectionEvent) {
    const reason = error.reason;
    return {
      type: 'promise_error',
      subType: 'unhandled',
      message: reason instanceof Error ? reason.message : String(reason),
      source: isBrowser ? window.location.href : '',
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
      source: isBrowser ? window.location.href : '',
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
    source: isBrowser ? window.location.href : '',
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
