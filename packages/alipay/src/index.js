/**
 * AutoTracker SDK 支付宝小程序平台适配器
 */

import { Platform } from '@auto-tracker/utils';
import { initMiniProgramAdapter } from '@auto-tracker/utils/src/miniProgramAdapterUtils.js'; // Adjusted path
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
  const platformTrackers = {
    initEventTracker,
    initPerformance,
    initErrorMonitor,
    initAppLifecycle,
    initPageLifecycle
  };

  // Ensure 'my' is globally available for Alipay
  const platformAPI = typeof my !== 'undefined' ? my : undefined;

  return initMiniProgramAdapter(
    'Alipay',
    platformAPI,
    Platform.ALIPAY,
    config,
    beaconSender,
    platformTrackers
  );
}

export default {
  init
};
