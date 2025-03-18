/**
 * AutoTracker SDK 事件跟踪模块
 * 负责监听和处理各种用户交互事件
 */

import { 
  generateSelector, 
  throttle, 
  shouldSample,
  detectPlatform,
  Platform
} from '@auto-tracker/utils';

/**
 * 初始化事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 * @return {Object} 事件跟踪实例
 */
export function initEventTracker(config, beaconSender) {
  // 检查平台
  const platform = detectPlatform();
  
  // 只在Web平台初始化DOM事件监听
  if (platform !== Platform.WEB) {
    if (config.debug) {
      console.log(`[AutoTracker] Event tracker not initialized for platform: ${platform}`);
    }
    return {
      trackEvent: () => {},
      isInitialized: false
    };
  }
  
  // 初始化点击事件跟踪
  if (config.event && config.event.click && config.event.click.enabled) {
    initClickTracking(config, beaconSender);
  }
  
  // 初始化滚动事件跟踪
  if (config.event && config.event.scroll && config.event.scroll.enabled) {
    initScrollTracking(config, beaconSender);
  }
  
  // 初始化页面浏览事件跟踪
  if (config.event && config.event.pageView && config.event.pageView.enabled) {
    trackPageView(config, beaconSender);
  }
  
  // 初始化页面离开事件跟踪
  if (config.event && config.event.pageLeave && config.event.pageLeave.enabled) {
    initPageLeaveTracking(config, beaconSender);
  }
  
  if (config.debug) {
    console.log('[AutoTracker] Event tracker initialized');
  }
  
  // 返回事件跟踪实例
  return {
    trackEvent: (eventName, eventData = {}) => {
      beaconSender.send({
        type: 'event',
        category: 'custom',
        action: eventName,
        data: eventData
      });
    },
    isInitialized: true
  };
}

/**
 * 初始化点击事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function initClickTracking(config, beaconSender) {
  document.addEventListener('click', (event) => {
    // 采样
    if (!shouldSample(config.event.click.sampleRate)) {
      return;
    }
    
    const target = event.target;
    
    // 检查是否应该忽略该元素
    if (shouldIgnoreElement(target, config.event.click.ignoreSelectors)) {
      return;
    }
    
    // 获取元素选择器
    const selector = generateSelector(target);
    
    // 获取元素文本内容
    let text = '';
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      text = target.placeholder || '';
    } else if (target.tagName === 'A') {
      text = target.textContent || target.innerText || '';
    } else {
      text = target.textContent || target.innerText || '';
    }
    
    // 获取元素属性
    const attributes = {};
    if (target.hasAttributes()) {
      for (const attr of target.attributes) {
        if (attr.name === 'data-auto-tracker-event') {
          attributes.eventName = attr.value;
        } else if (attr.name === 'data-auto-tracker-value') {
          attributes.eventValue = attr.value;
        } else if (attr.name.startsWith('data-auto-tracker-')) {
          const key = attr.name.replace('data-auto-tracker-', '');
          attributes[key] = attr.value;
        } else if (attr.name === 'href' || attr.name === 'src' || attr.name === 'id' || attr.name === 'class') {
          attributes[attr.name] = attr.value;
        }
      }
    }
    
    // 发送点击事件数据
    beaconSender.send({
      type: 'event',
      category: 'interaction',
      action: 'click',
      label: selector,
      data: {
        selector,
        text: text.trim().substring(0, 100),
        tagName: target.tagName.toLowerCase(),
        attributes,
        position: {
          x: event.clientX,
          y: event.clientY
        }
      }
    });
  }, { passive: true });
}

/**
 * 初始化滚动事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function initScrollTracking(config, beaconSender) {
  // 已报告的滚动百分比
  const reportedScrollPercents = new Set();
  
  // 节流处理滚动事件
  const handleScroll = throttle(() => {
    // 采样
    if (!shouldSample(config.event.scroll.sampleRate)) {
      return;
    }
    
    // 计算滚动百分比
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop = window.scrollY;
    const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);
    
    // 检查是否达到需要报告的百分比
    for (const percent of config.event.scroll.reportPercents) {
      if (scrollPercent >= percent && !reportedScrollPercents.has(percent)) {
        reportedScrollPercents.add(percent);
        
        // 发送滚动事件数据
        beaconSender.send({
          type: 'event',
          category: 'interaction',
          action: 'scroll',
          label: `${percent}%`,
          data: {
            scrollPercent: percent,
            scrollPixels: scrollTop,
            scrollHeight: scrollHeight,
            viewportHeight: window.innerHeight
          }
        });
        
        if (config.debug) {
          console.log(`[AutoTracker] Scroll tracked: ${percent}%`);
        }
      }
    }
  }, config.event.scroll.throttleTime);
  
  // 监听滚动事件
  window.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * 跟踪页面浏览事件
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function trackPageView(config, beaconSender) {
  // 采样
  if (!shouldSample(config.event.pageView.sampleRate)) {
    return;
  }
  
  // 发送页面浏览事件数据
  beaconSender.send({
    type: 'event',
    category: 'page',
    action: 'view',
    label: document.title || window.location.pathname,
    data: {
      title: document.title,
      url: window.location.href,
      referrer: document.referrer
    }
  });
  
  if (config.debug) {
    console.log('[AutoTracker] Page view tracked');
  }
}

/**
 * 初始化页面离开事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function initPageLeaveTracking(config, beaconSender) {
  // 页面加载时间
  const pageLoadTime = Date.now();
  
  // 监听页面卸载事件
  window.addEventListener('beforeunload', () => {
    // 采样
    if (!shouldSample(config.event.pageLeave.sampleRate)) {
      return;
    }
    
    // 计算页面停留时间
    const stayTime = Date.now() - pageLoadTime;
    
    // 发送页面离开事件数据
    beaconSender.send({
      type: 'event',
      category: 'page',
      action: 'leave',
      label: document.title || window.location.pathname,
      data: {
        title: document.title,
        url: window.location.href,
        stayTime: stayTime,
        stayTimeFormatted: formatTime(stayTime)
      }
    });
    
    // 立即发送数据
    beaconSender.flush();
  });
}

/**
 * 检查是否应该忽略元素
 * @param {HTMLElement} element - DOM元素
 * @param {Array} ignoreSelectors - 忽略的选择器列表
 * @return {Boolean} 是否应该忽略
 */
function shouldIgnoreElement(element, ignoreSelectors) {
  if (!element || !ignoreSelectors) return false;
  
  // 检查元素是否匹配忽略选择器
  for (const selector of ignoreSelectors) {
    if (element.matches && element.matches(selector)) {
      return true;
    }
  }
  
  // 检查元素的父元素是否有data-auto-tracker-ignore属性
  let parent = element.parentElement;
  while (parent) {
    if (parent.hasAttribute && parent.hasAttribute('data-auto-tracker-ignore')) {
      return true;
    }
    parent = parent.parentElement;
  }
  
  return false;
}

/**
 * 格式化时间
 * @param {Number} ms - 毫秒数
 * @return {String} 格式化后的时间
 */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}时${remainingMinutes}分${remainingSeconds}秒`;
}
