/**
 * 会话指标跟踪模块
 * 包括跳出率、会话时长、页面停留时间等指标
 */

import { generateUUID } from '@auto-tracker/utils';

let config = {};
let beaconSender = null;
let sessionStartTime = 0;
let lastActivityTime = 0;
let currentPageStartTime = 0;
let pageInteractions = 0;
let pageViews = 0;
let sessionId = '';
let currentPageUrl = '';
let isFirstVisit = false;

/**
 * 初始化会话指标跟踪
 * @param {Object} sdkConfig - SDK配置
 * @param {Object} sender - 数据上报实例
 */
export function initSessionMetrics(sdkConfig, sender) {
  config = sdkConfig;
  beaconSender = sender;
  
  // 生成或恢复会话ID
  sessionId = getOrCreateSessionId();
  
  // 检查是否首次访问
  isFirstVisit = checkIfFirstVisit();
  
  // 记录会话开始时间
  sessionStartTime = Date.now();
  lastActivityTime = sessionStartTime;
  
  // 记录当前页面信息
  currentPageUrl = window.location.href;
  currentPageStartTime = sessionStartTime;
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 监听页面卸载
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // 监听用户交互
  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('scroll', handleUserInteraction);
  document.addEventListener('keydown', handleUserInteraction);
  
  // 记录页面访问
  trackPageView();
  
  if (config.debug) {
    console.log('[AutoTracker] Session metrics tracking initialized', {
      sessionId,
      isFirstVisit
    });
  }
  
  return {
    getSessionId,
    getSessionDuration,
    getPageViewCount,
    getBounceRate
  };
}

/**
 * 处理页面可见性变化
 */
function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    // 页面隐藏时，记录页面停留时间
    trackPageLeave();
  } else if (document.visibilityState === 'visible') {
    // 页面可见时，更新页面开始时间
    currentPageStartTime = Date.now();
    lastActivityTime = currentPageStartTime;
  }
}

/**
 * 处理页面卸载
 */
function handleBeforeUnload() {
  // 页面卸载时，记录页面停留时间和会话结束
  trackPageLeave();
  trackSessionEnd();
}

/**
 * 处理用户交互
 */
function handleUserInteraction() {
  pageInteractions++;
  lastActivityTime = Date.now();
}

/**
 * 记录页面访问
 */
function trackPageView() {
  pageViews++;
  
  if (beaconSender) {
    beaconSender.send({
      type: 'session',
      subType: 'pageView',
      sessionId,
      url: currentPageUrl,
      referrer: document.referrer,
      timestamp: Date.now(),
      isFirstVisit,
      data: {
        title: document.title
      }
    });
  }
}

/**
 * 记录页面离开
 */
function trackPageLeave() {
  const now = Date.now();
  const pageStayDuration = now - currentPageStartTime;
  const isBounce = pageInteractions === 0;
  
  if (beaconSender) {
    beaconSender.send({
      type: 'session',
      subType: 'pageLeave',
      sessionId,
      url: currentPageUrl,
      timestamp: now,
      data: {
        duration: pageStayDuration,
        interactions: pageInteractions,
        isBounce
      }
    });
  }
}

/**
 * 记录会话结束
 */
function trackSessionEnd() {
  const now = Date.now();
  const sessionDuration = now - sessionStartTime;
  
  if (beaconSender) {
    beaconSender.send({
      type: 'session',
      subType: 'sessionEnd',
      sessionId,
      timestamp: now,
      data: {
        duration: sessionDuration,
        pageViews,
        bounceRate: getBounceRate()
      }
    });
  }
}

/**
 * 获取或创建会话ID
 * @return {String} 会话ID
 */
function getOrCreateSessionId() {
  let id = '';
  
  try {
    // 尝试从sessionStorage获取会话ID
    id = sessionStorage.getItem('autotracker_session_id');
    
    if (!id) {
      // 如果没有会话ID，生成一个新的
      id = generateUUID();
      sessionStorage.setItem('autotracker_session_id', id);
    }
  } catch (error) {
    // 如果无法访问sessionStorage，生成一个临时ID
    id = generateUUID();
    
    if (config.debug) {
      console.error('[AutoTracker] Failed to access sessionStorage:', error);
    }
  }
  
  return id;
}

/**
 * 检查是否首次访问
 * @return {Boolean} 是否首次访问
 */
function checkIfFirstVisit() {
  let firstVisit = false;
  
  try {
    // 尝试从localStorage获取访问记录
    const visited = localStorage.getItem('autotracker_visited');
    
    if (!visited) {
      // 如果没有访问记录，标记为首次访问
      firstVisit = true;
      localStorage.setItem('autotracker_visited', 'true');
    }
  } catch (error) {
    // 如果无法访问localStorage，默认为非首次访问
    if (config.debug) {
      console.error('[AutoTracker] Failed to access localStorage:', error);
    }
  }
  
  return firstVisit;
}

/**
 * 获取会话ID
 * @return {String} 会话ID
 */
function getSessionId() {
  return sessionId;
}

/**
 * 获取会话持续时间
 * @return {Number} 会话持续时间（毫秒）
 */
function getSessionDuration() {
  return Date.now() - sessionStartTime;
}

/**
 * 获取页面访问次数
 * @return {Number} 页面访问次数
 */
function getPageViewCount() {
  return pageViews;
}

/**
 * 获取跳出率
 * @return {Number} 跳出率（0-1之间的小数）
 */
function getBounceRate() {
  if (pageViews === 0) return 0;
  
  // 计算跳出率：没有交互的页面访问次数 / 总页面访问次数
  const bounceCount = pageViews - pageInteractions;
  return Math.max(0, Math.min(1, bounceCount / pageViews));
}
