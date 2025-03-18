/**
 * AutoTracker SDK 入口文件
 * 负责初始化和协调各个模块的工作
 */

import config from './src/config.js';
import { deepMerge, generateUUID, getDeviceInfo, getPageInfo } from './src/core/utils.js';
import EventTracker from './src/core/eventTracker.js';
import PerformanceMonitor from './src/core/performance.js';
import ErrorMonitor from './src/core/errorMonitor.js';
import BeaconSender from './src/sender/beaconSender.js';

/**
 * AutoTracker SDK 主类
 */
class AutoTracker {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    // 合并配置
    this.config = deepMerge(config, options);
    
    // 生成会话ID
    this.sessionId = this.generateSessionId();
    
    // 获取设备信息
    this.deviceInfo = getDeviceInfo();
    
    // 获取页面信息
    this.pageInfo = getPageInfo();
    
    // 创建数据上报实例
    this.beaconSender = new BeaconSender();
    
    // 创建事件追踪实例
    this.eventTracker = new EventTracker(this.handleReport.bind(this));
    
    // 创建性能监控实例
    this.performanceMonitor = new PerformanceMonitor(this.handleReport.bind(this));
    
    // 创建错误监控实例
    this.errorMonitor = new ErrorMonitor(this.handleReport.bind(this));
    
    // 是否已初始化
    this.isInitialized = false;
    
    // 会话活跃时间
    this.lastActivityTime = Date.now();
    
    // 会话超时检查定时器
    this.sessionTimeoutTimer = null;
    
