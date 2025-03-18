/**
 * AutoTracker SDK Web平台事件跟踪模块
 */

import { initEventTracker as coreInitEventTracker } from '@auto-tracker/core/src/eventTracker.js';

/**
 * 初始化Web平台事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 * @return {Object} 事件跟踪实例
 */
export function initEventTracker(config, beaconSender) {
  // 直接使用核心包的事件跟踪模块
  const tracker = coreInitEventTracker(config, beaconSender);
  
  // 这里可以添加Web平台特有的事件跟踪逻辑
  
  if (config.debug) {
    console.log('[AutoTracker] Web event tracker initialized');
  }
  
  return tracker;
}
