/**
 * AutoTracker SDK 数据上报模块
 */

import { 
  isSupported, 
  Cache, 
  generateUUID, 
  getDeviceInfo, 
  getPageInfo,
  getPlatformAPI
} from '@auto-tracker/utils';

/**
 * 创建数据上报实例
 * @param {Object} config - 配置对象
 * @return {Object} 数据上报实例
 */
export function createBeaconSender(config) {
  // 缓存队列
  const queue = new Cache(1000);
  
  // 批量发送定时器
  let batchTimer = null;
  
  // 会话ID
  const sessionId = generateUUID();
  
  // 设备信息（只获取一次）
  const deviceInfo = getDeviceInfo();
  
  /**
   * 发送单条数据
   * @param {Object} data - 要发送的数据
   */
  function send(data) {
    if (!config.beacon.url) {
      if (config.debug) {
        console.warn('[AutoTracker] Beacon URL not set, data not sent');
      }
      return;
    }
    
    // 添加通用信息
    const enrichedData = enrichData(data);
    
    // 添加到队列
    const eventId = generateUUID();
    queue.set(eventId, enrichedData);
    
    // 如果达到批量发送阈值，立即发送
    if (queue.size() >= config.beacon.batchSize) {
      sendBatch();
    } else if (!batchTimer) {
      // 否则设置定时器
      batchTimer = setTimeout(() => {
        sendBatch();
        batchTimer = null;
      }, config.beacon.batchTimeout);
    }
    
    if (config.debug) {
      console.log('[AutoTracker] Event queued:', enrichedData);
    }
    
    return eventId;
  }
  
  /**
   * 批量发送数据
   */
  function sendBatch() {
    if (queue.size() === 0) return;
    
    // 收集队列中的所有数据
    const batch = [];
    queue.cache.forEach((item) => {
      batch.push(item.value);
    });
    
    // 清空队列
    queue.clear();
    
    // 发送数据
    const payload = {
      batch,
      batchId: generateUUID(),
      timestamp: Date.now()
    };
    
    // 根据平台选择不同的发送方式
    const requestAPI = getPlatformAPI('request');
    
    if (config.beacon.useBeacon && isSupported('sendBeacon')) {
      // 使用sendBeacon发送（Web平台）
      try {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json'
        });
        navigator.sendBeacon(config.beacon.url, blob);
        
        if (config.debug) {
          console.log('[AutoTracker] Batch sent via sendBeacon:', payload);
        }
      } catch (err) {
        if (config.debug) {
          console.error('[AutoTracker] Failed to send via sendBeacon:', err);
        }
        fallbackSend(payload);
      }
    } else {
      // 使用平台特定的请求API
      fallbackSend(payload);
    }
  }
  
  /**
   * 备用发送方法
   * @param {Object} payload - 要发送的数据
   */
  function fallbackSend(payload) {
    const requestAPI = getPlatformAPI('request');
    
    if (!requestAPI) {
      if (config.debug) {
        console.error('[AutoTracker] No request API available for current platform');
      }
      return;
    }
    
    // Web平台
    if (typeof requestAPI === 'function' && typeof window !== 'undefined') {
      fetch(config.beacon.url, {
        method: config.beacon.method,
        headers: config.beacon.headers,
        body: JSON.stringify(payload),
        keepalive: true
      }).then(response => {
        if (config.debug) {
          console.log('[AutoTracker] Batch sent via fetch:', payload, response);
        }
      }).catch(err => {
        if (config.debug) {
          console.error('[AutoTracker] Failed to send via fetch:', err);
        }
      });
    } 
    // 微信小程序
    else if (typeof wx !== 'undefined' && wx.request) {
      wx.request({
        url: config.beacon.url,
        method: config.beacon.method,
        header: config.beacon.headers,
        data: payload,
        success: (res) => {
          if (config.debug) {
            console.log('[AutoTracker] Batch sent via wx.request:', payload, res);
          }
        },
        fail: (err) => {
          if (config.debug) {
            console.error('[AutoTracker] Failed to send via wx.request:', err);
          }
        }
      });
    }
    // 支付宝小程序
    else if (typeof my !== 'undefined' && my.request) {
      my.request({
        url: config.beacon.url,
        method: config.beacon.method,
        headers: config.beacon.headers,
        data: payload,
        success: (res) => {
          if (config.debug) {
            console.log('[AutoTracker] Batch sent via my.request:', payload, res);
          }
        },
        fail: (err) => {
          if (config.debug) {
            console.error('[AutoTracker] Failed to send via my.request:', err);
          }
        }
      });
    }
  }
  
  /**
   * 丰富数据，添加通用信息
   * @param {Object} data - 原始数据
   * @return {Object} 丰富后的数据
   */
  function enrichData(data) {
    const pageInfo = getPageInfo();
    
    return {
      ...data,
      appId: config.appId,
      userId: config.userId,
      userProperties: config.userProperties,
      sessionId,
      device: deviceInfo,
      page: pageInfo,
      timestamp: data.timestamp || Date.now()
    };
  }
  
  /**
   * 立即发送队列中的所有数据
   */
  function flush() {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    
    sendBatch();
  }
  
  // 页面卸载时发送所有数据
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush);
  }
  
  return {
    send,
    flush,
    getQueue: () => Array.from(queue.cache.values()).map(item => item.value)
  };
}
