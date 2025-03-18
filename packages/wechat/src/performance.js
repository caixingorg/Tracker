/**
 * AutoTracker SDK 微信小程序平台性能监控模块
 */

import { shouldSample } from '@auto-tracker/utils';

/**
 * 初始化微信小程序平台性能监控
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
export function initPerformance(config, beaconSender) {
  // 检查是否在微信小程序环境
  if (typeof wx === 'undefined' || !wx.getSystemInfo) {
    console.error('[AutoTracker] Not in WeChat Mini Program environment');
    return;
  }
  
  // 检查是否启用性能监控
  if (!config.performance.enabled) {
    return;
  }
  
  // 采样
  if (!shouldSample(config.performance.sampleRate)) {
    return;
  }
  
  // 收集系统信息
  collectSystemInfo(config, beaconSender);
  
  // 收集启动性能
  collectLaunchPerformance(config, beaconSender);
  
  // 收集网络性能
  collectNetworkPerformance(config, beaconSender);
  
  if (config.debug) {
    console.log('[AutoTracker] WeChat Mini Program performance monitor initialized');
  }
}

/**
 * 收集系统信息
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function collectSystemInfo(config, beaconSender) {
  try {
    const systemInfo = wx.getSystemInfoSync();
    
    beaconSender.send({
      type: 'performance',
      category: 'system',
      action: 'info',
      data: {
        brand: systemInfo.brand,
        model: systemInfo.model,
        pixelRatio: systemInfo.pixelRatio,
        screenWidth: systemInfo.screenWidth,
        screenHeight: systemInfo.screenHeight,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight,
        statusBarHeight: systemInfo.statusBarHeight,
        language: systemInfo.language,
        version: systemInfo.version,
        system: systemInfo.system,
        platform: systemInfo.platform,
        fontSizeSetting: systemInfo.fontSizeSetting,
        SDKVersion: systemInfo.SDKVersion,
        benchmarkLevel: systemInfo.benchmarkLevel,
        battery: systemInfo.battery,
        wifiSignal: systemInfo.wifiSignal
      }
    });
    
    if (config.debug) {
      console.log('[AutoTracker] System info collected');
    }
  } catch (err) {
    if (config.debug) {
      console.error('[AutoTracker] Failed to collect system info:', err);
    }
  }
}

/**
 * 收集启动性能
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function collectLaunchPerformance(config, beaconSender) {
  // 获取原始App构造函数
  const originalApp = App;
  
  // 记录启动时间
  const launchStartTime = Date.now();
  
  // 重写App构造函数
  App = function(appConfig) {
    // 处理应用启动事件
    const originalOnLaunch = appConfig.onLaunch;
    const originalOnShow = appConfig.onShow;
    const originalOnHide = appConfig.onHide;
    
    appConfig.onLaunch = function(options) {
      // 记录onLaunch时间
      const onLaunchTime = Date.now();
      const launchDuration = onLaunchTime - launchStartTime;
      
      // 发送启动性能数据
      beaconSender.send({
        type: 'performance',
        category: 'app',
        action: 'launch',
        data: {
          launchDuration,
          options,
          timestamp: onLaunchTime
        }
      });
      
      if (config.debug) {
        console.log(`[AutoTracker] App launch performance: ${launchDuration}ms`);
      }
      
      // 调用原始onLaunch
      if (originalOnLaunch) {
        originalOnLaunch.call(this, options);
      }
    };
    
    appConfig.onShow = function(options) {
      // 记录onShow时间
      const onShowTime = Date.now();
      
      // 如果是冷启动，计算从启动到onShow的时间
      if (!this._autoTrackerHasShown) {
        this._autoTrackerHasShown = true;
        
        const showDuration = onShowTime - launchStartTime;
        
        // 发送冷启动到显示的性能数据
        beaconSender.send({
          type: 'performance',
          category: 'app',
          action: 'cold_start',
          data: {
            showDuration,
            options,
            timestamp: onShowTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] App cold start to show: ${showDuration}ms`);
        }
      } else {
        // 热启动
        beaconSender.send({
          type: 'performance',
          category: 'app',
          action: 'hot_start',
          data: {
            timestamp: onShowTime,
            options
          }
        });
        
        if (config.debug) {
          console.log('[AutoTracker] App hot start');
        }
      }
      
      // 调用原始onShow
      if (originalOnShow) {
        originalOnShow.call(this, options);
      }
    };
    
    appConfig.onHide = function() {
      // 记录onHide时间
      const onHideTime = Date.now();
      
      // 发送应用隐藏数据
      beaconSender.send({
        type: 'performance',
        category: 'app',
        action: 'hide',
        data: {
          timestamp: onHideTime
        }
      });
      
      // 调用原始onHide
      if (originalOnHide) {
        originalOnHide.call(this);
      }
    };
    
    // 调用原始App构造函数
    return originalApp(appConfig);
  };
}

/**
 * 收集网络性能
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function collectNetworkPerformance(config, beaconSender) {
  // 获取原始wx.request函数
  const originalRequest = wx.request;
  
  // 重写wx.request函数
  wx.request = function(options) {
    // 记录请求开始时间
    const startTime = Date.now();
    
    // 创建新的成功回调
    const originalSuccess = options.success;
    options.success = function(res) {
      // 记录请求结束时间
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 采样
      if (shouldSample(config.performance.resourceTiming.sampleRate)) {
        // 发送网络请求性能数据
        beaconSender.send({
          type: 'performance',
          category: 'network',
          action: 'request',
          data: {
            url: options.url,
            method: options.method || 'GET',
            duration,
            status: res.statusCode,
            dataSize: JSON.stringify(res.data).length,
            timestamp: startTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Network request: ${options.url}, ${duration}ms`);
        }
      }
      
      // 调用原始成功回调
      if (originalSuccess) {
        originalSuccess.call(this, res);
      }
    };
    
    // 创建新的失败回调
    const originalFail = options.fail;
    options.fail = function(err) {
      // 记录请求结束时间
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 采样
      if (shouldSample(config.performance.resourceTiming.sampleRate)) {
        // 发送网络请求失败数据
        beaconSender.send({
          type: 'performance',
          category: 'network',
          action: 'request_fail',
          data: {
            url: options.url,
            method: options.method || 'GET',
            duration,
            error: err.errMsg,
            timestamp: startTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Network request failed: ${options.url}, ${err.errMsg}`);
        }
      }
      
      // 调用原始失败回调
      if (originalFail) {
        originalFail.call(this, err);
      }
    };
    
    // 调用原始wx.request函数
    return originalRequest.call(this, options);
  };
}
