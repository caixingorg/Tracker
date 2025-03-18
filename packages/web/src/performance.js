/**
 * AutoTracker SDK Web平台性能监控模块
 */

import { initPerformance as coreInitPerformance } from '@auto-tracker/core/src/performance.js';

/**
 * 初始化Web平台性能监控
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 * @return {Object} 性能监控实例
 */
export function initPerformance(config, beaconSender) {
  // 直接使用核心包的性能监控模块
  const monitor = coreInitPerformance(config, beaconSender);
  
  // 这里可以添加Web平台特有的性能监控逻辑
  
  if (config.debug) {
    console.log('[AutoTracker] Web performance monitor initialized');
  }
  
  return monitor;
}
