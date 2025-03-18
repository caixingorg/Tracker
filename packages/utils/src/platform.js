/**
 * 平台检测相关工具函数
 */

/**
 * 平台类型枚举
 */
export const Platform = {
  WEB: 'web',
  WECHAT: 'wechat',
  ALIPAY: 'alipay',
  UNKNOWN: 'unknown'
};

/**
 * 检测当前运行的平台
 * @return {String} 平台类型，值为Platform枚举中的一个
 */
export function detectPlatform() {
  // 检测微信小程序
  if (typeof wx !== 'undefined' && wx.getSystemInfo) {
    return Platform.WECHAT;
  }
  
  // 检测支付宝小程序
  if (typeof my !== 'undefined' && my.getSystemInfo) {
    return Platform.ALIPAY;
  }
  
  // 检测Web环境
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return Platform.WEB;
  }
  
  return Platform.UNKNOWN;
}

/**
 * 获取平台特定的API
 * @param {String} apiName - API名称
 * @return {Function|Object|null} 平台特定的API实现
 */
export function getPlatformAPI(apiName) {
  const platform = detectPlatform();
  
  // 网络请求API
  if (apiName === 'request') {
    switch (platform) {
      case Platform.WEB:
        return (url, options = {}) => fetch(url, options);
      case Platform.WECHAT:
        return wx.request;
      case Platform.ALIPAY:
        return my.request;
      default:
        return null;
    }
  }
  
  // 存储API
  if (apiName === 'storage') {
    switch (platform) {
      case Platform.WEB:
        return {
          get: (key) => {
            try {
              const value = localStorage.getItem(key);
              return value ? JSON.parse(value) : null;
            } catch (e) {
              return null;
            }
          },
          set: (key, value) => {
            try {
              localStorage.setItem(key, JSON.stringify(value));
              return true;
            } catch (e) {
              return false;
            }
          },
          remove: (key) => {
            try {
              localStorage.removeItem(key);
              return true;
            } catch (e) {
              return false;
            }
          }
        };
      case Platform.WECHAT:
        return {
          get: (key) => {
            try {
              const res = wx.getStorageSync(key);
              return res || null;
            } catch (e) {
              return null;
            }
          },
          set: (key, value) => {
            try {
              wx.setStorageSync(key, value);
              return true;
            } catch (e) {
              return false;
            }
          },
          remove: (key) => {
            try {
              wx.removeStorageSync(key);
              return true;
            } catch (e) {
              return false;
            }
          }
        };
      case Platform.ALIPAY:
        return {
          get: (key) => {
            try {
              const res = my.getStorageSync({ key });
              return res.data || null;
            } catch (e) {
              return null;
            }
          },
          set: (key, value) => {
            try {
              my.setStorageSync({
                key,
                data: value
              });
              return true;
            } catch (e) {
              return false;
            }
          },
          remove: (key) => {
            try {
              my.removeStorageSync({ key });
              return true;
            } catch (e) {
              return false;
            }
          }
        };
      default:
        return null;
    }
  }
  
  // 系统信息API
  if (apiName === 'systemInfo') {
    switch (platform) {
      case Platform.WEB:
        return () => {
          const ua = navigator.userAgent;
          return {
            platform: 'web',
            userAgent: ua,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            language: navigator.language,
            version: ''
          };
        };
      case Platform.WECHAT:
        return () => {
          try {
            return wx.getSystemInfoSync();
          } catch (e) {
            return {};
          }
        };
      case Platform.ALIPAY:
        return () => {
          try {
            return my.getSystemInfoSync();
          } catch (e) {
            return {};
          }
        };
      default:
        return null;
    }
  }
  
  return null;
}
