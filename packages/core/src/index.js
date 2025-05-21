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
 * 手动上报自定义事件。
 * 允许开发者跟踪应用中特定的用户行为或状态。
 *
 * @param {string} eventName - 事件名称。应具有描述性，例如 'user_login', 'add_to_cart', 'submit_form'。
 * @param {object} [eventData={}] - 事件相关的附加数据。可以是一个包含任意键值对的对象，用于提供事件的上下文信息。
 * @returns {void}
 *
 * @description
 * **数据隐私与安全提示:**
 * `eventData` 对象可以包含任何自定义数据。请确保在传递用户产生的内容或任何可能包含
 * 个人身份信息 (PII) 或其他敏感数据之前，对其进行适当的审查和脱敏处理。
 * 例如，可以使用 SDK 提供的 `AutoTracker.utils.maskSensitiveData` 函数 (如果已暴露)
 * 或您自定义的脱敏方案来处理用户输入、备注、消息等字段。
 *
 * @example
 * // 上报用户搜索行为，对搜索词进行脱敏处理
 * const searchTerm = getUserInputSearchTerm(); // 假设此函数获取用户输入的搜索词
 * const maskedSearchTerm = AutoTracker.utils.maskSensitiveData ? AutoTracker.utils.maskSensitiveData(searchTerm) : searchTerm; // 假设 maskSensitiveData 可用
 * AutoTracker.trackEvent('user_search', {
 *   query: maskedSearchTerm,
 *   results_count: 25
 * });
 *
 * // 上报不含敏感信息的事件
 * AutoTracker.trackEvent('video_played', {
 *   videoId: 'vid123',
 *   duration_watched: 300 // in seconds
 * });
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
