/**
 * AutoTracker SDK 错误监控模块
 * 负责监控和收集各种错误信息，如JS错误、Promise错误、资源加载错误等
 */

import { getErrorFingerprint, formatError, shouldIgnoreError, shouldSample } from './utils.js';
import config from '../config.js';

/**
 * 错误监控类
 */
export default class ErrorMonitor {
  /**
   * 构造函数
   * @param {Function} reportCallback - 数据上报回调函数
   */
  constructor(reportCallback) {
    this.reportCallback = reportCallback;
    this.isInitialized = false;
    this.errorCache = new Map(); // 用于存储已上报的错误指纹，避免重复上报
    this.errorCount = 0; // 错误计数
    this.errorCountStartTime = Date.now(); // 错误计数开始时间
    this.sourceMapCache = new Map(); // 用于缓存SourceMap
    this.consoleErrorOriginal = null; // 原始的console.error方法
    this.breadcrumbs = []; // 用户行为记录，用于错误上下文
    
    // 检查是否支持SourceMap解析
    this.isSourceMapSupported = config.errors.sourceMap && 'fetch' in window;
  }
  
  /**
   * 初始化错误监控
   */
  init() {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    
    // 监听全局错误
    if (config.errors.jsError) {
      this.listenJSErrors();
    }
    
    // 监听Promise错误
    if (config.errors.promiseError) {
      this.listenPromiseErrors();
    }
    
    // 监听资源加载错误
    if (config.errors.resourceError) {
      this.listenResourceErrors();
    }
    
    // 监听AJAX错误
    if (config.errors.ajaxError) {
      this.listenAjaxErrors();
    }
    
    // 监听Console错误
    if (config.errors.consoleError) {
      this.listenConsoleErrors();
    }
    
    // 定期重置错误计数
    setInterval(() => {
      this.errorCount = 0;
      this.errorCountStartTime = Date.now();
    }, 60000); // 每分钟重置一次
  }
  
  /**
   * 监听JS错误
   */
  listenJSErrors() {
    window.addEventListener('error', event => {
      // 如果是资源加载错误，由listenResourceErrors处理
      if (event.target && (
        event.target.nodeName === 'SCRIPT' ||
        event.target.nodeName === 'LINK' ||
        event.target.nodeName === 'IMG' ||
        event.target.nodeName === 'AUDIO' ||
        event.target.nodeName === 'VIDEO'
      )) {
        return;
      }
      
      this.handleError(event);
    }, true);
  }
  
  /**
   * 监听Promise错误
   */
  listenPromiseErrors() {
    window.addEventListener('unhandledrejection', event => {
      this.handleError(event);
    });
  }
  
  /**
   * 监听资源加载错误
   */
  listenResourceErrors() {
    window.addEventListener('error', event => {
      // 只处理资源加载错误
      if (event.target && (
        event.target.nodeName === 'SCRIPT' ||
        event.target.nodeName === 'LINK' ||
        event.target.nodeName === 'IMG' ||
        event.target.nodeName === 'AUDIO' ||
        event.target.nodeName === 'VIDEO'
      )) {
        this.handleError(event);
      }
    }, true);
  }
  
