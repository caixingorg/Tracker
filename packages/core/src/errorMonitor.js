/**
 * AutoTracker SDK 错误监控模块
 * 负责捕获和处理各种错误
 */

import { 
  formatError, 
  shouldIgnoreError, 
  getErrorFingerprint,
  shouldSample,
  detectPlatform,
  Platform
} from '@auto-tracker/utils';

/**
 * 初始化错误监控
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 * @return {Object} 错误监控实例
 */
export function initErrorMonitor(config, beaconSender) {
  // 检查平台
  const platform = detectPlatform();
  
  // 只在Web平台初始化错误监控
  if (platform !== Platform.WEB) {
    if (config.debug) {
      console.log(`[AutoTracker] Error monitor not initialized for platform: ${platform}`);
    }
    return {
      reportError: () => {},
      isInitialized: false
    };
  }
  
  // 检查是否启用错误监控
  if (!config.error || !config.error.enabled) {
    return {
      reportError: () => {},
      isInitialized: false
    };
  }
  
  // 采样
  if (!shouldSample(config.error.sampleRate)) {
    return {
      reportError: () => {},
      isInitialized: false
    };
  }
  
  // 已报告的错误指纹集合，用于去重
  const reportedErrors = new Set();
  
  // 当前页面报告的错误数量
  let errorCount = 0;
  
  /**
   * 处理错误
   * @param {Error|Event} error - 错误对象或错误事件
   * @param {String} source - 错误来源
   */
  function handleError(error, source) {
    // 如果达到最大错误数量，不再报告
    if (errorCount >= config.error.maxErrorsPerPage) {
      return;
    }
    
    // 格式化错误信息
    const formattedError = formatError(error);
    
    // 检查是否应该忽略该错误
    if (shouldIgnoreError(formattedError, config.error.ignoreErrors)) {
      if (config.debug) {
        console.log('[AutoTracker] Error ignored:', formattedError.message);
      }
      return;
    }
    
    // 生成错误指纹
    const fingerprint = getErrorFingerprint(formattedError);
    
    // 检查是否已经报告过该错误
    if (reportedErrors.has(fingerprint)) {
      return;
    }
    
    // 记录错误指纹
    reportedErrors.add(fingerprint);
    
    // 增加错误计数
    errorCount++;
    
    // 发送错误数据
    beaconSender.send({
      type: 'error',
      category: formattedError.type,
      action: formattedError.subType,
      label: formattedError.message,
      data: {
        ...formattedError,
        fingerprint,
        source: source || formattedError.source
      }
    });
    
    if (config.debug) {
      console.log(`[AutoTracker] Error tracked (${errorCount}/${config.error.maxErrorsPerPage}):`, formattedError);
    }
  }
  
  // 监听全局错误
  if (config.error.types.jsError) {
    window.addEventListener('error', (event) => {
      // 如果是资源加载错误
      if (event.target && (event.target.nodeName === 'SCRIPT' || 
                          event.target.nodeName === 'LINK' || 
                          event.target.nodeName === 'IMG')) {
        if (config.error.types.resourceError) {
          handleError(event, 'resource_error');
        }
      } else {
        handleError(event, 'js_error');
      }
    }, true);
  }
  
  // 监听未处理的Promise拒绝
  if (config.error.types.promiseError) {
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event, 'promise_error');
    });
  }
  
  // 监听AJAX/Fetch错误
  if (config.error.types.ajaxError) {
    // 拦截XMLHttpRequest
    if (window.XMLHttpRequest) {
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;
      
      XMLHttpRequest.prototype.open = function(method, url) {
        this._autoTrackerMethod = method;
        this._autoTrackerUrl = url;
        return originalXHROpen.apply(this, arguments);
      };
      
      XMLHttpRequest.prototype.send = function() {
        const xhr = this;
        
        // 监听加载错误
        xhr.addEventListener('error', function() {
          handleError({
            name: 'AjaxError',
            message: `Failed to load ${xhr._autoTrackerUrl}`,
            stack: `XMLHttpRequest.send (${xhr._autoTrackerMethod} ${xhr._autoTrackerUrl})`
          }, 'ajax_error');
        });
        
        // 监听超时
        xhr.addEventListener('timeout', function() {
          handleError({
            name: 'AjaxTimeoutError',
            message: `Request timeout for ${xhr._autoTrackerUrl}`,
            stack: `XMLHttpRequest.send (${xhr._autoTrackerMethod} ${xhr._autoTrackerUrl})`
          }, 'ajax_error');
        });
        
        // 监听HTTP错误
        xhr.addEventListener('load', function() {
          if (xhr.status >= 400) {
            handleError({
              name: 'AjaxHttpError',
              message: `HTTP ${xhr.status} for ${xhr._autoTrackerUrl}`,
              stack: `XMLHttpRequest.send (${xhr._autoTrackerMethod} ${xhr._autoTrackerUrl})`
            }, 'ajax_error');
          }
        });
        
        return originalXHRSend.apply(this, arguments);
      };
    }
    
    // 拦截Fetch
    if (window.fetch) {
      const originalFetch = window.fetch;
      
      window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        const method = init && init.method ? init.method : 'GET';
        
        return originalFetch.apply(this, arguments)
          .then(response => {
            if (!response.ok) {
              handleError({
                name: 'FetchHttpError',
                message: `HTTP ${response.status} for ${url}`,
                stack: `fetch (${method} ${url})`
              }, 'ajax_error');
            }
            return response;
          })
          .catch(error => {
            handleError({
              name: 'FetchError',
              message: error.message || `Failed to fetch ${url}`,
              stack: error.stack || `fetch (${method} ${url})`
            }, 'ajax_error');
            throw error;
          });
      };
    }
  }
  
  if (config.debug) {
    console.log('[AutoTracker] Error monitor initialized');
  }
  
  // 返回错误监控实例
  return {
    reportError: (error, source = 'custom_error') => {
      handleError(error, source);
    },
    isInitialized: true
  };
}
