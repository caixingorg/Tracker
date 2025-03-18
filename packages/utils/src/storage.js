/**
 * 存储相关工具函数
 */

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
