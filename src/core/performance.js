/**
 * AutoTracker SDK 性能监控模块
 * 负责收集各种性能指标，如Web Vitals、资源加载时间等
 */

import { shouldSample, throttle } from './utils.js';
import config from '../config.js';

/**
 * 性能监控类
 */
export default class PerformanceMonitor {
  /**
   * 构造函数
   * @param {Function} reportCallback - 数据上报回调函数
   */
  constructor(reportCallback) {
    this.reportCallback = reportCallback;
    this.isInitialized = false;
    this.metricsCollected = new Set();
    this.observerInstances = [];
    
    // 检查浏览器是否支持Performance API
    this.isSupported = 'performance' in window;
    
    // 初始化FPS监控相关变量
    this.fpsMonitorId = null;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsList = [];
    
    // 初始化首屏时间监控相关变量
    this.firstScreenTimingObserver = null;
    this.firstScreenRendered = false;
    this.domContentLoadedTime = 0;
    
    // 初始化内存监控相关变量
    this.memoryMonitorId = null;
  }
  
  /**
   * 初始化性能监控
   */
  init() {
    if (!this.isSupported || this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    
    // 监听DOMContentLoaded事件
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.domContentLoadedTime = performance.now();
        this.collectNavigationTiming();
      });
    } else {
      this.domContentLoadedTime = performance.now();
      this.collectNavigationTiming();
    }
    
    // 监听load事件
    window.addEventListener('load', () => {
      // 延迟执行，确保页面完全加载
      setTimeout(() => {
        this.collectResourceTiming();
        this.collectPaintTiming();
        
        // 如果配置了首屏时间监控，则启动
        if (config.performance.firstScreenTiming) {
          this.startFirstScreenTiming();
        }
        
        // 如果配置了FPS监控，则启动
        if (config.performance.fps) {
          this.startFPSMonitoring();
        }
        
        // 如果配置了内存监控，则启动
        if (config.performance.memory) {
          this.startMemoryMonitoring();
        }
      }, 0);
    });
    
    // 初始化Web Vitals监控
    if (config.performance.webVitals) {
      this.initWebVitalsMonitoring();
    }
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时，上报已收集的性能数据
        this.reportPerformanceOnHidden();
      }
    });
    
    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      // 页面卸载前，上报已收集的性能数据
      this.reportPerformanceOnHidden();
    });
  }
  
  /**
   * 收集导航计时数据
   */
  collectNavigationTiming() {
    if (!this.isSupported || !shouldSample(config.sampling.performance)) {
      return;
    }
    
    if (!config.performance.timing) {
      return;
    }
    
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      
      if (!navigationEntry) {
        // 降级使用旧版API
        const timing = performance.timing;
        
        const navigationTiming = {
          dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcpConnect: timing.connectEnd - timing.connectStart,
          request: timing.responseStart - timing.requestStart,
          response: timing.responseEnd - timing.responseStart,
          domParse: timing.domInteractive - timing.responseEnd,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadEvent: timing.loadEventEnd - timing.navigationStart,
          total: timing.loadEventEnd - timing.navigationStart
        };
        
        this.reportMetric('navigation_timing', navigationTiming);
        return;
      }
      
      // 使用新版Performance API
      const navigationTiming = {
        dnsLookup: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
        tcpConnect: navigationEntry.connectEnd - navigationEntry.connectStart,
        tlsNegotiation: navigationEntry.secureConnectionStart > 0 
          ? navigationEntry.connectEnd - navigationEntry.secureConnectionStart 
          : 0,
        serverTime: navigationEntry.responseStart - navigationEntry.requestStart,
        downloadTime: navigationEntry.responseEnd - navigationEntry.responseStart,
        domParse: navigationEntry.domInteractive - navigationEntry.responseEnd,
        deferredExecutionTime: navigationEntry.domContentLoadedEventStart - navigationEntry.domInteractive,
        domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime,
        loadEvent: navigationEntry.loadEventEnd - navigationEntry.startTime,
        total: navigationEntry.duration,
        redirectCount: navigationEntry.redirectCount,
        redirectTime: navigationEntry.redirectEnd - navigationEntry.redirectStart,
        type: navigationEntry.type,
        timeOrigin: performance.timeOrigin
      };
      
      this.reportMetric('navigation_timing', navigationTiming);
    } catch (error) {
      console.error('Failed to collect navigation timing:', error);
    }
  }
  
  /**
   * 收集资源计时数据
   */
  collectResourceTiming() {
    if (!this.isSupported || !shouldSample(config.sampling.performance)) {
      return;
    }
    
    if (!config.performance.resourceTiming) {
      return;
    }
    
    try {
      const resourceEntries = performance.getEntriesByType('resource');
      
      if (!resourceEntries || resourceEntries.length === 0) {
        return;
      }
      
      // 按资源类型分组
      const resourcesByType = {};
      
      resourceEntries.forEach(entry => {
        const { initiatorType, name, duration, transferSize, decodedBodySize } = entry;
        
        // 忽略上报请求本身
        if (name.includes(config.beacon.url)) {
          return;
        }
        
        if (!resourcesByType[initiatorType]) {
          resourcesByType[initiatorType] = [];
        }
        
        resourcesByType[initiatorType].push({
          name,
          duration,
          transferSize,
          decodedBodySize,
          // 计算压缩比率
          compressionRatio: decodedBodySize > 0 && transferSize > 0 
            ? (1 - (transferSize / decodedBodySize)).toFixed(2) 
            : 0
        });
      });
      
      // 计算每种资源类型的统计信息
      const resourceStats = {};
      
      Object.keys(resourcesByType).forEach(type => {
        const resources = resourcesByType[type];
        const count = resources.length;
        
        // 计算总加载时间和总大小
        let totalDuration = 0;
        let totalSize = 0;
        
        resources.forEach(resource => {
          totalDuration += resource.duration;
          totalSize += resource.transferSize;
        });
        
        // 计算平均加载时间和平均大小
        const avgDuration = count > 0 ? totalDuration / count : 0;
        const avgSize = count > 0 ? totalSize / count : 0;
        
        // 找出加载时间最长的资源
        const slowestResource = resources.reduce((prev, current) => {
          return prev.duration > current.duration ? prev : current;
        }, { duration: 0 });
        
        resourceStats[type] = {
          count,
          totalDuration,
          totalSize,
          avgDuration,
          avgSize,
          slowestResource: {
            name: slowestResource.name,
            duration: slowestResource.duration
          }
        };
      });
      
      this.reportMetric('resource_timing', resourceStats);
      
      // 清除已收集的资源计时数据，避免重复收集
      performance.clearResourceTimings();
    } catch (error) {
      console.error('Failed to collect resource timing:', error);
    }
  }
  
  /**
   * 收集绘制计时数据
   */
  collectPaintTiming() {
    if (!this.isSupported || !shouldSample(config.sampling.performance)) {
      return;
    }
    
    try {
      const paintEntries = performance.getEntriesByType('paint');
      
      if (!paintEntries || paintEntries.length === 0) {
        return;
      }
      
      const paintTiming = {};
      
      paintEntries.forEach(entry => {
        paintTiming[entry.name] = entry.startTime;
      });
      
      this.reportMetric('paint_timing', paintTiming);
    } catch (error) {
      console.error('Failed to collect paint timing:', error);
    }
  }
  
  /**
   * 初始化Web Vitals监控
   */
  initWebVitalsMonitoring() {
    if (!this.isSupported || !shouldSample(config.sampling.performance)) {
      return;
    }
    
    // 检查是否支持PerformanceObserver
    if (!('PerformanceObserver' in window)) {
      return;
    }
    
    try {
      // 监控FCP (First Contentful Paint)
      this.observeFCP();
      
      // 监控LCP (Largest Contentful Paint)
      this.observeLCP();
      
      // 监控CLS (Cumulative Layout Shift)
      this.observeCLS();
      
      // 监控FID (First Input Delay)
      this.observeFID();
      
      // 监控INP (Interaction to Next Paint)
      this.observeINP();
      
      // 监控TTFB (Time to First Byte)
      this.observeTTFB();
    } catch (error) {
      console.error('Failed to initialize Web Vitals monitoring:', error);
    }
  }
  
  /**
   * 监控FCP (First Contentful Paint)
   */
  observeFCP() {
    try {
      const fcpObserver = new PerformanceObserver(entries => {
        const fcpEntry = entries.getEntries()[0];
        
        if (fcpEntry) {
          // 断开观察器
          fcpObserver.disconnect();
          
          // 上报FCP指标
          this.reportMetric('web_vitals', {
            name: 'FCP',
            value: fcpEntry.startTime,
            rating: this.getRating('FCP', fcpEntry.startTime)
          });
          
          this.metricsCollected.add('FCP');
        }
      });
      
      fcpObserver.observe({ type: 'paint', buffered: true });
      this.observerInstances.push(fcpObserver);
    } catch (error) {
      console.error('Failed to observe FCP:', error);
    }
  }
  
  /**
   * 监控LCP (Largest Contentful Paint)
   */
  observeLCP() {
    try {
      let lcpValue = 0;
      
      const lcpObserver = new PerformanceObserver(entries => {
        const lcpEntries = entries.getEntries();
        
        if (lcpEntries.length > 0) {
          // 取最后一个LCP条目，因为它是最大的内容绘制
          const lcpEntry = lcpEntries[lcpEntries.length - 1];
          lcpValue = lcpEntry.startTime;
        }
      });
      
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observerInstances.push(lcpObserver);
      
      // 在页面隐藏或卸载时上报最终的LCP值
      const reportLCP = () => {
        if (lcpValue > 0 && !this.metricsCollected.has('LCP')) {
          this.reportMetric('web_vitals', {
            name: 'LCP',
            value: lcpValue,
            rating: this.getRating('LCP', lcpValue)
          });
          
          this.metricsCollected.add('LCP');
          lcpObserver.disconnect();
        }
      };
      
      ['visibilitychange', 'beforeunload'].forEach(type => {
        window.addEventListener(type, () => {
          if (type === 'visibilitychange' && document.visibilityState !== 'hidden') {
            return;
          }
          
          reportLCP();
        });
      });
    } catch (error) {
      console.error('Failed to observe LCP:', error);
    }
  }
  
  /**
   * 监控CLS (Cumulative Layout Shift)
   */
  observeCLS() {
    try {
      let clsValue = 0;
      let clsEntries = [];
      let sessionValue = 0;
      let sessionEntries = [];
      let sessionId = 0;
      
      const clsObserver = new PerformanceObserver(entries => {
        for (const entry of entries.getEntries()) {
          // 只有不是由用户输入引起的布局偏移才计入CLS
          if (!entry.hadRecentInput) {
            const currentTime = entry.startTime;
            
            // 如果是新的会话（间隔大于1秒或有用户输入）
            if (sessionValue === 0 || currentTime - sessionEntries[sessionEntries.length - 1].startTime > 1000 || entry.hadRecentInput) {
              sessionId++;
              sessionValue = 0;
              sessionEntries = [];
            }
            
            // 添加当前条目到会话
            sessionValue += entry.value;
            sessionEntries.push(entry);
            
            // 如果当前会话的CLS值大于累积的CLS值，则更新
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              clsEntries = sessionEntries;
            }
          }
        }
      });
      
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observerInstances.push(clsObserver);
      
      // 在页面隐藏或卸载时上报最终的CLS值
      const reportCLS = () => {
        if (!this.metricsCollected.has('CLS')) {
          this.reportMetric('web_vitals', {
            name: 'CLS',
            value: clsValue,
            rating: this.getRating('CLS', clsValue)
          });
          
          this.metricsCollected.add('CLS');
          clsObserver.disconnect();
        }
      };
      
      ['visibilitychange', 'beforeunload'].forEach(type => {
        window.addEventListener(type, () => {
          if (type === 'visibilitychange' && document.visibilityState !== 'hidden') {
            return;
          }
          
          reportCLS();
        });
      });
    } catch (error) {
      console.error('Failed to observe CLS:', error);
    }
  }
  
  /**
   * 监控FID (First Input Delay)
   */
  observeFID() {
    try {
      const fidObserver = new PerformanceObserver(entries => {
        const fidEntry = entries.getEntries()[0];
        
        if (fidEntry && !this.metricsCollected.has('FID')) {
          // 断开观察器
          fidObserver.disconnect();
          
          // 上报FID指标
          this.reportMetric('web_vitals', {
            name: 'FID',
            value: fidEntry.processingStart - fidEntry.startTime,
            rating: this.getRating('FID', fidEntry.processingStart - fidEntry.startTime)
          });
          
          this.metricsCollected.add('FID');
        }
      });
      
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observerInstances.push(fidObserver);
    } catch (error) {
      console.error('Failed to observe FID:', error);
    }
  }
  
  /**
   * 监控INP (Interaction to Next Paint)
   */
  observeINP() {
    try {
      // 检查是否支持INP
      if (!('interactionCount' in performance)) {
        return;
      }
      
      let maxDelay = 0;
      let maxEvent = null;
      
      const inpObserver = new PerformanceObserver(entries => {
        const interactionEntries = entries.getEntries();
        
        interactionEntries.forEach(entry => {
          const delay = entry.processingStart - entry.startTime;
          
          if (delay > maxDelay) {
            maxDelay = delay;
            maxEvent = {
              type: entry.name,
              delay,
              target: entry.target ? this.getElementDescription(entry.target) : null,
              time: entry.startTime
            };
          }
        });
      });
      
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      this.observerInstances.push(inpObserver);
      
      // 在页面隐藏或卸载时上报最终的INP值
      const reportINP = () => {
        if (maxDelay > 0 && !this.metricsCollected.has('INP')) {
          this.reportMetric('web_vitals', {
            name: 'INP',
            value: maxDelay,
            rating: this.getRating('INP', maxDelay),
            event: maxEvent
          });
          
          this.metricsCollected.add('INP');
          inpObserver.disconnect();
        }
      };
      
      ['visibilitychange', 'beforeunload'].forEach(type => {
        window.addEventListener(type, () => {
          if (type === 'visibilitychange' && document.visibilityState !== 'hidden') {
            return;
          }
          
          reportINP();
        });
      });
    } catch (error) {
      console.error('Failed to observe INP:', error);
    }
  }
  
  /**
   * 监控TTFB (Time to First Byte)
   */
  observeTTFB() {
    try {
      // 使用Navigation Timing API获取TTFB
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart;
        
        this.reportMetric('web_vitals', {
          name: 'TTFB',
          value: ttfb,
          rating: this.getRating('TTFB', ttfb)
        });
        
        this.metricsCollected.add('TTFB');
      }
    } catch (error) {
      console.error('Failed to observe TTFB:', error);
    }
  }
  
  /**
   * 获取元素的描述信息
   * @param {HTMLElement} element - DOM元素
   * @return {Object} 元素描述信息
   */
  getElementDescription(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return null;
    }
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      textContent: element.textContent ? element.textContent.substring(0, 50) : null
    };
  }
  
  /**
   * 获取性能指标的评级
   * @param {String} metric - 指标名称
   * @param {Number} value - 指标值
   * @return {String} 评级（'good'|'needs-improvement'|'poor'）
   */
  getRating(metric, value) {
    // 根据Web Vitals的标准阈值评级
    // https://web.dev/vitals/
    const thresholds = {
      FCP: [1800, 3000],    // 好：0-1800ms，需改进：1800-3000ms，差：>3000ms
      LCP: [2500, 4000],    // 好：0-2500ms，需改进：2500-4000ms，差：>4000ms
      FID: [100, 300],      // 好：0-100ms，需改进：100-300ms，差：>300ms
      CLS: [0.1, 0.25],     // 好：0-0.1，需改进：0.1-0.25，差：>0.25
      TTFB: [800, 1800],    // 好：0-800ms，需改进：800-1800ms，差：>1800ms
      INP: [200, 500]       // 好：0-200ms，需改进：200-500ms，差：>500ms
    };
    
    if (!thresholds[metric]) {
      return 'unknown';
    }
    
    const [good, poor] = thresholds[metric];
    
    if (value <= good) {
      return 'good';
    } else if (value <= poor) {
      return 'needs-improvement';
    } else {
      return 'poor';
    }
  }
  
  /**
   * 启动首屏时间监控
   */
  startFirstScreenTiming() {
    if (this.firstScreenRendered || !config.performance.firstScreenTiming) {
      return;
    }
    
    try {
      // 使用IntersectionObserver监控首屏元素的可见性
      if ('IntersectionObserver' in window) {
        const viewportHeight = window.innerHeight;
        
        // 获取所有可能在首屏的元素
        const possibleFirstScreenElements = Array.from(document.querySelectorAll('img, video, canvas, svg, [class*="banner"], [class*="carousel"], [class*="hero"], [class*="header"]'));
        
        if (possibleFirstScreenElements.length === 0) {
          // 如果没有找到特定元素，则使用所有在首屏内的元素
          const allElements = Array.from(document.querySelectorAll('*'));
          
          possibleFirstScreenElements.push(
            ...allElements.filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.top < viewportHeight && rect.height > 0 && rect.width > 0;
            })
          );
        }
        
        let elementsLoaded = 0;
        const totalElements = possibleFirstScreenElements.length;
        
        // 创建IntersectionObserver实例
        this.firstScreenTimingObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              elementsLoaded++;
              this.firstScreenTimingObserver.unobserve(entry.target);
              
              // 如果所有元素都已加载，或者加载了80%的元素，则认为首屏渲染完成
              if (elementsLoaded >= totalElements || elementsLoaded / totalElements >= 0.8) {
                const firstScreenTime = performance.now();
                
                this.reportMetric('first_screen_timing', {
                  time: firstScreenTime,
                  domContentLoadedDelta: firstScreenTime - this.domContentLoadedTime
                });
                
                this.firstScreenRendered = true;
                this.firstScreenTimingObserver.disconnect();
              }
            }
          });
        }, {
          threshold: 0.5 // 元素有50%可见时触发
        });
        
        // 开始观察元素
        possibleFirstScreenElements.forEach(element => {
          this.firstScreenTimingObserver.observe(element);
        });
        
        // 设置超时，如果5秒后仍未完成首屏渲染，则强制上报
        setTimeout(() => {
          if (!this.firstScreenRendered) {
            const firstScreenTime = performance.now();
            
            this.reportMetric('first_screen_timing', {
              time: firstScreenTime,
              domContentLoadedDelta: firstScreenTime - this.domContentLoadedTime,
              timeout: true
            });
            
            this.firstScreenRendered = true;
            
            if (this.firstScreenTimingObserver) {
              this.firstScreenTimingObserver.disconnect();
            }
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to start first screen timing:', error);
    }
  }
  
  /**
   * 启动FPS监控
   */
  startFPSMonitoring() {
    if (this.fpsMonitorId || !config.performance.fps) {
      return;
    }
    
    try {
      this.lastFrameTime = performance.now();
      this.frameCount = 0;
      this.fpsList = [];
      
      const measureFPS = () => {
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        this.frameCount++;
        
        // 每秒计算一次FPS
        if (elapsed >= 1000) {
          const fps = Math.round((this.frameCount * 1000) / elapsed);
          
          this.fpsList.push(fps);
          
          // 保留最近10秒的FPS数据
          if (this.fpsList.length > 10) {
            this.fpsList.shift();
          }
          
          // 每5秒上报一次FPS数据
          if (this.fpsList.length % 5 === 0) {
            const avgFPS = this.fpsList.reduce((sum, fps) => sum + fps, 0) / this.fpsList.length;
            const minFPS = Math.min(...this.fpsList);
            const maxFPS = Math.max(...this.fpsList);
            
            this.reportMetric('fps', {
              avg: avgFPS,
              min: minFPS,
              max: maxFPS,
              samples: this.fpsList.slice()
            });
          }
          
          this.lastFrameTime = now;
          this.frameCount = 0;
        }
        
        this.fpsMonitorId = requestAnimationFrame(measureFPS);
      };
      
      this.fpsMonitorId = requestAnimationFrame(measureFPS);
    } catch (error) {
      console.error('Failed to start FPS monitoring:', error);
    }
  }
  
  /**
   * 停止FPS监控
   */
  stopFPSMonitoring() {
    if (this.fpsMonitorId) {
      cancelAnimationFrame(this.fpsMonitorId);
      this.fpsMonitorId = null;
    }
  }
  
  /**
   * 启动内存监控
   */
  startMemoryMonitoring() {
    if (this.memoryMonitorId || !config.performance.memory) {
      return;
    }
    
    try {
      // 检查是否支持内存API
      if (!performance.memory) {
        return;
      }
      
      const memoryData = [];
      
      const measureMemory = () => {
        const { totalJSHeapSize, usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
        
        memoryData.push({
          total: totalJSHeapSize,
          used: usedJSHeapSize,
          limit: jsHeapSizeLimit,
          time: performance.now()
        });
        
        // 保留最近10次的内存数据
        if (memoryData.length > 10) {
          memoryData.shift();
        }
        
        // 每5次上报一次内存数据
        if (memoryData.length % 5 === 0) {
          const lastMemory = memoryData[memoryData.length - 1];
          const firstMemory = memoryData[0];
          
          this.reportMetric('memory', {
            current: {
              total: lastMemory.total,
              used: lastMemory.used,
              limit: lastMemory.limit
            },
            growth: {
              total: lastMemory.total - firstMemory.total,
              used: lastMemory.used - firstMemory.used
            },
            usageRatio: lastMemory.used / lastMemory.limit
          });
        }
      };
      
      // 每10秒测量一次内存使用情况
      this.memoryMonitorId = setInterval(measureMemory, 10000);
      
      // 立即执行一次
      measureMemory();
    } catch (error) {
      console.error('Failed to start memory monitoring:', error);
    }
  }
  
  /**
   * 停止内存监控
   */
  stopMemoryMonitoring() {
    if (this.memoryMonitorId) {
      clearInterval(this.memoryMonitorId);
      this.memoryMonitorId = null;
    }
  }
  
  /**
   * 页面隐藏时上报性能数据
   */
  reportPerformanceOnHidden() {
    // 上报尚未上报的Web Vitals指标
    ['LCP', 'CLS', 'INP'].forEach(metric => {
      if (!this.metricsCollected.has(metric)) {
        const observer = this.observerInstances.find(obs => 
          obs.takeRecords && obs.takeRecords().some(entry => 
            (entry.entryType === 'largest-contentful-paint' && metric === 'LCP') ||
            (entry.entryType === 'layout-shift' && metric === 'CLS') ||
            (entry.entryType === 'event' && metric === 'INP')
          )
        );
        
        if (observer) {
          observer.takeRecords();
          observer.disconnect();
        }
      }
    });
    
    // 停止FPS监控
    this.stopFPSMonitoring();
    
    // 停止内存监控
    this.stopMemoryMonitoring();
    
    // 停止首屏时间监控
    if (this.firstScreenTimingObserver) {
      this.firstScreenTimingObserver.disconnect();
    }
  }
  
  /**
   * 上报性能指标
   * @param {String} type - 指标类型
   * @param {Object} data - 指标数据
   */
  reportMetric(type, data) {
    if (!this.reportCallback || !shouldSample(config.sampling.performance)) {
      return;
    }
    
    this.reportCallback({
      type: 'performance',
      subType: type,
      timestamp: Date.now(),
      data
    });
  }
  
  /**
   * 销毁性能监控实例
   */
  destroy() {
    // 停止所有观察器
    this.observerInstances.forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
    
    // 停止FPS监控
    this.stopFPSMonitoring();
    
    // 停止内存监控
    this.stopMemoryMonitoring();
    
    // 停止首屏时间监控
    if (this.firstScreenTimingObserver) {
      this.firstScreenTimingObserver.disconnect();
    }
    
    // 移除事件监听器
    document.removeEventListener('visibilitychange', this.reportPerformanceOnHidden);
    window.removeEventListener('beforeunload', this.reportPerformanceOnHidden);
    
    this.isInitialized = false;
  }
}
