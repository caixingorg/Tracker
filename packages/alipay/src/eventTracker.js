/**
 * AutoTracker SDK 支付宝小程序平台事件跟踪模块
 */

import { shouldSample } from '@auto-tracker/utils';

/**
 * 初始化支付宝小程序平台事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
export function initEventTracker(config, beaconSender) {
  // 检查是否在支付宝小程序环境
  if (typeof my === 'undefined' || !my.getSystemInfo) {
    console.error('[AutoTracker] Not in Alipay Mini Program environment');
    return;
  }
  
  // 初始化点击事件跟踪
  if (config.event.click.enabled) {
    initTapTracking(config, beaconSender);
  }
  
  if (config.debug) {
    console.log('[AutoTracker] Alipay Mini Program event tracker initialized');
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
      
      // 使用支付宝小程序的事件捕获阶段监听点击事件
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
      // 支付宝小程序不支持像微信小程序那样的选择器查询，
      // 所以我们需要在AXML模板中手动添加bindtap="onAutoTrackerTap"
      // 这里我们提供一个全局的点击处理函数
      page.onAutoTrackerTap = function(e) {
        page._autoTrackerTapHandler(e);
      };
    };
    
    // 处理页面卸载事件
    const originalOnUnload = pageConfig.onUnload;
    
    pageConfig.onUnload = function() {
      // 移除点击事件监听
      this._autoTrackerTapHandler = null;
      
      // 调用原始onUnload
      if (originalOnUnload) {
        originalOnUnload.call(this);
      }
    };
    
    // 调用原始Page构造函数
    return originalPage(pageConfig);
  };
  
  // 获取原始Component构造函数
  const originalComponent = Component;
  
  // 重写Component构造函数
  Component = function(componentConfig) {
    // 添加点击事件处理方法
    if (!componentConfig.methods) {
      componentConfig.methods = {};
    }
    
    componentConfig.methods.onAutoTrackerTap = function(e) {
      // 采样
      if (!shouldSample(config.event.click.sampleRate)) {
        return;
      }
      
      // 获取事件信息
      const target = e.target || {};
      const dataset = target.dataset || {};
      
      // 检查是否应该忽略该元素
      if (dataset.autoTrackerIgnore === true || dataset.autoTrackerIgnore === 'true') {
        return;
      }
      
      // 获取元素信息
      const elementInfo = {
        id: target.id || '',
        tagName: 'component',
        className: target.className || '',
        dataset: { ...dataset }
      };
      
      // 获取页面实例
      const page = this.$page || {};
      
      // 发送点击事件数据
      beaconSender.send({
        type: 'event',
        category: 'interaction',
        action: 'tap',
        label: elementInfo.id || 'component',
        data: {
          element: elementInfo,
          page: {
            route: page.route,
            options: page.options
          },
          position: {
            x: e.detail.x,
            y: e.detail.y
          }
        }
      });
      
      if (config.debug) {
        console.log('[AutoTracker] Component tap tracked:', elementInfo);
      }
    };
    
    // 调用原始Component构造函数
    return originalComponent(componentConfig);
  };
}
