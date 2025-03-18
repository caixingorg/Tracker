/**
 * 点击热图功能模块
 */

import { throttle } from '@auto-tracker/utils';

let clickData = [];
let isRecording = false;
let config = {};
let beaconSender = null;
let handleClick = null;

/**
 * 初始化热图功能
 * @param {Object} sdkConfig - SDK配置
 * @param {Object} sender - 数据上报实例
 */
export function initHeatmap(sdkConfig, sender) {
  config = sdkConfig;
  beaconSender = sender;
  
  if (config.heatmap && config.heatmap.enabled) {
    startRecording();
  }
  
  return {
    startRecording,
    stopRecording,
    getClickData
  };
}

/**
 * 开始记录点击数据
 */
function startRecording() {
  if (isRecording) return;
  
  isRecording = true;
  clickData = [];
  
  // 使用节流函数避免过多事件
  handleClick = throttle((event) => {
    const { clientX, clientY, target } = event;
    const { scrollX, scrollY, innerWidth, innerHeight } = window;
    
    // 获取元素路径
    const path = getElementPath(target);
    
    // 计算相对坐标（百分比）
    const relativeX = (clientX + scrollX) / document.documentElement.scrollWidth;
    const relativeY = (clientY + scrollY) / document.documentElement.scrollHeight;
    
    const clickInfo = {
      x: clientX,
      y: clientY,
      relativeX,
      relativeY,
      path,
      timestamp: Date.now(),
      url: window.location.href,
      viewport: {
        width: innerWidth,
        height: innerHeight
      },
      pageSize: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      }
    };
    
    clickData.push(clickInfo);
    
    // 上报点击数据
    if (beaconSender) {
      beaconSender.send({
        type: 'heatmap',
        subType: 'click',
        data: clickInfo,
        timestamp: Date.now()
      });
    }
    
  }, config.heatmap?.throttleTime || 200);
  
  document.addEventListener('click', handleClick, true);
  
  if (config.debug) {
    console.log('[AutoTracker] Heatmap recording started');
  }
}

/**
 * 停止记录点击数据
 */
function stopRecording() {
  isRecording = false;
  document.removeEventListener('click', handleClick, true);
  
  if (config.debug) {
    console.log('[AutoTracker] Heatmap recording stopped');
  }
}

/**
 * 获取当前记录的点击数据
 * @return {Array} 点击数据数组
 */
function getClickData() {
  return clickData;
}

/**
 * 获取元素的CSS选择器路径
 * @param {HTMLElement} element - DOM元素
 * @return {String} 元素路径
 */
function getElementPath(element) {
  if (!element || element === document || element === window) return '';
  
  // 如果元素有ID，直接使用ID选择器
  if (element.id) {
    return `#${element.id}`;
  }
  
  // 否则，获取元素的标签名和类名
  let path = element.tagName.toLowerCase();
  
  if (element.className) {
    const classes = element.className.split(/\s+/).filter(Boolean);
    if (classes.length) {
      path += `.${classes.join('.')}`;
    }
  }
  
  // 如果有父元素，递归获取父元素路径
  if (element.parentNode) {
    const parentPath = getElementPath(element.parentNode);
    if (parentPath) {
      path = `${parentPath} > ${path}`;
    }
  }
  
  return path;
}
