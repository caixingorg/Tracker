/**
 * AutoTracker SDK 核心模块
 */

import { detectPlatform, Platform } from '@auto-tracker/utils';
import config from './config.js';
import { initEventTracker } from './eventTracker.js';
import { initPerformance } from './performance.js';
import { initErrorMonitor } from './errorMonitor.js';
import { createBeaconSender } from './beaconSender.js';

/**
 * SDK初始化函数
 * @param {Object} userConfig - 用户配置
 */
function init(userConfig = {}) {
  // 合并配置
  config.init(userConfig);
  
  // 检测平台
  const platform = detectPlatform();
  
  // 创建数据上报实例
  const beaconSender = createBeaconSender(config.get());
  
  // 根据平台初始化不同的模块
  if (platform === Platform.WEB) {
    // Web平台
    initEventTracker(config.get(), beaconSender);
    initPerformance(config.get(), beaconSender);
    initErrorMonitor(config.get(), beaconSender);
  } else if (platform === Platform.WECHAT) {
    // 微信小程序平台
    console.log('微信小程序平台初始化');
    // 动态加载微信小程序适配器
    import('@auto-tracker/wechat').then(adapter => {
      adapter.default.init(config.get(), beaconSender);
    }).catch(err => {
      console.error('Failed to load wechat adapter:', err);
    });
  } else if (platform === Platform.ALIPAY) {
    // 支付宝小程序平台
    console.log('支付宝小程序平台初始化');
    // 动态加载支付宝小程序适配器
    import('@auto-tracker/alipay').then(adapter => {
      adapter.default.init(config.get(), beaconSender);
    }).catch(err => {
      console.error('Failed to load alipay adapter:', err);
    });
  } else {
    console.warn(`Unsupported platform: ${platform}`);
  }
  
  return {
    config: config.get(),
    beaconSender
  };
}

/**
 * 手动上报事件
 * @param {String} eventName - 事件名称
 * @param {Object} eventData - 事件数据
 */
function trackEvent(eventName, eventData = {}) {
  const beaconSender = createBeaconSender(config.get());
  beaconSender.send({
    type: 'custom',
    name: eventName,
    data: eventData,
    timestamp: Date.now()
  });
}

/**
 * 设置用户ID
 * @param {String} userId - 用户ID
 */
function setUserId(userId) {
  config.update({ userId });
}

/**
 * 设置用户属性
 * @param {Object} properties - 用户属性
 */
function setUserProperties(properties) {
  config.update({ userProperties: properties });
}

export default {
  init,
  trackEvent,
  setUserId,
  setUserProperties
};
