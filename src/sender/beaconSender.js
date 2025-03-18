/**
 * AutoTracker SDK 数据上报模块
 * 负责将收集到的数据批量上报到服务器
 */

import config from '../config.js';
import { isSupported } from '../core/utils.js';

/**
 * 数据上报类
 */
export default class BeaconSender {
  /**
   * 构造函数
   */
  constructor() {
    this.queue = []; // 数据队列
    this.sending = false; // 是否正在发送
    this.timer = null; // 定时器
    this.retryCount = 0; // 重试次数
    this.offlineQueue = []; // 离线队列
    this.maxOfflineQueueSize = 100; // 最大离线队列大小
    this.isInitialized = false; // 是否已初始化
    
    // 检查浏览器是否支持sendBeacon
    this.supportBeacon = isSupported('sendBeacon');
    
    // 检查浏览器是否支持localStorage
    this.supportLocalStorage = isSupported('localStorage');
    
    // 检查浏览器是否支持Compression API
    this.supportCompression = typeof CompressionStream !== 'undefined';
  }
  
  /**
   * 初始化数据上报
   */
  init() {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    
    // 从localStorage恢复离线队列
    this.restoreOfflineQueue();
    
    // 启动定时上报
    this.startTimer();
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时，立即上报数据
        this.flush();
      } else if (document.visibilityState === 'visible') {
        // 页面可见时，尝试上报离线队列
        this.sendOfflineQueue();
      }
    });
    
    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      // 页面卸载前，立即上报数据
      this.flush();
    });
    
    // 监听网络状态变化
    window.addEventListener('online', () => {
      // 网络恢复时，尝试上报离线队列
      this.sendOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      // 网络断开时，停止定时上报
      this.stopTimer();
    });
  }
  
  /**
   * 添加数据到队列
   * @param {Object} data - 要上报的数据
   */
  add(data) {
    // 添加数据到队列
    this.queue.push(data);
    
    // 如果队列长度达到阈值，立即上报
    if (this.queue.length >= config.beacon.batchSize) {
      this.flush();
    }
  }
  
  /**
   * 立即上报队列中的数据
   */
  flush() {
    // 如果队列为空，直接返回
    if (this.queue.length === 0) {
      return;
    }
    
    // 如果正在发送，直接返回
    if (this.sending) {
      return;
    }
    
    // 标记为正在发送
    this.sending = true;
    
    // 停止定时器
    this.stopTimer();
    
    // 复制队列数据
    const data = [...this.queue];
    
    // 清空队列
    this.queue = [];
    
    // 上报数据
    this.send(data)
      .then(() => {
        // 上报成功，重置重试次数
        this.retryCount = 0;
        
        // 重新启动定时器
        this.startTimer();
        
        // 标记为发送完成
        this.sending = false;
      })
      .catch(error => {
        console.error('Failed to send data:', error);
        
        // 上报失败，增加重试次数
        this.retryCount++;
        
        // 如果重试次数未达到上限，将数据重新加入队列
        if (this.retryCount < config.beacon.retryCount) {
          // 将数据重新加入队列
          this.queue = [...data, ...this.queue];
          
          // 重新启动定时器，延迟重试
          this.startTimer(Math.min(config.beacon.delay * Math.pow(2, this.retryCount), 60000));
        } else {
          // 重试次数达到上限，将数据加入离线队列
          this.addToOfflineQueue(data);
          
          // 重置重试次数
          this.retryCount = 0;
          
          // 重新启动定时器
          this.startTimer();
        }
        
        // 标记为发送完成
        this.sending = false;
      });
  }
  
  /**
   * 发送数据到服务器
   * @param {Array} data - 要上报的数据
   * @return {Promise} 上报结果
   */
  async send(data) {
    // 如果没有配置上报地址，直接返回
    if (!config.beacon.url) {
      console.error('Beacon URL is not configured');
      return Promise.reject(new Error('Beacon URL is not configured'));
    }
    
    // 如果网络离线，加入离线队列
    if (!navigator.onLine) {
      this.addToOfflineQueue(data);
      return Promise.reject(new Error('Network is offline'));
    }
    
    // 准备上报数据
    const payload = {
      app_id: config.appId,
      timestamp: Date.now(),
      data
    };
    
    // 如果支持sendBeacon且配置了使用sendBeacon
    if (this.supportBeacon && config.beacon.useBeacon) {
      try {
        // 将数据转换为JSON字符串
        const jsonData = JSON.stringify(payload);
        
        // 如果支持压缩且配置了使用压缩
        let blob;
        if (this.supportCompression && config.beacon.compression) {
          // 压缩数据
          blob = await this.compressData(jsonData);
        } else {
          // 不压缩数据
          blob = new Blob([jsonData], { type: 'application/json' });
        }
        
        // 使用sendBeacon发送数据
        const result = navigator.sendBeacon(config.beacon.url, blob);
        
        // 如果发送失败，使用fetch重试
        if (!result) {
          return this.sendWithFetch(payload);
        }
        
        return Promise.resolve();
      } catch (error) {
        console.error('Failed to send data with sendBeacon:', error);
        
        // 如果sendBeacon失败，使用fetch重试
        return this.sendWithFetch(payload);
      }
    } else {
      // 使用fetch发送数据
      return this.sendWithFetch(payload);
    }
  }
  
  /**
   * 使用fetch发送数据
   * @param {Object} payload - 要上报的数据
   * @return {Promise} 上报结果
   */
  async sendWithFetch(payload) {
    try {
      // 将数据转换为JSON字符串
      const jsonData = JSON.stringify(payload);
      
      // 如果支持压缩且配置了使用压缩
      let body;
      let headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.supportCompression && config.beacon.compression) {
        // 压缩数据
        body = await this.compressData(jsonData);
        headers['Content-Encoding'] = 'gzip';
      } else {
        // 不压缩数据
        body = jsonData;
      }
      
      // 使用fetch发送数据
      const response = await fetch(config.beacon.url, {
        method: 'POST',
        headers,
        body,
        // 设置超时
        signal: AbortSignal.timeout(config.beacon.timeout || 10000),
        // 不包含凭证
        credentials: 'omit',
        // 允许跨域
        mode: 'cors',
        // 缓存策略
        cache: 'no-cache'
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to send data with fetch:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * 压缩数据
   * @param {String} data - 要压缩的数据
   * @return {Promise<Blob>} 压缩后的数据
   */
  async compressData(data) {
    // 如果不支持Compression API，直接返回未压缩的数据
    if (!this.supportCompression) {
      return new Blob([data], { type: 'application/json' });
    }
    
    try {
      // 创建压缩流
      const stream = new Blob([data]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      
      // 读取压缩后的数据
      return new Response(compressedStream).blob();
    } catch (error) {
      console.error('Failed to compress data:', error);
      
      // 如果压缩失败，返回未压缩的数据
      return new Blob([data], { type: 'application/json' });
    }
  }
  
  /**
   * 启动定时上报
   * @param {Number} delay - 延迟时间，默认为配置的延迟时间
   */
  startTimer(delay = config.beacon.delay) {
    // 停止现有定时器
    this.stopTimer();
    
    // 启动新定时器
    this.timer = setTimeout(() => {
      // 上报数据
      this.flush();
    }, delay);
  }
  
  /**
   * 停止定时上报
   */
  stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  
  /**
   * 添加数据到离线队列
   * @param {Array} data - 要添加的数据
   */
  addToOfflineQueue(data) {
    // 添加数据到离线队列
    this.offlineQueue.push(...data);
    
    // 如果离线队列长度超过最大值，删除最早的数据
    if (this.offlineQueue.length > this.maxOfflineQueueSize) {
      this.offlineQueue = this.offlineQueue.slice(-this.maxOfflineQueueSize);
    }
    
    // 保存离线队列到localStorage
    this.saveOfflineQueue();
  }
  
  /**
   * 保存离线队列到localStorage
   */
  saveOfflineQueue() {
    // 如果不支持localStorage，直接返回
    if (!this.supportLocalStorage) {
      return;
    }
    
    try {
      // 将离线队列转换为JSON字符串
      const jsonData = JSON.stringify(this.offlineQueue);
      
      // 保存到localStorage
      localStorage.setItem('autotracker_offline_queue', jsonData);
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }
  
  /**
   * 从localStorage恢复离线队列
   */
  restoreOfflineQueue() {
    // 如果不支持localStorage，直接返回
    if (!this.supportLocalStorage) {
      return;
    }
    
    try {
      // 从localStorage获取离线队列
      const jsonData = localStorage.getItem('autotracker_offline_queue');
      
      // 如果有数据，解析并恢复
      if (jsonData) {
        this.offlineQueue = JSON.parse(jsonData);
      }
    } catch (error) {
      console.error('Failed to restore offline queue:', error);
      
      // 如果恢复失败，清空离线队列
      this.offlineQueue = [];
      
      // 清除localStorage中的离线队列
      localStorage.removeItem('autotracker_offline_queue');
    }
  }
  
  /**
   * 发送离线队列
   */
  sendOfflineQueue() {
    // 如果离线队列为空，直接返回
    if (this.offlineQueue.length === 0) {
      return;
    }
    
    // 如果网络离线，直接返回
    if (!navigator.onLine) {
      return;
    }
    
    // 复制离线队列数据
    const data = [...this.offlineQueue];
    
    // 清空离线队列
    this.offlineQueue = [];
    
    // 清除localStorage中的离线队列
    if (this.supportLocalStorage) {
      localStorage.removeItem('autotracker_offline_queue');
    }
    
    // 上报数据
    this.send(data)
      .catch(error => {
        console.error('Failed to send offline queue:', error);
        
        // 如果上报失败，将数据重新加入离线队列
        this.addToOfflineQueue(data);
      });
  }
  
  /**
   * 销毁数据上报实例
   */
  destroy() {
    // 停止定时器
    this.stopTimer();
    
    // 上报剩余数据
    this.flush();
    
    // 移除事件监听器
    document.removeEventListener('visibilitychange', this.flush);
    window.removeEventListener('beforeunload', this.flush);
    window.removeEventListener('online', this.sendOfflineQueue);
    window.removeEventListener('offline', this.stopTimer);
    
    this.isInitialized = false;
  }
}
