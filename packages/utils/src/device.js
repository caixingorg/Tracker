/**
 * 设备和环境检测相关工具函数
 */

/**
 * 获取设备和浏览器信息
 * @return {Object} 设备和浏览器信息
 */
export function getDeviceInfo() {
  // 检查是否在浏览器环境
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      browser: { name: 'unknown', version: 'unknown' },
      os: { name: 'unknown', version: 'unknown' },
      deviceType: 'unknown'
    };
  }
  
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  
  // 浏览器信息
  const browser = {
    name: '',
    version: ''
  };
  
  // 操作系统信息
  const os = {
    name: '',
    version: ''
  };
  
  // 设备类型
  let deviceType = 'unknown';
  
  // 检测浏览器
  if (/Edge|Edg/.test(ua)) {
    browser.name = 'Edge';
    browser.version = ua.match(/Edge?\/([0-9.]+)/)[1];
  } else if (/Chrome/.test(ua)) {
    browser.name = 'Chrome';
    browser.version = ua.match(/Chrome\/([0-9.]+)/)[1];
  } else if (/Firefox/.test(ua)) {
    browser.name = 'Firefox';
    browser.version = ua.match(/Firefox\/([0-9.]+)/)[1];
  } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browser.name = 'Safari';
    browser.version = ua.match(/Version\/([0-9.]+)/)[1];
  } else if (/MSIE|Trident/.test(ua)) {
    browser.name = 'IE';
    browser.version = ua.match(/(?:MSIE |rv:)([0-9.]+)/)[1];
  }
  
  // 检测操作系统
  if (/Windows/.test(ua)) {
    os.name = 'Windows';
    os.version = ua.match(/Windows NT ([0-9.]+)/)[1];
  } else if (/Mac/.test(platform)) {
    os.name = 'MacOS';
    os.version = ua.match(/Mac OS X ([0-9._]+)/)[1].replace(/_/g, '.');
  } else if (/Linux/.test(platform)) {
    os.name = 'Linux';
  } else if (/Android/.test(ua)) {
    os.name = 'Android';
    os.version = ua.match(/Android ([0-9.]+)/)[1];
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os.name = 'iOS';
    os.version = ua.match(/OS ([0-9_]+)/)[1].replace(/_/g, '.');
  }
  
  // 检测设备类型
  if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/.test(ua)) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }
  
  return {
    browser,
    os,
    deviceType,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    language: navigator.language,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData
    } : null
  };
}

/**
 * 获取当前页面URL信息
 * @return {Object} URL信息
 */
export function getPageInfo() {
  // 检查是否在浏览器环境
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      url: '',
      path: '',
      query: '',
      hash: '',
      origin: '',
      title: '',
      referrer: ''
    };
  }
  
  const { href, pathname, search, hash, origin } = window.location;
  
  return {
    url: href,
    path: pathname,
    query: search,
    hash: hash,
    origin: origin,
    title: document.title,
    referrer: document.referrer
  };
}

/**
 * 检查浏览器是否支持某个特性
 * @param {String} feature - 特性名称
 * @return {Boolean} 是否支持
 */
export function isSupported(feature) {
  // 检查是否在浏览器环境
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const features = {
    sendBeacon: 'sendBeacon' in navigator,
    performance: 'performance' in window,
    performanceObserver: 'PerformanceObserver' in window,
    mutationObserver: 'MutationObserver' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    webWorker: 'Worker' in window,
    serviceWorker: 'serviceWorker' in navigator,
    fetch: 'fetch' in window,
    promise: 'Promise' in window
  };
  
  return feature in features ? features[feature] : false;
}
