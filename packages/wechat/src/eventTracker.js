/**
 * AutoTracker SDK 微信小程序平台事件跟踪模块
 */

import { shouldSample } from '@auto-tracker/utils';

/**
 * 初始化微信小程序平台事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
export function initEventTracker(config, beaconSender) {
  if (typeof wx === 'undefined' || !wx.getSystemInfo) {
    console.error('[AutoTracker] Not in WeChat Mini Program environment');
    return;
  }

  if (config.event && config.event.click && config.event.click.enabled) {
    initTapTracking(config, beaconSender);
  }

  if (config.debug) {
    console.log('[AutoTracker] WeChat Mini Program event tracker initialized');
  }
}

/**
 * 初始化点击事件跟踪
 * @param {Object} config - 配置对象
 * @param {Object} beaconSender - 数据上报实例
 */
function initTapTracking(config, beaconSender) {
  const originalPage = Page;

  Page = function(pageConfig) {
    // --- Helper function to attach listeners ---
    pageConfig._autoTracker_attachTapListeners = function() {
      const page = this; // `this` refers to the Page instance

      if (page._autoTracker_isTapHandlerAttached || page._autoTracker_isAttaching) {
        if (config.debug) {
          console.log('[AutoTracker] Attach: Already attached or attaching. Skipping.', page.route);
        }
        return;
      }
      
      if (!page._autoTracker_isPageVisible) {
        if (config.debug) {
          console.log('[AutoTracker] Attach: Page not visible. Skipping attachment.', page.route);
        }
        return;
      }

      page._autoTracker_isAttaching = true;
      if (config.debug) {
        console.log('[AutoTracker] Attach: Starting query.', page.route);
      }

      wx.createSelectorQuery()
        .selectAll('*')
        .fields({ id: true, dataset: true }) // Reduced fields for attach
        .exec(function(res) {
          page._autoTracker_isAttaching = false;
          if (config.debug) {
            console.log('[AutoTracker] Attach: Query exec callback.', page.route, 'Page visible:', page._autoTracker_isPageVisible);
          }

          if (!page._autoTracker_isPageVisible) {
            if (config.debug) {
              console.log('[AutoTracker] Attach: Page became hidden during attach query. Not attaching or ensuring detachment.', page.route);
            }
            // Ensure detachment if attach somehow happened or if a detach was pending
            page._autoTracker_detachTapListeners(); 
            return;
          }

          if (page._autoTracker_isTapHandlerAttached) { // Double check, another attach might have completed
             if (config.debug) {
                console.log('[AutoTracker] Attach: Listeners somehow already attached in exec. Skipping.', page.route);
             }
             return;
          }

          if (Array.isArray(res) && res[0] && page._autoTrackerTapHandler) {
            res[0].forEach(function(element) {
              if (element.id) {
                const component = page.selectComponent('#' + element.id);
                if (component && typeof component.on === 'function') {
                    component.on('tap', page._autoTrackerTapHandler);
                } else if (config.debug) {
                    // This can happen for non-component elements, which is expected.
                    // console.log('[AutoTracker] Attach: Element or .on not found for #'+element.id, page.route);
                }
              }
            });
            page._autoTracker_isTapHandlerAttached = true;
            if (config.debug) {
              console.log('[AutoTracker] Attach: Listeners attached successfully.', page.route);
            }
          } else if (config.debug) {
            console.log('[AutoTracker] Attach: No elements found or tap handler missing in exec.', page.route);
          }
        });
    };

    // --- Helper function to detach listeners ---
    pageConfig._autoTracker_detachTapListeners = function() {
      const page = this; // `this` refers to the Page instance

      if (!page._autoTracker_isTapHandlerAttached || page._autoTracker_isDetaching) {
        if (config.debug) {
          console.log('[AutoTracker] Detach: Already detached or detaching. Skipping.', page.route);
        }
        return;
      }

      if (page._autoTracker_isAttaching) {
          if (config.debug) {
            console.log('[AutoTracker] Detach: Attach in progress. Attach callback will handle detachment if page became invisible.', page.route);
          }
          // The attach callback will see _isPageVisible = false and manage this.
          // Or, if attach completes and page is still visible, this detach call is still valid if it came after.
          // Setting a _pendingDetach flag could be an option, but relying on _isPageVisible in attach should mostly cover it.
          return; 
      }
      
      page._autoTracker_isDetaching = true;
      if (config.debug) {
        console.log('[AutoTracker] Detach: Starting query.', page.route);
      }

      wx.createSelectorQuery()
        .selectAll('*')
        .fields({ id: true }) // Reduced fields for detach
        .exec(function(res) {
          page._autoTracker_isDetaching = false;
          if (config.debug) {
            console.log('[AutoTracker] Detach: Query exec callback.', page.route);
          }

          if (Array.isArray(res) && res[0] && page._autoTrackerTapHandler) {
            res[0].forEach(function(element) {
              if (element.id) {
                 const component = page.selectComponent('#' + element.id);
                 if (component && typeof component.off === 'function') {
                    component.off('tap', page._autoTrackerTapHandler);
                 }
              }
            });
          }
          page._autoTracker_isTapHandlerAttached = false;
          if (config.debug) {
            console.log('[AutoTracker] Detach: Listeners detached.', page.route);
          }

          // If page became visible again while detaching, re-attach.
          if (page._autoTracker_isPageVisible) {
            if (config.debug) {
              console.log('[AutoTracker] Detach: Page became visible during detach. Re-attaching.', page.route);
            }
            page._autoTracker_attachTapListeners();
          }
        });
    };

    // --- Original onLoad ---
    const originalOnLoad = pageConfig.onLoad;
    pageConfig.onLoad = function(options) {
      this._autoTracker_isPageVisible = true;
      this._autoTracker_isTapHandlerAttached = false;
      this._autoTracker_isAttaching = false;
      this._autoTracker_isDetaching = false;
      
      const page = this;

      page._autoTrackerTapHandler = function(e) {
        if (!shouldSample(config.event.click.sampleRate)) return;
        const target = e.target || {};
        const dataset = target.dataset || {};
        if (dataset.autoTrackerIgnore === true || dataset.autoTrackerIgnore === 'true') return;

        const elementInfo = {
          id: target.id || '',
          tagName: target.tagName || 'unknown',
          className: target.className || '',
          dataset: { ...dataset }
        };
        beaconSender.send({
          type: 'event', category: 'interaction', action: 'tap',
          label: elementInfo.id || elementInfo.tagName,
          data: {
            element: elementInfo,
            page: { route: page.route, options: page._autoTracker_loadOptions },
            position: { x: e.detail.x, y: e.detail.y }
          }
        });
        if (config.debug) console.log('[AutoTracker] Tap tracked:', elementInfo, page.route);
      };
      
      // Store options for use in tap handler if needed
      this._autoTracker_loadOptions = options; 

      if (originalOnLoad) {
        originalOnLoad.call(this, options);
      }
      
      if (config.debug) console.log('[AutoTracker] onLoad completed, preparing to attach listeners.', this.route);
      this._autoTracker_attachTapListeners();
    };

    // --- Original onShow ---
    const originalOnShow = pageConfig.onShow;
    pageConfig.onShow = function() {
      this._autoTracker_isPageVisible = true;
      if (config.debug) console.log('[AutoTracker] onShow: Page visible.', this.route);
      
      if (originalOnShow) {
        originalOnShow.call(this);
      }
      // Ensure listeners are attached if not already (e.g. after onHide)
      this._autoTracker_attachTapListeners();
    };

    // --- Original onHide ---
    const originalOnHide = pageConfig.onHide;
    pageConfig.onHide = function() {
      this._autoTracker_isPageVisible = false;
      if (config.debug) console.log('[AutoTracker] onHide: Page hidden.', this.route);

      if (originalOnHide) {
        originalOnHide.call(this);
      }
      this._autoTracker_detachTapListeners();
    };
    
    // --- Original onUnload ---
    const originalOnUnload = pageConfig.onUnload;
    pageConfig.onUnload = function() {
      this._autoTracker_isPageVisible = false;
      if (config.debug) console.log('[AutoTracker] onUnload: Page unloading.', this.route);
      
      if (originalOnUnload) {
        originalOnUnload.call(this);
      }
      this._autoTracker_detachTapListeners();
      
      // Clean up handler and options
      this._autoTrackerTapHandler = null;
      this._autoTracker_loadOptions = null;
      // Also explicitly nullify flags to help GC and prevent issues if instance is somehow reused (unlikely for Page)
      this._autoTracker_isTapHandlerAttached = null;
      this._autoTracker_isAttaching = null;
      this._autoTracker_isDetaching = null;
      this._autoTracker_isPageVisible = null;

    };

    return originalPage(pageConfig);
  };
}
