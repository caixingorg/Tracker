/**
 * AutoTracker SDK 支付宝小程序平台错误监控模块
 */

import { 
  formatError, 
  shouldIgnoreError, 
  getErrorFingerprint,
  shouldSample
} from '@auto-tracker/utils';

/**
 * 初始化支付宝小程序平台错误监控
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
export function initErrorMonitor(config, beaconSender) {
  // 检查是否在支付宝小程序环境
  if (typeof my === 'undefined' || !my.getSystemInfo) {
    console.error('[AutoTracker] Not in Alipay Mini Program environment');
    return;
  }
  
  // 检查是否启用错误监控
  if (!config.error.enabled) {
    return;
  }
  
  // 采样
  if (!shouldSample(config.error.sampleRate)) {
    return;
  }
  
  // 已报告的错误指纹集合，用于去重
  const reportedErrors = new Set();
  
  // 当前页面报告的错误数量
  let errorCount = 0;
  
  /**
   * 处理错误
   * @param {Error|Object} error - 错误对象
   * @param {String} source - 错误来源
   */
  function handleError(error, source) {
    // 如果达到最大错误数量，不再报告
    if (errorCount >= config.error.maxErrorsPerPage) {
      return;
    }
    
    // 格式化错误信息
    const formattedError = formatAlipayError(error, source);
    
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
  
  // 监听应用级错误
  monitorAppError(config, handleError);
  
  // 监听页面级错误
  monitorPageError(config, handleError);
  
  // 监听网络请求错误
  monitorRequestError(config, handleError);
  
  // 监听Promise错误
  monitorPromiseError(config, handleError);
  
  if (config.debug) {
    console.log('[AutoTracker] Alipay Mini Program error monitor initialized');
  }
}

/**
 * 格式化支付宝小程序错误
 * @param {Error|Object} error - 错误对象
 * @param {String} source - 错误来源
 * @return {Object} 格式化后的错误信息
 */
function formatAlipayError(error, source) {
  // 如果是标准Error对象，使用通用格式化
  if (error instanceof Error) {
    return formatError(error);
  }
  
  // 支付宝小程序特有的错误格式
  let type = 'unknown_error';
  let subType = 'unknown';
  let message = '';
  let stack = '';
  
  if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object') {
    if (error.errorMessage) {
      message = error.errorMessage;
      
      // 解析错误类型
      if (message.includes('request failed')) {
        type = 'network_error';
        subType = 'request';
      } else if (message.includes('navigateTo failed')) {
        type = 'navigation_error';
        subType = 'navigate';
      } else if (message.includes('setStorage failed')) {
        type = 'storage_error';
        subType = 'set';
      } else if (message.includes('getStorage failed')) {
        type = 'storage_error';
        subType = 'get';
      }
    }
    
    if (error.stack) {
      stack = error.stack;
    }
  }
  
  // 根据来源设置类型
  if (source) {
    if (source === 'app') {
      type = 'app_error';
      subType = 'global';
    } else if (source === 'page') {
      type = 'page_error';
      subType = 'onError';
    } else if (source === 'promise') {
      type = 'promise_error';
      subType = 'unhandled';
    } else if (source === 'request') {
      type = 'network_error';
      subType = 'request';
    }
  }
  
  return {
    type,
    subType,
    message: message || 'Unknown error',
    stack,
    source: source || 'alipay',
    lineno: 0,
    colno: 0
  };
}

/**
 * 监听应用级错误
 * @param {Object} config - 配置对象
 * @param {Function} handleError - 错误处理函数
 */
function monitorAppError(config, handleError) {
  // 获取原始App构造函数
  const originalApp = App;
  
  // 重写App构造函数
  App = function(appConfig) {
    // 处理应用错误事件
    const originalOnError = appConfig.onError;
    
    appConfig.onError = function(error) {
      // 处理错误
      handleError(error, 'app');
      
      // 调用原始onError
      if (originalOnError) {
        originalOnError.call(this, error);
      }
    };
    
    // 调用原始App构造函数
    return originalApp(appConfig);
  };
  
  // 支付宝小程序全局错误监听
  if (typeof my.onError === 'function') {
    my.onError(function(error) {
      handleError(error, 'global');
    });
  }
}

/**
 * 监听页面级错误
 * @param {Object} config - 配置对象
 * @param {Function} handleError - 错误处理函数
 */
function monitorPageError(config, handleError) {
  // 获取原始Page构造函数
  const originalPage = Page;
  
  // 重写Page构造函数
  Page = function(pageConfig) {
    // 处理页面错误事件
    const originalOnError = pageConfig.onError;
    
    if (originalOnError) {
      pageConfig.onError = function(error) {
        // 处理错误
        handleError(error, 'page');
        
        // 调用原始onError
        originalOnError.call(this, error);
      };
    }
    
    // 为所有页面方法添加错误捕获
    Object.keys(pageConfig).forEach(key => {
      if (typeof pageConfig[key] === 'function' && key !== 'onError') {
        const originalMethod = pageConfig[key];
        
        pageConfig[key] = function() {
          try {
            return originalMethod.apply(this, arguments);
          } catch (error) {
            // 处理错误
            handleError(error, `page_method:${key}`);
            
            // 重新抛出错误
            throw error;
          }
        };
      }
    });
    
    // 调用原始Page构造函数
    return originalPage(pageConfig);
  };
}

/**
 * 监听网络请求错误
 * @param {Object} config - 配置对象
 * @param {Function} handleError - 错误处理函数
 */
function monitorRequestError(config, handleError) {
  // 获取原始my.request函数
  const originalRequest = my.request;
  
  // 重写my.request函数
  my.request = function(options) {
    // 创建新的失败回调
    const originalFail = options.fail;
    
    options.fail = function(error) {
      // 处理错误
      handleError(error, 'request');
      
      // 调用原始失败回调
      if (originalFail) {
        originalFail.call(this, error);
      }
    };
    
    // 调用原始my.request函数
    return originalRequest.call(this, options);
  };
}

/**
 * 监听Promise错误
 * @param {Object} config - 配置对象
 * @param {Function} handleError - 错误处理函数
 */
function monitorPromiseError(config, handleError) {
  // 重写Promise.prototype.catch
  const originalCatch = Promise.prototype.catch;
  
  Promise.prototype.catch = function(onRejected) {
    return originalCatch.call(this, function(error) {
      // 处理错误
      handleError(error, 'promise');
      
      // 调用原始onRejected
      if (onRejected) {
        return onRejected(error);
      }
      
      // 重新抛出错误
      throw error;
    });
  };
  
  // 支付宝小程序全局未处理的Promise拒绝监听
  if (typeof my.onUnhandledRejection === 'function') {
    my.onUnhandledRejection(function(res) {
      handleError(res.reason, 'unhandled_promise');
    });
  }
}
