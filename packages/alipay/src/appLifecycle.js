/**
 * AutoTracker SDK 支付宝小程序平台应用生命周期跟踪模块
 */

import { shouldSample } from '@auto-tracker/utils';

/**
 * 初始化支付宝小程序平台应用生命周期跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
export function initAppLifecycle(config, beaconSender) {
  // 检查是否在支付宝小程序环境
  if (typeof my === 'undefined' || !my.getSystemInfo) {
    console.error('[AutoTracker] Not in Alipay Mini Program environment');
    return;
  }
  
  // 获取原始App构造函数
  const originalApp = App;
  
  // 重写App构造函数
  App = function(appConfig) {
    // 处理应用启动事件
    const originalOnLaunch = appConfig.onLaunch;
    const originalOnShow = appConfig.onShow;
    const originalOnHide = appConfig.onHide;
    const originalOnError = appConfig.onError;
    
    // 记录会话开始时间
    let sessionStartTime = 0;
    
    // 记录应用启动参数
    let launchOptions = null;
    
    // 跟踪onLaunch事件
    appConfig.onLaunch = function(options) {
      // 记录启动参数
      launchOptions = options;
      
      // 采样
      if (shouldSample(config.event.pageView.sampleRate)) {
        // 发送应用启动事件数据
        beaconSender.send({
          type: 'event',
          category: 'app',
          action: 'launch',
          label: 'app_launch',
          data: {
            path: options.path,
            query: options.query,
            referrerInfo: options.referrerInfo,
            timestamp: Date.now()
          }
        });
        
        if (config.debug) {
          console.log('[AutoTracker] App launch tracked:', options);
        }
      }
      
      // 调用原始onLaunch
      if (originalOnLaunch) {
        originalOnLaunch.call(this, options);
      }
    };
    
    // 跟踪onShow事件
    appConfig.onShow = function(options) {
      // 记录会话开始时间
      sessionStartTime = Date.now();
      
      // 采样
      if (shouldSample(config.event.pageView.sampleRate)) {
        // 发送应用显示事件数据
        beaconSender.send({
          type: 'event',
          category: 'app',
          action: 'show',
          label: 'app_show',
          data: {
            path: options.path,
            query: options.query,
            referrerInfo: options.referrerInfo,
            timestamp: sessionStartTime
          }
        });
        
        if (config.debug) {
          console.log('[AutoTracker] App show tracked:', options);
        }
      }
      
      // 调用原始onShow
      if (originalOnShow) {
        originalOnShow.call(this, options);
      }
    };
    
    // 跟踪onHide事件
    appConfig.onHide = function() {
      // 计算会话时长
      const sessionEndTime = Date.now();
      const sessionDuration = sessionStartTime > 0 ? sessionEndTime - sessionStartTime : 0;
      
      // 采样
      if (shouldSample(config.event.pageLeave.sampleRate)) {
        // 发送应用隐藏事件数据
        beaconSender.send({
          type: 'event',
          category: 'app',
          action: 'hide',
          label: 'app_hide',
          data: {
            sessionDuration,
            timestamp: sessionEndTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] App hide tracked, session duration: ${sessionDuration}ms`);
        }
      }
      
      // 调用原始onHide
      if (originalOnHide) {
        originalOnHide.call(this);
      }
    };
    
    // 跟踪onError事件
    if (originalOnError) {
      appConfig.onError = function(error) {
        // 采样
        if (shouldSample(config.error.sampleRate)) {
          // 发送应用错误事件数据
          beaconSender.send({
            type: 'event',
            category: 'app',
            action: 'error',
            label: 'app_error',
            data: {
              error: typeof error === 'string' ? error : JSON.stringify(error),
              timestamp: Date.now()
            }
          });
          
          if (config.debug) {
            console.log('[AutoTracker] App error tracked:', error);
          }
        }
        
        // 调用原始onError
        originalOnError.call(this, error);
      };
    }
    
    // 调用原始App构造函数
    return originalApp(appConfig);
  };
  
  // 监听支付宝小程序特有的生命周期事件
  
  // 监听小程序进入后台事件
  if (typeof my.onAppHide === 'function') {
    my.onAppHide(() => {
      // 采样
      if (shouldSample(config.event.pageLeave.sampleRate)) {
        // 发送应用进入后台事件数据
        beaconSender.send({
          type: 'event',
          category: 'app',
          action: 'background',
          label: 'app_background',
          data: {
            timestamp: Date.now()
          }
        });
        
        if (config.debug) {
          console.log('[AutoTracker] App background tracked');
        }
      }
    });
  }
  
  // 监听小程序进入前台事件
  if (typeof my.onAppShow === 'function') {
    my.onAppShow((options) => {
      // 采样
      if (shouldSample(config.event.pageView.sampleRate)) {
        // 发送应用进入前台事件数据
        beaconSender.send({
          type: 'event',
          category: 'app',
          action: 'foreground',
          label: 'app_foreground',
          data: {
            path: options.path,
            query: options.query,
            referrerInfo: options.referrerInfo,
            timestamp: Date.now()
          }
        });
        
        if (config.debug) {
          console.log('[AutoTracker] App foreground tracked:', options);
        }
      }
    });
  }
  
  // 监听内存不足警告
  if (typeof my.onMemoryWarning === 'function') {
    my.onMemoryWarning((res) => {
      // 采样
      if (shouldSample(config.performance.sampleRate)) {
        // 发送内存不足警告事件数据
        beaconSender.send({
          type: 'performance',
          category: 'system',
          action: 'memory_warning',
          label: 'memory_warning',
          data: {
            level: res.level,
            timestamp: Date.now()
          }
        });
        
        if (config.debug) {
          console.log('[AutoTracker] Memory warning tracked:', res);
        }
      }
    });
  }
  
  if (config.debug) {
    console.log('[AutoTracker] Alipay Mini Program app lifecycle tracking initialized');
  }
}
