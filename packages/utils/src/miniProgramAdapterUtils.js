/**
 * AutoTracker SDK Mini Program Adapter Utilities
 * Provides common initialization logic for mini program platform adapters.
 */

import { Platform } from './platform.js'; // Assuming Platform enum is here or adjust path

/**
 * Initializes a mini program adapter with common logic.
 *
 * @param {string} platformName - The name of the platform (e.g., "Alipay", "WeChat").
 * @param {object} platformAPI - The global API object for the platform (e.g., `my`, `wx`).
 * @param {object} platformEnum - The platform enum value (e.g., Platform.ALIPAY, Platform.WECHAT).
 * @param {object} config - The SDK configuration object.
 * @param {object} beaconSender - The data beaconSender instance.
 * @param {object} platformTrackers - An object containing platform-specific tracker initializers.
 * @param {function} platformTrackers.initEventTracker - Function to initialize event tracking.
 * @param {function} platformTrackers.initPerformance - Function to initialize performance monitoring.
 * @param {function} platformTrackers.initErrorMonitor - Function to initialize error monitoring.
 * @param {function} platformTrackers.initAppLifecycle - Function to initialize app lifecycle tracking.
 * @param {function} platformTrackers.initPageLifecycle - Function to initialize page lifecycle tracking.
 * @returns {object|undefined} An object containing the platform and config, or undefined if init fails.
 */
export function initMiniProgramAdapter(
  platformName,
  platformAPI,
  platformEnum,
  config,
  beaconSender,
  platformTrackers
) {
  // Environment check
  if (typeof platformAPI === 'undefined' || !platformAPI.getSystemInfo) {
    console.error(`[AutoTracker] Not in ${platformName} Mini Program environment`);
    return undefined;
  }

  // Initialize standard trackers
  platformTrackers.initEventTracker(config, beaconSender);
  platformTrackers.initPerformance(config, beaconSender);
  platformTrackers.initErrorMonitor(config, beaconSender);

  // Initialize app lifecycle tracking if configured
  if (config.miniProgram && config.miniProgram.common && config.miniProgram.common.trackAppLifecycle) {
    platformTrackers.initAppLifecycle(config, beaconSender);
  }

  // Initialize page lifecycle tracking if configured
  if (config.miniProgram && config.miniProgram.common && config.miniProgram.common.trackPageTransition) {
    platformTrackers.initPageLifecycle(config, beaconSender);
  }

  if (config.debug) {
    console.log(`[AutoTracker] ${platformName} Mini Program adapter initialized`);
  }

  return {
    platform: platformEnum,
    config
  };
}
