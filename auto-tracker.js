/**
 * AutoTracker SDK - Universal Entry Point
 * 
 * This file automatically detects the platform and loads the appropriate SDK.
 */

import { detectPlatform, Platform } from './packages/utils/src/platform.js';

/**
 * Dynamically import the appropriate SDK based on the platform
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} - The initialized SDK instance
 */
async function loadSDK(config = {}) {
  const platform = detectPlatform();
  
  try {
    switch (platform) {
      case Platform.WEB:
        const webSDK = await import('./dist/auto-tracker-web.esm.js');
        return webSDK.default.init(config);
        
      case Platform.WECHAT:
        const wechatSDK = await import('./dist/auto-tracker-wechat.esm.js');
        return wechatSDK.default.init(config);
        
      case Platform.ALIPAY:
        const alipaySDK = await import('./dist/auto-tracker-alipay.esm.js');
        return alipaySDK.default.init(config);
        
      default:
        console.error(`[AutoTracker] Unsupported platform: ${platform}`);
        return null;
    }
  } catch (error) {
    console.error(`[AutoTracker] Failed to load SDK for platform ${platform}:`, error);
    return null;
  }
}

/**
 * Initialize the SDK with the provided configuration
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} - The initialized SDK instance
 */
async function init(config = {}) {
  return loadSDK(config);
}

// Export a simple API that works across all platforms
export default {
  init,
  
  // These methods will be replaced with the platform-specific implementations after init
  trackEvent: async (eventName, eventData = {}) => {
    const sdk = await loadSDK();
    if (sdk && sdk.trackEvent) {
      return sdk.trackEvent(eventName, eventData);
    }
  },
  
  setUserId: async (userId) => {
    const sdk = await loadSDK();
    if (sdk && sdk.setUserId) {
      return sdk.setUserId(userId);
    }
  },
  
  setUserProperties: async (properties) => {
    const sdk = await loadSDK();
    if (sdk && sdk.setUserProperties) {
      return sdk.setUserProperties(properties);
    }
  }
};
