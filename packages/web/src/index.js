/**
 * AutoTracker SDK Web平台适配器
 */

import { Platform } from '@auto-tracker/utils';
import { initEventTracker } from './eventTracker.js';
import { initPerformance } from './performance.js';
import { initErrorMonitor } from './errorMonitor.js';
import { initHeatmap } from './heatmap.js';
import { initSessionMetrics } from './sessionMetrics.js';
import { initFunnel } from './funnel.js';

/**
 * 初始化Web平台适配器
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function init(config, beaconSender) {
  // 初始化事件跟踪
  const eventTracker = initEventTracker(config, beaconSender);
  
  // 初始化性能监控
  const performanceMonitor = initPerformance(config, beaconSender);
  
  // 初始化错误监控
  const errorMonitor = initErrorMonitor(config, beaconSender);
  
  // 初始化热图功能
  const heatmap = config.heatmap?.enabled !== false ? 
    initHeatmap(config, beaconSender) : null;
  
  // 初始化会话指标跟踪
  const sessionMetrics = config.session?.enabled !== false ? 
    initSessionMetrics(config, beaconSender) : null;
  
  // 初始化漏斗跟踪
  const funnel = config.funnel?.enabled !== false ? 
    initFunnel(config, beaconSender) : null;
  
  if (config.debug) {
    console.log('[AutoTracker] Web adapter initialized with enhanced features');
  }
  
  return {
    platform: Platform.WEB,
    config,
    eventTracker,
    performanceMonitor,
    errorMonitor,
    heatmap,
    sessionMetrics,
    funnel,
    
    // 热图相关方法
    startHeatmapRecording: () => heatmap?.startRecording(),
    stopHeatmapRecording: () => heatmap?.stopRecording(),
    getHeatmapData: () => heatmap?.getClickData(),
    
    // 会话指标相关方法
    getSessionId: () => sessionMetrics?.getSessionId(),
    getSessionDuration: () => sessionMetrics?.getSessionDuration(),
    getBounceRate: () => sessionMetrics?.getBounceRate(),
    
    // 漏斗相关方法
    createFunnel: (id, name, steps) => funnel?.createFunnel(id, name, steps),
    enterFunnelStep: (funnelId, stepId, userId, data) => 
      funnel?.enterFunnelStep(funnelId, stepId, userId, data),
    getFunnelData: (funnelId) => funnel?.getFunnelData(funnelId),
    getConversionRate: (funnelId) => funnel?.getConversionRate(funnelId),
    
    // 用户相关方法
    setUserId: (userId) => {
      config.userId = userId;
      if (config.debug) {
        console.log(`[AutoTracker] User ID set: ${userId}`);
      }
      return userId;
    },
    
    setUserProperties: (properties) => {
      config.userProperties = { ...config.userProperties, ...properties };
      if (config.debug) {
        console.log('[AutoTracker] User properties set:', properties);
      }
      return config.userProperties;
    },
    
    // 事件跟踪方法
    trackEvent: (eventName, eventData = {}) => {
      if (eventTracker && eventTracker.trackEvent) {
        return eventTracker.trackEvent(eventName, eventData);
      }
    },
    
    // 性能监控方法
    trackPerformance: (metricName, metricData = {}) => {
      if (performanceMonitor && performanceMonitor.reportMetric) {
        return performanceMonitor.reportMetric(metricName, metricData);
      }
    }
  };
}

export default {
  init
};
