/**
 * AutoTracker SDK 微信小程序平台页面生命周期跟踪模块
 */

import { shouldSample } from '@auto-tracker/utils';

/**
 * 初始化微信小程序平台页面生命周期跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
export function initPageLifecycle(config, beaconSender) {
  // 检查是否在微信小程序环境
  if (typeof wx === 'undefined' || !wx.getSystemInfo) {
    console.error('[AutoTracker] Not in WeChat Mini Program environment');
    return;
  }
  
  // 获取原始Page构造函数
  const originalPage = Page;
  
  // 重写Page构造函数
  Page = function(pageConfig) {
    // 处理页面生命周期事件
    const originalOnLoad = pageConfig.onLoad;
    const originalOnShow = pageConfig.onShow;
    const originalOnReady = pageConfig.onReady;
    const originalOnHide = pageConfig.onHide;
    const originalOnUnload = pageConfig.onUnload;
    const originalOnPullDownRefresh = pageConfig.onPullDownRefresh;
    const originalOnReachBottom = pageConfig.onReachBottom;
    const originalOnShareAppMessage = pageConfig.onShareAppMessage;
    const originalOnTabItemTap = pageConfig.onTabItemTap;
    
    // 记录页面加载时间
    let pageLoadTime = 0;
    
    // 记录页面显示时间
    let pageShowTime = 0;
    
    // 记录页面路径和参数
    let pagePath = '';
    let pageOptions = null;
    
    // 跟踪onLoad事件
    pageConfig.onLoad = function(options) {
      // 记录页面加载时间
      pageLoadTime = Date.now();
      
      // 记录页面路径和参数
      pagePath = this.route || '';
      pageOptions = options;
      
      // 采样
      if (shouldSample(config.event.pageView.sampleRate)) {
        // 发送页面加载事件数据
        beaconSender.send({
          type: 'event',
          category: 'page',
          action: 'load',
          label: pagePath,
          data: {
            path: pagePath,
            options: pageOptions,
            timestamp: pageLoadTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Page load tracked: ${pagePath}`, options);
        }
      }
      
      // 调用原始onLoad
      if (originalOnLoad) {
        originalOnLoad.call(this, options);
      }
    };
    
    // 跟踪onShow事件
    pageConfig.onShow = function() {
      // 记录页面显示时间
      pageShowTime = Date.now();
      
      // 采样
      if (shouldSample(config.event.pageView.sampleRate)) {
        // 发送页面显示事件数据
        beaconSender.send({
          type: 'event',
          category: 'page',
          action: 'show',
          label: pagePath,
          data: {
            path: pagePath,
            options: pageOptions,
            timestamp: pageShowTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Page show tracked: ${pagePath}`);
        }
      }
      
      // 调用原始onShow
      if (originalOnShow) {
        originalOnShow.call(this);
      }
    };
    
    // 跟踪onReady事件
    pageConfig.onReady = function() {
      // 计算页面准备时间
      const pageReadyTime = Date.now();
      const pageReadyDuration = pageLoadTime > 0 ? pageReadyTime - pageLoadTime : 0;
      
      // 采样
      if (shouldSample(config.performance.sampleRate)) {
        // 发送页面准备事件数据
        beaconSender.send({
          type: 'performance',
          category: 'page',
          action: 'ready',
          label: pagePath,
          data: {
            path: pagePath,
            readyDuration: pageReadyDuration,
            timestamp: pageReadyTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Page ready tracked: ${pagePath}, duration: ${pageReadyDuration}ms`);
        }
      }
      
      // 调用原始onReady
      if (originalOnReady) {
        originalOnReady.call(this);
      }
    };
    
    // 跟踪onHide事件
    pageConfig.onHide = function() {
      // 计算页面停留时间
      const pageHideTime = Date.now();
      const pageStayDuration = pageShowTime > 0 ? pageHideTime - pageShowTime : 0;
      
      // 采样
      if (shouldSample(config.event.pageLeave.sampleRate)) {
        // 发送页面隐藏事件数据
        beaconSender.send({
          type: 'event',
          category: 'page',
          action: 'hide',
          label: pagePath,
          data: {
            path: pagePath,
            stayDuration: pageStayDuration,
            timestamp: pageHideTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Page hide tracked: ${pagePath}, stay duration: ${pageStayDuration}ms`);
        }
      }
      
      // 调用原始onHide
      if (originalOnHide) {
        originalOnHide.call(this);
      }
    };
    
    // 跟踪onUnload事件
    pageConfig.onUnload = function() {
      // 计算页面停留时间
      const pageUnloadTime = Date.now();
      const pageStayDuration = pageShowTime > 0 ? pageUnloadTime - pageShowTime : 0;
      
      // 采样
      if (shouldSample(config.event.pageLeave.sampleRate)) {
        // 发送页面卸载事件数据
        beaconSender.send({
          type: 'event',
          category: 'page',
          action: 'unload',
          label: pagePath,
          data: {
            path: pagePath,
            stayDuration: pageStayDuration,
            timestamp: pageUnloadTime
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Page unload tracked: ${pagePath}, stay duration: ${pageStayDuration}ms`);
        }
      }
      
      // 调用原始onUnload
      if (originalOnUnload) {
        originalOnUnload.call(this);
      }
    };
    
    // 跟踪onPullDownRefresh事件
    if (originalOnPullDownRefresh) {
      pageConfig.onPullDownRefresh = function() {
        // 采样
        if (shouldSample(config.event.pageView.sampleRate)) {
          // 发送下拉刷新事件数据
          beaconSender.send({
            type: 'event',
            category: 'interaction',
            action: 'pull_down_refresh',
            label: pagePath,
            data: {
              path: pagePath,
              timestamp: Date.now()
            }
          });
          
          if (config.debug) {
            console.log(`[AutoTracker] Pull down refresh tracked: ${pagePath}`);
          }
        }
        
        // 调用原始onPullDownRefresh
        originalOnPullDownRefresh.call(this);
      };
    }
    
    // 跟踪onReachBottom事件
    if (originalOnReachBottom) {
      pageConfig.onReachBottom = function() {
        // 采样
        if (shouldSample(config.event.pageView.sampleRate)) {
          // 发送触底事件数据
          beaconSender.send({
            type: 'event',
            category: 'interaction',
            action: 'reach_bottom',
            label: pagePath,
            data: {
              path: pagePath,
              timestamp: Date.now()
            }
          });
          
          if (config.debug) {
            console.log(`[AutoTracker] Reach bottom tracked: ${pagePath}`);
          }
        }
        
        // 调用原始onReachBottom
        originalOnReachBottom.call(this);
      };
    }
    
    // 跟踪onShareAppMessage事件
    if (originalOnShareAppMessage) {
      pageConfig.onShareAppMessage = function(res) {
        // 采样
        if (shouldSample(config.event.pageView.sampleRate)) {
          // 发送分享事件数据
          beaconSender.send({
            type: 'event',
            category: 'interaction',
            action: 'share',
            label: pagePath,
            data: {
              path: pagePath,
              from: res.from,
              target: res.target,
              webViewUrl: res.webViewUrl,
              timestamp: Date.now()
            }
          });
          
          if (config.debug) {
            console.log(`[AutoTracker] Share tracked: ${pagePath}`, res);
          }
        }
        
        // 调用原始onShareAppMessage
        return originalOnShareAppMessage.call(this, res);
      };
    }
    
    // 跟踪onTabItemTap事件
    if (originalOnTabItemTap) {
      pageConfig.onTabItemTap = function(item) {
        // 采样
        if (shouldSample(config.event.click.sampleRate)) {
          // 发送标签页点击事件数据
          beaconSender.send({
            type: 'event',
            category: 'interaction',
            action: 'tab_tap',
            label: item.text,
            data: {
              index: item.index,
              pagePath: item.pagePath,
              text: item.text,
              timestamp: Date.now()
            }
          });
          
          if (config.debug) {
            console.log('[AutoTracker] Tab item tap tracked:', item);
          }
        }
        
        // 调用原始onTabItemTap
        originalOnTabItemTap.call(this, item);
      };
    }
    
    // 调用原始Page构造函数
    return originalPage(pageConfig);
  };
  
  if (config.debug) {
    console.log('[AutoTracker] WeChat Mini Program page lifecycle tracking initialized');
  }
}
