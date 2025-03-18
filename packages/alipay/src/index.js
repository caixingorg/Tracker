/**
 * AutoTracker SDK 支付宝小程序平台适配器
 */

import { Platform } from '@auto-tracker/utils';
import { initEventTracker } from './eventTracker.js';
import { initPerformance } from './performance.js';
import { initErrorMonitor } from './errorMonitor.js';
import { initAppLifecycle } from './appLifecycle.js';
import { initPageLifecycle } from './pageLifecycle.js';

/**
 * 初始化支付宝小程序平台适配器
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function init(config, beaconSender) {
  // 检查是否在支付宝小程序环境
  if (typeof my === 'undefined' || !my.getSystemInfo) {
    console.error('[AutoTracker] Not in Alipay Mini Program environment');
    return;
  }
  
  // 初始化事件跟踪
  initEventTracker(config, beaconSender);
  
  // 初始化性能监控
  initPerformance(config, beaconSender);
  
  // 初始化错误监控
  initErrorMonitor(config, beaconSender);
  
  // 初始化应用生命周期跟踪
  if (config.miniProgram.common.trackAppLifecycle) {
    initAppLifecycle(config, beaconSender);
  }
  
  // 初始化页面生命周期跟踪
  if (config.miniProgram.common.trackPageTransition) {
    initPageLifecycle(config, beaconSender);
  }
  
  if (config.debug) {
    console.log('[AutoTracker] Alipay Mini Program adapter initialized');
  }
  
  return {
    platform: Platform.ALIPAY,
    config
  };
}

export default {
  init
};
