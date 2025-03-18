/**
 * AutoTracker SDK 性能监控模块
 * 负责收集和处理各种性能指标
 */

import { 
  isSupported, 
  shouldSample,
  detectPlatform,
  Platform
} from '@auto-tracker/utils';

/**
 * 初始化性能监控
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 * @return {Object} 性能监控实例
 */
export function initPerformance(config, beaconSender) {
  // 检查平台
  const platform = detectPlatform();
  
  // 只在Web平台初始化性能监控
  if (platform !== Platform.WEB) {
    if (config.debug) {
      console.log(`[AutoTracker] Performance monitor not initialized for platform: ${platform}`);
    }
    return {
      reportMetric: () => {},
      isInitialized: false
    };
  }
  
  // 检查是否启用性能监控
  if (!config.performance || !config.performance.enabled) {
    return {
      reportMetric: () => {},
      isInitialized: false
    };
  }
  
  // 采样
  if (!shouldSample(config.performance.sampleRate)) {
    return {
      reportMetric: () => {},
      isInitialized: false
    };
  }
  
  // 检查浏览器是否支持性能API
  if (!isSupported('performance')) {
    if (config.debug) {
      console.warn('[AutoTracker] Performance API not supported');
    }
    return {
      reportMetric: () => {},
      isInitialized: false
    };
  }
  
  // 收集基本性能指标
  collectBasicMetrics(config, beaconSender);
  
  // 收集Web Vitals指标
  collectWebVitals(config, beaconSender);
  
  // 收集资源加载性能
  if (config.performance.resourceTiming && config.performance.resourceTiming.enabled) {
    collectResourceTiming(config, beaconSender);
  }
  
  if (config.debug) {
    console.log('[AutoTracker] Performance monitor initialized');
  }
  
  // 返回性能监控实例
  return {
    reportMetric: (metricName, metricData = {}) => {
      beaconSender.send({
        type: 'performance',
        category: 'custom',
        action: metricName,
        data: metricData
      });
      
      if (config.debug) {
        console.log(`[AutoTracker] Custom performance metric reported: ${metricName}`);
      }
    },
    isInitialized: true
  };
}