    // 如果配置了自动启动，则初始化
    if (this.config.advanced.autoTrack) {
      this.init();
    }
  }
  
  /**
   * 初始化SDK
   * @param {Object} options - 配置选项
   * @return {AutoTracker} 实例
   */
  init(options = {}) {
    // 如果已经初始化，直接返回
    if (this.isInitialized) {
      return this;
    }
    
    // 合并配置
    if (Object.keys(options).length > 0) {
      this.config = deepMerge(this.config, options);
    }
    
    // 检查是否在iframe中
    if (window !== window.top && !this.config.advanced.enableInIframe) {
      console.warn('AutoTracker is disabled in iframe');
      return this;
    }
    
    // 检查是否尊重DNT设置
    if (this.config.advanced.privacy.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      console.warn('AutoTracker is disabled due to DNT setting');
      return this;
    }
    
    // 标记为已初始化
    this.isInitialized = true;
    
    // 初始化数据上报
    this.beaconSender.init();
    
    // 初始化事件追踪
    this.eventTracker.init();
    
    // 初始化性能监控
    this.performanceMonitor.init();
    
    // 初始化错误监控
    this.errorMonitor.init();
    
    // 上报初始化事件
    this.trackEvent('sdk_init', {
      version: '1.0.0',
      config: this.sanitizeConfig(this.config),
      device: this.deviceInfo,
      page: this.pageInfo
    });
    
    // 启动会话超时检查
    this.startSessionTimeoutCheck();
    
    // 监听用户活动
    this.listenUserActivity();
    
    // 如果是调试模式，输出调试信息
    if (this.config.debug) {
      console.log('AutoTracker initialized with config:', this.config);
      
      // 添加到全局对象，方便调试
      window.__autoTracker = this;
    }
    
    return this;
  }
  
  /**
   * 处理数据上报
   * @param {Object} data - 上报数据
   */
  handleReport(data) {
    // 添加会话ID
    data.sessionId = this.sessionId;
    
    // 添加设备信息
    data.device = this.deviceInfo;
    
    // 添加页面信息
    data.page = this.pageInfo;
    
    // 添加到上报队列
    this.beaconSender.add(data);
    
    // 更新会话活跃时间
    this.lastActivityTime = Date.now();
    
    // 如果是调试模式，输出调试信息
    if (this.config.debug) {
      console.log('AutoTracker report:', data);
    }
  }
  
  /**
   * 手动上报事件
   * @param {String} eventName - 事件名称
   * @param {Object} eventData - 事件数据
   * @return {AutoTracker} 实例
   */
  trackEvent(eventName, eventData = {}) {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      this.init();
    }
    
    // 上报事件
    this.handleReport({
      type: 'event',
      subType: 'custom',
      name: eventName,
      timestamp: Date.now(),
      data: eventData
    });
    
    return this;
  }
  
  /**
   * 手动上报错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @return {AutoTracker} 实例
   */
  trackError(error, context = {}) {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      this.init();
    }
    
    // 上报错误
    this.errorMonitor.handleError(error);
    
    return this;
  }
  
  /**
   * 手动上报性能指标
   * @param {String} metricName - 指标名称
   * @param {Object} metricData - 指标数据
   * @return {AutoTracker} 实例
   */
  trackPerformance(metricName, metricData = {}) {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      this.init();
    }
    
    // 上报性能指标
    this.performanceMonitor.reportMetric(metricName, metricData);
    
    return this;
  }
  
  /**
   * 设置用户ID
   * @param {String} userId - 用户ID
   * @return {AutoTracker} 实例
   */
  setUserId(userId) {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      this.init();
    }
    
    // 设置用户ID
    this.userId = userId;
    
    // 上报用户ID设置事件
    this.trackEvent('set_user_id', { userId });
    
    return this;
  }
  
  /**
   * 设置用户属性
   * @param {Object} properties - 用户属性
   * @return {AutoTracker} 实例
   */
  setUserProperties(properties = {}) {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      this.init();
    }
    
    // 设置用户属性
    this.userProperties = { ...this.userProperties, ...properties };
    
    // 上报用户属性设置事件
    this.trackEvent('set_user_properties', { properties });
    
    return this;
  }
  
  /**
   * 生成会话ID
   * @return {String} 会话ID
   */
  generateSessionId() {
    // 尝试从sessionStorage获取会话ID
    let sessionId = null;
    
    try {
      sessionId = sessionStorage.getItem('autotracker_session_id');
    } catch (error) {
      console.error('Failed to get session ID from sessionStorage:', error);
    }
    
    // 如果没有会话ID，生成一个新的
    if (!sessionId) {
      sessionId = generateUUID();
      
      try {
        sessionStorage.setItem('autotracker_session_id', sessionId);
      } catch (error) {
        console.error('Failed to save session ID to sessionStorage:', error);
      }
    }
    
    return sessionId;
  }
  
  /**
   * 重新生成会话ID
   */
  regenerateSessionId() {
    // 生成新的会话ID
    this.sessionId = generateUUID();
    
    try {
      sessionStorage.setItem('autotracker_session_id', this.sessionId);
    } catch (error) {
      console.error('Failed to save session ID to sessionStorage:', error);
    }
    
    // 上报会话更新事件
    this.trackEvent('session_update', {
      sessionId: this.sessionId,
      reason: 'timeout'
    });
  }
  
  /**
   * 启动会话超时检查
   */
  startSessionTimeoutCheck() {
    // 停止现有定时器
    this.stopSessionTimeoutCheck();
    
    // 启动新定时器
    this.sessionTimeoutTimer = setInterval(() => {
      // 检查会话是否超时
      const now = Date.now();
      const elapsed = now - this.lastActivityTime;
      
      // 如果超过会话超时时间，重新生成会话ID
      if (elapsed > this.config.advanced.sessionTimeout * 1000) {
        this.regenerateSessionId();
        this.lastActivityTime = now;
      }
    }, 60000); // 每分钟检查一次
  }
  
  /**
   * 停止会话超时检查
   */
  stopSessionTimeoutCheck() {
    if (this.sessionTimeoutTimer) {
      clearInterval(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }
  }
  
  /**
   * 监听用户活动
   */
  listenUserActivity() {
    // 监听用户交互事件
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };
    
    // 监听鼠标和键盘事件
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('mousedown', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('touchstart', updateActivity);
    document.addEventListener('scroll', updateActivity);
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    });
  }
  
  /**
   * 检查是否启用了DNT
   * @return {Boolean} 是否启用了DNT
   */
  isDoNotTrackEnabled() {
    return (
      navigator.doNotTrack === '1' ||
      navigator.doNotTrack === 'yes' ||
      navigator.msDoNotTrack === '1' ||
      window.doNotTrack === '1'
    );
  }
  
  /**
   * 清理配置中的敏感信息
   * @param {Object} config - 配置对象
   * @return {Object} 清理后的配置
   */
  sanitizeConfig(config) {
    // 创建配置副本
    const sanitizedConfig = { ...config };
    
    // 删除敏感信息
    delete sanitizedConfig.beacon.url;
    
    return sanitizedConfig;
  }
  
  /**
   * 销毁SDK实例
   */
  destroy() {
    // 如果未初始化，直接返回
    if (!this.isInitialized) {
      return;
    }
    
    // 上报销毁事件
    this.trackEvent('sdk_destroy');
    
    // 停止会话超时检查
    this.stopSessionTimeoutCheck();
    
    // 销毁各个模块
    this.beaconSender.destroy();
    this.eventTracker.destroy();
    this.performanceMonitor.destroy();
    this.errorMonitor.destroy();
    
    // 移除用户活动监听
    document.removeEventListener('mousemove', this.updateActivity);
    document.removeEventListener('mousedown', this.updateActivity);
    document.removeEventListener('keydown', this.updateActivity);
    document.removeEventListener('touchstart', this.updateActivity);
    document.removeEventListener('scroll', this.updateActivity);
    
    // 标记为未初始化
    this.isInitialized = false;
    
    // 如果是调试模式，移除全局对象
    if (this.config.debug) {
      delete window.__autoTracker;
    }
  }
}

// 创建单例实例
const instance = new AutoTracker();

// 导出单例实例和类
export default instance;
export { AutoTracker };
