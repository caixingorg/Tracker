/**
 * AutoTracker SDK 微信小程序平台事件跟踪模块
 */

import { shouldSample } from '@auto-tracker/utils';

/**
 * 初始化微信小程序平台事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
export function initEventTracker(config, beaconSender) {
  // 检查是否在微信小程序环境
  if (typeof wx === 'undefined' || !wx.getSystemInfo) {
    console.error('[AutoTracker] Not in WeChat Mini Program environment');
    return;
  }
  
  // 初始化点击事件跟踪
  if (config.event.click.enabled) {
    initTapTracking(config, beaconSender);
  }
  
  if (config.debug) {
    console.log('[AutoTracker] WeChat Mini Program event tracker initialized');
  }
}

/**
 * 初始化点击事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function initTapTracking(config, beaconSender) {
  // 获取原始Page构造函数
  const originalPage = Page;
  
  // 重写Page构造函数
  Page = function(pageConfig) {
    // 处理页面点击事件
    const originalOnLoad = pageConfig.onLoad;
    
    pageConfig.onLoad = function(options) {
      // 调用原始onLoad
      if (originalOnLoad) {
        originalOnLoad.call(this, options);
      }
      
      // 添加点击事件监听
      const page = this;
      
      // 使用微信小程序的事件捕获阶段监听点击事件
      page._autoTrackerTapHandler = function(e) {
        // 采样
        if (!shouldSample(config.event.click.sampleRate)) {
          return;
        }
        
        // 获取事件信息
        const target = e.target || {};
        const currentTarget = e.currentTarget || {};
        const dataset = target.dataset || {};
        
        // 检查是否应该忽略该元素
        if (dataset.autoTrackerIgnore === true || dataset.autoTrackerIgnore === 'true') {
          return;
        }
        
        // 获取元素信息
        const elementInfo = {
          id: target.id || '',
          tagName: target.tagName || 'unknown',
          className: target.className || '',
          dataset: { ...dataset }
        };
        
        // 发送点击事件数据
        beaconSender.send({
          type: 'event',
          category: 'interaction',
          action: 'tap',
          label: elementInfo.id || elementInfo.tagName,
          data: {
            element: elementInfo,
            page: {
              route: page.route,
              options: options
            },
            position: {
              x: e.detail.x,
              y: e.detail.y
            }
          }
        });
        
        if (config.debug) {
          console.log('[AutoTracker] Tap tracked:', elementInfo);
        }
      };
      
      // 监听页面中的所有点击事件
      wx.createSelectorQuery()
        .selectAll('*')
        .fields({
          id: true,
          dataset: true,
          rect: true,
          size: true,
          properties: ['className', 'tagName']
        })
        .exec(function(res) {
          if (Array.isArray(res) && res[0]) {
            res[0].forEach(function(element) {
              if (element.id) {
                page.selectComponent('#' + element.id)?.on('tap', page._autoTrackerTapHandler);
              }
            });
          }
        });
    };
    
    // 处理页面卸载事件
    const originalOnUnload = pageConfig.onUnload;
    
    pageConfig.onUnload = function() {
      // 移除点击事件监听
      if (this._autoTrackerTapHandler) {
        wx.createSelectorQuery()
          .selectAll('*')
          .fields({
            id: true
          })
          .exec((res) => {
            if (Array.isArray(res) && res[0]) {
              res[0].forEach((element) => {
                if (element.id) {
                  this.selectComponent('#' + element.id)?.off('tap', this._autoTrackerTapHandler);
                }
              });
            }
          });
      }
      
      // 调用原始onUnload
      if (originalOnUnload) {
        originalOnUnload.call(this);
      }
    };
    
    // 调用原始Page构造函数
    return originalPage(pageConfig);
  };
}