  /**
   * 监听AJAX错误
   */
  listenAjaxErrors() {
    // 保存原始方法
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalFetch = window.fetch;
    
    // 重写XMLHttpRequest.open方法
    XMLHttpRequest.prototype.open = function(...args) {
      // 保存请求信息
      this._autoTracker = {
        method: args[0],
        url: args[1],
        startTime: Date.now()
      };
      
      // 调用原始方法
      return originalXHROpen.apply(this, args);
    };
    
    // 重写XMLHttpRequest.send方法
    XMLHttpRequest.prototype.send = function(data) {
      if (this._autoTracker) {
        // 保存请求数据
        this._autoTracker.data = data;
        
        // 监听load事件
        this.addEventListener('load', () => {
          // 如果状态码不是2xx，则认为是错误
          if (this.status < 200 || this.status >= 300) {
            const error = new Error(`XHR Error: ${this.status} ${this.statusText}`);
            error.request = {
              method: this._autoTracker.method,
              url: this._autoTracker.url,
              data: this._autoTracker.data,
              status: this.status,
              statusText: this.statusText,
              response: this.response,
              duration: Date.now() - this._autoTracker.startTime
            };
            
            this._autoTracker.self = this;
            
            // 处理错误
            ErrorMonitor.prototype.handleError.call(ErrorMonitor.prototype, error);
          }
        });
        
        // 监听error事件
        this.addEventListener('error', () => {
          const error = new Error('XHR Network Error');
          error.request = {
            method: this._autoTracker.method,
            url: this._autoTracker.url,
            data: this._autoTracker.data,
            duration: Date.now() - this._autoTracker.startTime
          };
          
          // 处理错误
          ErrorMonitor.prototype.handleError.call(ErrorMonitor.prototype, error);
        });
        
        // 监听timeout事件
        this.addEventListener('timeout', () => {
          const error = new Error('XHR Timeout');
          error.request = {
            method: this._autoTracker.method,
            url: this._autoTracker.url,
            data: this._autoTracker.data,
            duration: Date.now() - this._autoTracker.startTime
          };
          
          // 处理错误
          ErrorMonitor.prototype.handleError.call(ErrorMonitor.prototype, error);
        });
        
        // 监听abort事件
        this.addEventListener('abort', () => {
          const error = new Error('XHR Aborted');
          error.request = {
            method: this._autoTracker.method,
            url: this._autoTracker.url,
            data: this._autoTracker.data,
            duration: Date.now() - this._autoTracker.startTime
          };
          
          // 处理错误
          ErrorMonitor.prototype.handleError.call(ErrorMonitor.prototype, error);
        });
      }
      
      // 调用原始方法
      return originalXHRSend.apply(this, arguments);
    };
    
    // 重写fetch方法
    window.fetch = function(input, init) {
      const startTime = Date.now();
      const method = init && init.method ? init.method : 'GET';
      const url = typeof input === 'string' ? input : input.url;
      const data = init && init.body ? init.body : null;
      
      // 调用原始方法
      return originalFetch.apply(this, arguments)
        .then(response => {
          // 如果状态码不是2xx，则认为是错误
          if (!response.ok) {
            const error = new Error(`Fetch Error: ${response.status} ${response.statusText}`);
            error.request = {
              method,
              url,
              data,
              status: response.status,
              statusText: response.statusText,
              duration: Date.now() - startTime
            };
            
            // 处理错误
            ErrorMonitor.prototype.handleError.call(ErrorMonitor.prototype, error);
          }
          
          return response;
        })
        .catch(error => {
          // 添加请求信息
          error.request = {
            method,
            url,
            data,
            duration: Date.now() - startTime
          };
          
          // 处理错误
          ErrorMonitor.prototype.handleError.call(ErrorMonitor.prototype, error);
          
          // 继续抛出错误，不影响原有逻辑
          throw error;
        });
    };
  }
  
  /**
   * 监听Console错误
   */
  listenConsoleErrors() {
    // 保存原始方法
    this.consoleErrorOriginal = console.error;
    
    // 重写console.error方法
    console.error = (...args) => {
      // 调用原始方法
      this.consoleErrorOriginal.apply(console, args);
      
      // 处理错误
      const error = args[0] instanceof Error ? args[0] : new Error(args.join(' '));
      error.fromConsole = true;
      
      this.handleError(error);
    };
  }
  
