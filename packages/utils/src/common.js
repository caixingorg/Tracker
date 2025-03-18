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
