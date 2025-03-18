/**
 * AutoTracker SDK Web平台错误监控模块
 */

import { initErrorMonitor as coreInitErrorMonitor } from '@auto-tracker/core/src/errorMonitor.js';

/**
 * 初始化Web平台错误监控
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 * @return {Object} 错误监控实例
 */
export function initErrorMonitor(config, beaconSender) {
  // 直接使用核心包的错误监控模块
  const monitor = coreInitErrorMonitor(config, beaconSender);
  
  // 这里可以添加Web平台特有的错误监控逻辑
  
  if (config.debug) {
    console.log('[AutoTracker] Web error monitor initialized');
  }
  
  return monitor;
}