  /**
   * 处理错误
   * @param {Error|Event} errorOrEvent - 错误对象或错误事件
   */
  handleError(errorOrEvent) {
    // 检查是否应该采样
    if (!shouldSample(config.sampling.error)) {
      return;
    }
    
    try {
      // 格式化错误信息
      const formattedError = formatError(errorOrEvent);
      
      // 检查是否应该忽略错误
      if (shouldIgnoreError(formattedError, config.errors.ignoreErrors)) {
        return;
      }
      
      // 生成错误指纹
      const fingerprint = getErrorFingerprint(formattedError);
      
      // 检查是否已经上报过该错误
      if (this.errorCache.has(fingerprint)) {
        // 更新错误次数
        const cachedError = this.errorCache.get(fingerprint);
        cachedError.count++;
        cachedError.lastSeen = Date.now();
        
        // 如果错误次数超过阈值，则重新上报
        if (cachedError.count % 10 === 0) {
          this.reportError({
            ...formattedError,
            fingerprint,
            count: cachedError.count,
            firstSeen: cachedError.firstSeen,
            lastSeen: cachedError.lastSeen
          });
        }
        
        return;
      }
      
      // 缓存错误
      this.errorCache.set(fingerprint, {
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
      
      // 增加错误计数
      this.errorCount++;
      
      // 检查是否超过告警阈值
      const timeSinceStart = Date.now() - this.errorCountStartTime;
      const errorsPerMinute = (this.errorCount / timeSinceStart) * 60000;
      
      if (errorsPerMinute > config.errors.alertThreshold) {
        formattedError.alert = true;
      }
      
      // 如果支持SourceMap解析，则尝试解析
      if (this.isSourceMapSupported && formattedError.stack) {
        this.parseStackWithSourceMap(formattedError, fingerprint);
      } else {
        // 直接上报错误
        this.reportError({
          ...formattedError,
          fingerprint,
          count: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now()
        });
      }
    } catch (e) {
      // 处理错误时出错，直接上报原始错误
      console.error('Error in handleError:', e);
      
      if (this.reportCallback) {
        this.reportCallback({
          type: 'error',
          subType: 'monitor_error',
          timestamp: Date.now(),
          data: {
            message: e.message,
            stack: e.stack,
            originalError: errorOrEvent instanceof Error ? errorOrEvent.message : 'Non-Error object'
          }
        });
      }
    }
  }
  
  /**
   * 使用SourceMap解析堆栈
   * @param {Object} formattedError - 格式化后的错误信息
   * @param {String} fingerprint - 错误指纹
   */
  parseStackWithSourceMap(formattedError, fingerprint) {
    // 提取堆栈信息
    const stackLines = formattedError.stack.split('\n');
    const parsedStack = [];
    const fetchPromises = [];
    
    // 解析每一行堆栈
    stackLines.forEach(line => {
      // 匹配堆栈行
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (!match) return;
      
      const [_, functionName, fileName, lineNumber, columnNumber] = match;
      
      // 检查是否是内部脚本
      if (fileName.startsWith('http') || fileName.startsWith('https')) {
        // 构造SourceMap URL
        const sourceMapUrl = `${fileName}.map`;
        
        // 检查是否已经缓存了SourceMap
        if (!this.sourceMapCache.has(sourceMapUrl)) {
          // 获取SourceMap
          const fetchPromise = fetch(sourceMapUrl)
            .then(response => response.json())
            .then(sourceMap => {
              this.sourceMapCache.set(sourceMapUrl, sourceMap);
              return sourceMap;
            })
            .catch(error => {
              console.error('Failed to fetch SourceMap:', error);
              return null;
            });
          
          fetchPromises.push(fetchPromise);
        }
        
        parsedStack.push({
          functionName,
          fileName,
          lineNumber: parseInt(lineNumber, 10),
          columnNumber: parseInt(columnNumber, 10)
        });
      } else {
        // 内部脚本，直接添加
        parsedStack.push({
          functionName,
          fileName,
          lineNumber: parseInt(lineNumber, 10),
          columnNumber: parseInt(columnNumber, 10),
          source: line
        });
      }
    });
    
    // 等待所有SourceMap获取完成
    Promise.all(fetchPromises)
      .then(() => {
        // 使用SourceMap转换堆栈
        const mappedStack = parsedStack.map(frame => {
          // 如果是内部脚本，直接返回
          if (frame.source) return frame;
          
          // 构造SourceMap URL
          const sourceMapUrl = `${frame.fileName}.map`;
          
          // 获取SourceMap
          const sourceMap = this.sourceMapCache.get(sourceMapUrl);
          
          if (sourceMap) {
            try {
              // 使用SourceMap转换位置
              // 注意：这里简化了SourceMap的解析逻辑，实际应该使用source-map库
              const mappedPosition = this.getMappedPosition(sourceMap, frame.lineNumber, frame.columnNumber);
              
              if (mappedPosition) {
                return {
                  ...frame,
                  originalFileName: mappedPosition.source,
                  originalLineNumber: mappedPosition.line,
                  originalColumnNumber: mappedPosition.column,
                  originalFunctionName: mappedPosition.name || frame.functionName
                };
              }
            } catch (error) {
              console.error('Failed to map position:', error);
            }
          }
          
          return frame;
        });
        
        // 上报错误
        this.reportError({
          ...formattedError,
          fingerprint,
          count: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          parsedStack: mappedStack
        });
      })
      .catch(error => {
        console.error('Failed to parse stack with SourceMap:', error);
        
        // 直接上报错误
        this.reportError({
          ...formattedError,
          fingerprint,
          count: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now()
        });
      });
  }
  
  /**
   * 使用SourceMap获取映射位置
   * @param {Object} sourceMap - SourceMap对象
   * @param {Number} line - 行号
   * @param {Number} column - 列号
   * @return {Object|null} 映射位置
   */
  getMappedPosition(sourceMap, line, column) {
    // 简化的SourceMap解析逻辑
    // 实际应该使用source-map库
    
    // 检查SourceMap格式
    if (!sourceMap || !sourceMap.mappings || !sourceMap.sources) {
      return null;
    }
    
    // 解析mappings
    const mappings = sourceMap.mappings.split(';');
    
    // 检查行号是否有效
    if (line <= 0 || line > mappings.length) {
      return null;
    }
    
    // 获取行映射
    const lineMapping = mappings[line - 1];
    
    // 解析行映射
    const segments = lineMapping.split(',');
    
    // 查找最接近的列映射
    let closestSegment = null;
    let closestDistance = Infinity;
    
    for (const segment of segments) {
      // 解析段
      const values = this.decodeVLQ(segment);
      
      if (values && values.length >= 4) {
        const generatedColumn = values[0];
        const distance = Math.abs(generatedColumn - column);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSegment = values;
        }
      }
    }
    
    // 如果找到了映射
    if (closestSegment) {
      const [_, sourceIndex, sourceLine, sourceColumn, nameIndex] = closestSegment;
      
      return {
        source: sourceMap.sources[sourceIndex],
        line: sourceLine + 1,
        column: sourceColumn,
        name: nameIndex >= 0 && sourceMap.names ? sourceMap.names[nameIndex] : null
      };
    }
    
    return null;
  }
  
  /**
   * 解码VLQ编码
   * @param {String} str - VLQ编码字符串
   * @return {Array|null} 解码后的值
   */
  decodeVLQ(str) {
    // 简化的VLQ解码逻辑
    // 实际应该使用source-map库
    
    // Base64字符集
    const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    
    // 解码结果
    const result = [];
    let value = 0;
    let shift = 0;
    
    // 解码每个字符
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const index = base64.indexOf(char);
      
      if (index === -1) {
        return null;
      }
      
      // 取最低5位
      const continuation = index & 32;
      const digit = index & 31;
      
      value += digit << shift;
      
      // 如果最高位为0，表示结束
      if (!continuation) {
        // 处理符号位
        const negate = value & 1;
        value >>= 1;
        
        result.push(negate ? -value : value);
        
        value = 0;
        shift = 0;
      } else {
        shift += 5;
      }
    }
    
    return result;
  }
  
  /**
   * 上报错误
   * @param {Object} error - 错误信息
   */
  reportError(error) {
    if (!this.reportCallback) {
      return;
    }
    
    // 添加用户行为记录
    error.breadcrumbs = this.breadcrumbs.slice(-10);
    
    // 上报错误
    this.reportCallback({
      type: 'error',
      subType: error.type,
      timestamp: Date.now(),
      data: error
    });
  }
  
  /**
   * 添加面包屑
   * @param {Object} breadcrumb - 面包屑
   */
  addBreadcrumb(breadcrumb) {
    // 限制面包屑数量
    if (this.breadcrumbs.length >= 100) {
      this.breadcrumbs.shift();
    }
    
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now()
    });
  }
  
  /**
   * 销毁错误监控实例
   */
  destroy() {
    // 恢复原始的console.error方法
    if (this.consoleErrorOriginal) {
      console.error = this.consoleErrorOriginal;
    }
    
    // 清空错误缓存
    this.errorCache.clear();
    
    // 清空SourceMap缓存
    this.sourceMapCache.clear();
    
    this.isInitialized = false;
  }
}