/**
 * 收集基本性能指标
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function collectBasicMetrics(config, beaconSender) {
  // 等待页面加载完成
  window.addEventListener('load', () => {
    // 延迟一点执行，确保所有指标都已可用
    setTimeout(() => {
      // 获取性能指标
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
      const tcpTime = perfData.connectEnd - perfData.connectStart;
      const ttfb = perfData.responseStart - perfData.requestStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      const domCompleteTime = perfData.domComplete - perfData.domLoading;
      
      // 发送性能数据
      beaconSender.send({
        type: 'performance',
        category: 'page',
        action: 'load',
        data: {
          pageLoadTime,
          dnsTime,
          tcpTime,
          ttfb,
          domReadyTime,
          domCompleteTime,
          redirectCount: performance.navigation.redirectCount,
          navigationType: getNavigationType(performance.navigation.type)
        }
      });
      
      if (config.debug) {
        console.log('[AutoTracker] Basic performance metrics collected');
      }
    }, 0);
  });
}

/**
 * 收集Web Vitals指标
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function collectWebVitals(config, beaconSender) {
  // 检查是否支持PerformanceObserver
  if (!isSupported('performanceObserver')) {
    if (config.debug) {
      console.warn('[AutoTracker] PerformanceObserver not supported');
    }
    return;
  }
  
  // 收集FP和FCP
  if (config.performance.metrics.FP || config.performance.metrics.FCP) {
    try {
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-paint' && config.performance.metrics.FP) {
            beaconSender.send({
              type: 'performance',
              category: 'web_vitals',
              action: 'FP',
              data: {
                value: entry.startTime,
                valueFormatted: `${Math.round(entry.startTime)}ms`
              }
            });
            
            if (config.debug) {
              console.log(`[AutoTracker] FP: ${Math.round(entry.startTime)}ms`);
            }
          }
          
          if (entry.name === 'first-contentful-paint' && config.performance.metrics.FCP) {
            beaconSender.send({
              type: 'performance',
              category: 'web_vitals',
              action: 'FCP',
              data: {
                value: entry.startTime,
                valueFormatted: `${Math.round(entry.startTime)}ms`
              }
            });
            
            if (config.debug) {
              console.log(`[AutoTracker] FCP: ${Math.round(entry.startTime)}ms`);
            }
          }
        }
      });
      
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (err) {
      if (config.debug) {
        console.error('[AutoTracker] Failed to observe paint metrics:', err);
      }
    }
  }
  
  // 收集LCP
  if (config.performance.metrics.LCP) {
    try {
      let lcpValue = 0;
      
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        lcpValue = lastEntry.startTime;
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // 在页面卸载前报告最终的LCP值
      window.addEventListener('beforeunload', () => {
        if (lcpValue > 0) {
          beaconSender.send({
            type: 'performance',
            category: 'web_vitals',
            action: 'LCP',
            data: {
              value: lcpValue,
              valueFormatted: `${Math.round(lcpValue)}ms`
            }
          });
          
          if (config.debug) {
            console.log(`[AutoTracker] LCP: ${Math.round(lcpValue)}ms`);
          }
        }
      });
    } catch (err) {
      if (config.debug) {
        console.error('[AutoTracker] Failed to observe LCP:', err);
      }
    }
  }
  
  // 收集FID
  if (config.performance.metrics.FID) {
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          beaconSender.send({
            type: 'performance',
            category: 'web_vitals',
            action: 'FID',
            data: {
              value: entry.processingStart - entry.startTime,
              valueFormatted: `${Math.round(entry.processingStart - entry.startTime)}ms`
            }
          });
          
          if (config.debug) {
            console.log(`[AutoTracker] FID: ${Math.round(entry.processingStart - entry.startTime)}ms`);
          }
        }
      });
      
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (err) {
      if (config.debug) {
        console.error('[AutoTracker] Failed to observe FID:', err);
      }
    }
  }
  
  // 收集CLS
  if (config.performance.metrics.CLS) {
    try {
      let clsValue = 0;
      let clsEntries = [];
      
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // 只有不是由用户交互引起的布局偏移才计入CLS
          if (!entry.hadRecentInput) {
            clsEntries.push(entry);
            clsValue += entry.value;
          }
        }
      });
      
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      // 在页面卸载前报告最终的CLS值
      window.addEventListener('beforeunload', () => {
        beaconSender.send({
          type: 'performance',
          category: 'web_vitals',
          action: 'CLS',
          data: {
            value: clsValue,
            valueFormatted: clsValue.toFixed(3)
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] CLS: ${clsValue.toFixed(3)}`);
        }
      });
    } catch (err) {
      if (config.debug) {
        console.error('[AutoTracker] Failed to observe CLS:', err);
      }
    }
  }
  
  // 收集TTFB
  if (config.performance.metrics.TTFB) {
    try {
      // 使用Navigation Timing API获取TTFB
      window.addEventListener('load', () => {
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry) {
          const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
          
          beaconSender.send({
            type: 'performance',
            category: 'web_vitals',
            action: 'TTFB',
            data: {
              value: ttfb,
              valueFormatted: `${Math.round(ttfb)}ms`
            }
          });
          
          if (config.debug) {
            console.log(`[AutoTracker] TTFB: ${Math.round(ttfb)}ms`);
          }
        }
      });
    } catch (err) {
      if (config.debug) {
        console.error('[AutoTracker] Failed to measure TTFB:', err);
      }
    }
  }
}

/**
 * 收集资源加载性能
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function collectResourceTiming(config, beaconSender) {
  // 采样
  if (!shouldSample(config.performance.resourceTiming.sampleRate)) {
    return;
  }
  
  // 等待页面加载完成
  window.addEventListener('load', () => {
    // 延迟一点执行，确保所有资源都已加载
    setTimeout(() => {
      // 获取资源加载性能数据
      const resources = performance.getEntriesByType('resource');
      
      // 过滤和限制资源数量
      const filteredResources = resources
        .filter(resource => {
          const type = getResourceType(resource);
          return config.performance.resourceTiming.includeTypes.includes(type);
        })
        .slice(0, config.performance.resourceTiming.maxResourcesPerPage);
      
      // 处理资源数据
      const resourcesData = filteredResources.map(resource => ({
        name: resource.name,
        type: getResourceType(resource),
        duration: resource.duration,
        size: resource.transferSize || 0,
        startTime: resource.startTime,
        timing: {
          dns: resource.domainLookupEnd - resource.domainLookupStart,
          tcp: resource.connectEnd - resource.connectStart,
          ttfb: resource.responseStart - resource.requestStart,
          download: resource.responseEnd - resource.responseStart
        }
      }));
      
      // 发送资源性能数据
      beaconSender.send({
        type: 'performance',
        category: 'resource',
        action: 'load',
        data: {
          resources: resourcesData,
          totalResources: resources.length,
          totalSize: resourcesData.reduce((sum, r) => sum + r.size, 0),
          totalDuration: Math.max(...resourcesData.map(r => r.startTime + r.duration))
        }
      });
      
      if (config.debug) {
        console.log(`[AutoTracker] Resource timing collected for ${resourcesData.length} resources`);
      }
    }, 1000);
  });
}

/**
 * 获取导航类型
 * @param {Number} type - 导航类型代码
 * @return {String} 导航类型描述
 */
function getNavigationType(type) {
  switch (type) {
    case 0: return 'navigate';
    case 1: return 'reload';
    case 2: return 'back_forward';
    case 255: return 'prerender';
    default: return 'unknown';
  }
}

/**
 * 获取资源类型
 * @param {PerformanceResourceTiming} resource - 资源性能条目
 * @return {String} 资源类型
 */
function getResourceType(resource) {
  const url = resource.name;
  const initiatorType = resource.initiatorType;
  
  if (initiatorType === 'link' && url.match(/\.css(\?|$)/)) {
    return 'css';
  }
  
  if (initiatorType === 'script' || url.match(/\.js(\?|$)/)) {
    return 'script';
  }
  
  if (initiatorType === 'img' || url.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/)) {
    return 'img';
  }
  
  if (initiatorType === 'xmlhttprequest' || initiatorType === 'fetch') {
    return initiatorType;
  }
  
  if (url.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)) {
    return 'font';
  }
  
  return initiatorType || 'other';
}
