/**
 * 通用工具函数
 */

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
 * 脱敏处理敏感信息。
 * 此函数可用于处理如邮箱、手机号、身份证号等常见类型的敏感文本。
 * @param {String} text - 原始文本。
 * @param {Boolean} [isEmail=false] - 是否强制按邮箱格式进行脱敏。如果为 `true`，则按邮箱规则处理；
 *                                  如果为 `false` (默认)，函数会尝试自动检测是否为邮箱格式。
 * @return {String} 脱敏后的文本。如果输入为 `null` 或空字符串，则原样返回。
 * @example
 * // 邮箱
 * maskSensitiveData("test@example.com"); // "te**@example.com"
 * maskSensitiveData("user@example.com", true); // "us**@example.com"
 * // 手机号
 * maskSensitiveData("13812345678"); // "138****5678"
 * // 身份证号
 * maskSensitiveData("320123199001011234"); // "3201**********1234"
 * // 普通文本
 * maskSensitiveData("HelloWorld"); // "He******ld"
 * 
 * @description
 * 使用场景提示：
 * 当通过 `trackEvent` 上报自定义事件数据时，如果 `eventData` 中可能包含用户自由输入的内容
 * (例如：评论、搜索词、表单字段等)，建议开发者主动对此类数据进行审查，并考虑使用此函数
 * 或自定义的脱敏方法，以避免意外上报个人身份信息 (PII) 或其他敏感内容。
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
