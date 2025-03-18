/**
 * AutoTracker SDK 事件追踪模块
 * 负责监听各种用户交互事件，如点击、滚动、路由变更等
 */

import { generateSelector, throttle, debounce, getPageInfo } from './utils.js';
import config from '../config.js';

/**
 * 事件追踪类
 */
export default class EventTracker {
  /**
   * 构造函数
   * @param {Function} reportCallback - 数据上报回调函数
   */
  constructor(reportCallback) {
    this.reportCallback = reportCallback;
    this.isInitialized = false;
    this.mutationObserver = null;
    this.intersectionObserver = null;
    this.eventHandlers = {};
    this.historyStateStack = [];
    this.lastScrollPosition = 0;
    this.lastScrollTime = 0;
    this.breadcrumbs = [];
    this.maxBreadcrumbs = config.advanced.maxBreadcrumbs || 100;
    
    // 检查浏览器是否支持MutationObserver
    this.isMutationObserverSupported = 'MutationObserver' in window;
    
    // 检查浏览器是否支持IntersectionObserver
    this.isIntersectionObserverSupported = 'IntersectionObserver' in window;
  }
  
  /**
   * 初始化事件追踪
   */
  init() {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    
    // 监听DOM变化
    if (this.isMutationObserverSupported && config.events.click) {
      this.observeDOM();
    }
    
    // 监听元素曝光
    if (this.isIntersectionObserverSupported) {
      this.observeElementExposure();
    }
    
    // 监听点击事件
    if (config.events.click) {
      this.trackEvent('click', 'click', this.handleClick.bind(this));
    }
    
    // 监听滚动事件
    if (config.events.scroll) {
      this.trackEvent('scroll', 'scroll', throttle(this.handleScroll.bind(this), 200));
    }
    
    // 监听表单提交事件
    if (config.events.formSubmit) {
      this.trackEvent('submit', 'submit', this.handleFormSubmit.bind(this));
    }
    
    // 监听输入变化事件
    if (config.events.inputChange) {
      this.trackEvent('change', 'change', this.handleInputChange.bind(this));
      this.trackEvent('input', 'input', debounce(this.handleInputChange.bind(this), 500));
    }
    
    // 监听路由变化
    if (config.events.hashChange) {
      this.trackEvent('hashchange', 'hashchange', this.handleHashChange.bind(this), window);
    }
    
    // 监听History API
    if (config.events.historyChange) {
      this.hookHistoryAPI();
    }
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.trackPageView();
      }
    });
    
    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.reportBreadcrumbs();
    });
    
    // 初始化时记录页面浏览
    if (config.events.pageView) {
      this.trackPageView();
    }
  }
  
  /**
   * 监听DOM变化
   */
  observeDOM() {
    if (!this.isMutationObserverSupported || this.mutationObserver) {
      return;
    }
    
    this.mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // 只处理新增的节点
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            // 只处理元素节点
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 为新增的元素及其子元素添加事件监听
              this.addEventListenersToNewElements(node);
            }
          });
        }
      });
    });
    
    // 开始观察DOM变化
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * 为新增的元素添加事件监听
   * @param {HTMLElement} element - 新增的元素
   */
  addEventListenersToNewElements(element) {
    // 为可点击元素添加点击事件监听
    if (this.isClickableElement(element) && config.events.click) {
      element.addEventListener('click', this.handleClick.bind(this));
    }
    
    // 为表单元素添加提交事件监听
    if (element.tagName === 'FORM' && config.events.formSubmit) {
      element.addEventListener('submit', this.handleFormSubmit.bind(this));
    }
    
    // 为输入元素添加变化事件监听
    if (this.isInputElement(element) && config.events.inputChange) {
      element.addEventListener('change', this.handleInputChange.bind(this));
      element.addEventListener('input', debounce(this.handleInputChange.bind(this), 500));
    }
    
    // 递归处理子元素
    Array.from(element.children).forEach(child => {
      this.addEventListenersToNewElements(child);
    });
  }
  
  /**
   * 监听元素曝光
   */
  observeElementExposure() {
    if (!this.isIntersectionObserverSupported || this.intersectionObserver) {
      return;
    }
    
    this.intersectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          
          // 只处理重要元素的曝光
          if (this.isImportantElement(element)) {
            const selector = generateSelector(element);
            const elementInfo = this.getElementInfo(element);
            
            this.reportEvent('exposure', {
              selector,
              element: elementInfo,
              visibleRatio: entry.intersectionRatio
            });
            
            // 记录面包屑
            this.addBreadcrumb('exposure', {
              selector,
              element: elementInfo.tagName + (elementInfo.id ? `#${elementInfo.id}` : '')
            });
            
            // 曝光只需要记录一次，之后不再观察
            this.intersectionObserver.unobserve(element);
          }
        }
      });
    }, {
      threshold: 0.5 // 元素有50%可见时触发
    });
    
    // 开始观察重要元素
    this.observeImportantElements();
  }
  
  /**
   * 观察重要元素
   */
  observeImportantElements() {
    // 获取所有重要元素
    const importantElements = Array.from(document.querySelectorAll(
      'button, a, [role="button"], [class*="btn"], [id*="btn"], ' +
      '[class*="button"], [id*="button"], [data-track="true"], ' +
      '[class*="banner"], [class*="card"], [class*="item"], ' +
      'img[src*="banner"], img[src*="ad"], video'
    ));
    
    // 开始观察
    importantElements.forEach(element => {
      this.intersectionObserver.observe(element);
    });
  }
  
  /**
   * 判断元素是否为重要元素
   * @param {HTMLElement} element - DOM元素
   * @return {Boolean} 是否为重要元素
   */
  isImportantElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    
    // 检查元素标签
    const tagName = element.tagName.toLowerCase();
    if (['button', 'a', 'video', 'audio', 'canvas'].includes(tagName)) {
      return true;
    }
    
    // 检查元素角色
    if (element.getAttribute('role') === 'button') {
      return true;
    }
    
    // 检查元素类名和ID
    const className = element.className || '';
    const id = element.id || '';
    
    if (
      className.includes('btn') || className.includes('button') ||
      id.includes('btn') || id.includes('button') ||
      className.includes('banner') || className.includes('card') ||
      className.includes('item')
    ) {
      return true;
    }
    
    // 检查自定义属性
    if (element.getAttribute('data-track') === 'true') {
      return true;
    }
    
    // 检查图片是否为广告或横幅
    if (tagName === 'img') {
      const src = element.getAttribute('src') || '';
      if (src.includes('banner') || src.includes('ad')) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 判断元素是否为可点击元素
   * @param {HTMLElement} element - DOM元素
   * @return {Boolean} 是否为可点击元素
   */
  isClickableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    
    // 检查元素标签
    const tagName = element.tagName.toLowerCase();
    if (['a', 'button', 'input', 'select', 'textarea', 'label'].includes(tagName)) {
      return true;
    }
    
    // 检查元素角色
    if (element.getAttribute('role') === 'button') {
      return true;
    }
    
    // 检查元素是否有点击事件监听器
    const elementEvents = element.__events || {};
    if (elementEvents.click && elementEvents.click.length > 0) {
      return true;
    }
    
    // 检查元素类名和ID
    const className = element.className || '';
    const id = element.id || '';
    
    if (
      className.includes('btn') || className.includes('button') ||
      id.includes('btn') || id.includes('button')
    ) {
      return true;
    }
    
    // 检查自定义属性
    if (element.getAttribute('data-track') === 'true') {
      return true;
    }
    
    return false;
  }
  
  /**
   * 判断元素是否为输入元素
   * @param {HTMLElement} element - DOM元素
   * @return {Boolean} 是否为输入元素
   */
  isInputElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    
    // 检查元素标签
    const tagName = element.tagName.toLowerCase();
    if (['input', 'select', 'textarea'].includes(tagName)) {
      return true;
    }
    
    // 检查元素是否可编辑
    if (element.isContentEditable) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 获取元素信息
   * @param {HTMLElement} element - DOM元素
   * @return {Object} 元素信息
   */
  getElementInfo(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return {};
    }
    
    const tagName = element.tagName.toLowerCase();
    const id = element.id || null;
    const className = element.className || null;
    let text = null;
    let value = null;
    
    // 获取元素文本内容
    if (element.textContent) {
      text = element.textContent.trim().substring(0, 100);
    }
    
    // 获取元素值
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      // 对于敏感信息，进行脱敏处理
      if (element.type === 'password' || element.name === 'password' || element.id === 'password') {
        value = '******';
      } else if (config.advanced.privacy.maskSensitiveData) {
        // 检查是否为敏感字段
        const fieldName = (element.name || element.id || '').toLowerCase();
        if (
          fieldName.includes('password') || fieldName.includes('pwd') ||
          fieldName.includes('email') || fieldName.includes('phone') ||
          fieldName.includes('mobile') || fieldName.includes('card') ||
          fieldName.includes('account') || fieldName.includes('secret') ||
          fieldName.includes('token') || fieldName.includes('key')
        ) {
          value = '******';
        } else {
          value = element.value || null;
        }
      } else {
        value = element.value || null;
      }
    }
    
    // 获取元素属性
    const attributes = {};
    Array.from(element.attributes).forEach(attr => {
      // 排除一些不必要的属性
      if (!['class', 'id', 'style'].includes(attr.name)) {
        attributes[attr.name] = attr.value;
      }
    });
    
    // 获取元素位置和大小
    const rect = element.getBoundingClientRect();
    const position = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
    
    return {
      tagName,
      id,
      className,
      text,
      value,
      attributes,
      position
    };
  }
  
  /**
   * 监听事件
   * @param {String} eventName - 事件名称
   * @param {String} eventType - 事件类型
   * @param {Function} handler - 事件处理函数
   * @param {EventTarget} target - 事件目标，默认为document
   */
  trackEvent(eventName, eventType, handler, target = document) {
    if (this.eventHandlers[eventName]) {
      return;
    }
    
    this.eventHandlers[eventName] = handler;
    target.addEventListener(eventType, handler);
  }
  
  /**
   * 处理点击事件
   * @param {Event} event - 点击事件对象
   */
  handleClick(event) {
    const element = event.target;
    
    // 获取被点击的元素信息
    const selector = generateSelector(element);
    const elementInfo = this.getElementInfo(element);
    
    // 上报点击事件
    this.reportEvent('click', {
      selector,
      element: elementInfo,
      position: {
        x: event.clientX,
        y: event.clientY
      }
    });
    
    // 记录面包屑
    this.addBreadcrumb('click', {
      selector,
      element: elementInfo.tagName + (elementInfo.id ? `#${elementInfo.id}` : '')
    });
  }
  
  /**
   * 处理滚动事件
   * @param {Event} event - 滚动事件对象
   */
  handleScroll(event) {
    const now = Date.now();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const scrollDirection = scrollY > this.lastScrollPosition ? 'down' : 'up';
    const scrollDistance = Math.abs(scrollY - this.lastScrollPosition);
    const scrollSpeed = scrollDistance / (now - this.lastScrollTime);
    
    // 计算滚动深度
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    const winHeight = window.innerHeight;
    const scrollPercent = (scrollY / (docHeight - winHeight)) * 100;
    
    // 上报滚动事件
    this.reportEvent('scroll', {
      position: {
        x: scrollX,
        y: scrollY
      },
      direction: scrollDirection,
      distance: scrollDistance,
      speed: scrollSpeed,
      percent: scrollPercent.toFixed(2)
    });
    
    // 记录面包屑
    this.addBreadcrumb('scroll', {
      direction: scrollDirection,
      percent: Math.round(scrollPercent)
    });
    
    // 更新上次滚动位置和时间
    this.lastScrollPosition = scrollY;
    this.lastScrollTime = now;
  }
  
  /**
   * 处理表单提交事件
   * @param {Event} event - 表单提交事件对象
   */
  handleFormSubmit(event) {
    const form = event.target;
    
    // 获取表单信息
    const selector = generateSelector(form);
    const formInfo = {
      action: form.action,
      method: form.method,
      fields: []
    };
    
    // 获取表单字段信息
    Array.from(form.elements).forEach(element => {
      if (element.name && !element.disabled) {
        let value = element.value;
        
        // 对敏感字段进行脱敏处理
        if (
          element.type === 'password' ||
          element.name.toLowerCase().includes('password') ||
          element.name.toLowerCase().includes('pwd') ||
          element.name.toLowerCase().includes('email') ||
          element.name.toLowerCase().includes('phone') ||
          element.name.toLowerCase().includes('mobile') ||
          element.name.toLowerCase().includes('card') ||
          element.name.toLowerCase().includes('account') ||
          element.name.toLowerCase().includes('secret') ||
          element.name.toLowerCase().includes('token') ||
          element.name.toLowerCase().includes('key') ||
          config.advanced.privacy.maskSensitiveData
        ) {
          value = '******';
        }
        
        formInfo.fields.push({
          name: element.name,
          type: element.type,
          value: value
        });
      }
    });
    
    // 上报表单提交事件
    this.reportEvent('form_submit', {
      selector,
      form: formInfo
    });
    
    // 记录面包屑
    this.addBreadcrumb('form_submit', {
      selector,
      action: formInfo.action
    });
  }
  
  /**
   * 处理输入变化事件
   * @param {Event} event - 输入变化事件对象
   */
  handleInputChange(event) {
    const element = event.target;
    
    // 获取输入元素信息
    const selector = generateSelector(element);
    const elementInfo = this.getElementInfo(element);
    
    // 上报输入变化事件
    this.reportEvent('input_change', {
      selector,
      element: elementInfo
    });
    
    // 记录面包屑
    this.addBreadcrumb('input_change', {
      selector,
      element: elementInfo.tagName + (elementInfo.id ? `#${elementInfo.id}` : '')
    });
  }
  
  /**
   * 处理Hash变化事件
   * @param {Event} event - Hash变化事件对象
   */
  handleHashChange(event) {
    const oldURL = event.oldURL;
    const newURL = event.newURL;
    
    // 上报Hash变化事件
    this.reportEvent('hash_change', {
      oldURL,
      newURL,
      oldHash: new URL(oldURL).hash,
      newHash: new URL(newURL).hash
    });
    
    // 记录面包屑
    this.addBreadcrumb('hash_change', {
      from: new URL(oldURL).hash,
      to: new URL(newURL).hash
    });
    
    // 如果是单页应用，则记录页面浏览
    if (config.advanced.spa && config.advanced.hashRouter) {
      this.trackPageView();
    }
  }
  
  /**
   * 监听History API
   */
  hookHistoryAPI() {
    // 保存原始方法
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    // 重写pushState方法
    window.history.pushState = (...args) => {
      // 调用原始方法
      originalPushState.apply(window.history, args);
      
      // 记录状态
      this.historyStateStack.push({
        state: args[0],
        title: args[1],
        url: args[2]
      });
      
      // 上报pushState事件
      this.reportEvent('history_change', {
        type: 'pushState',
        state: args[0],
        title: args[1],
        url: args[2]
      });
      
      // 记录面包屑
      this.addBreadcrumb('history_change', {
        type: 'pushState',
        url: args[2]
      });
      
      // 如果是单页应用，则记录页面浏览
      if (config.advanced.spa && !config.advanced.hashRouter) {
        this.trackPageView();
      }
    };
    
    // 重写replaceState方法
    window.history.replaceState = (...args) => {
      // 调用原始方法
      originalReplaceState.apply(window.history, args);
      
      // 更新状态
      if (this.historyStateStack.length > 0) {
        this.historyStateStack[this.historyStateStack.length - 1] = {
          state: args[0],
          title: args[1],
          url: args[2]
        };
      } else {
        this.historyStateStack.push({
          state: args[0],
          title: args[1],
          url: args[2]
        });
      }
      
      // 上报replaceState事件
      this.reportEvent('history_change', {
        type: 'replaceState',
        state: args[0],
        title: args[1],
        url: args[2]
      });
      
      // 记录面包屑
      this.addBreadcrumb('history_change', {
        type: 'replaceState',
        url: args[2]
      });
      
      // 如果是单页应用，则记录页面浏览
      if (config.advanced.spa && !config.advanced.hashRouter) {
        this.trackPageView();
      }
    };
    
    // 监听popstate事件
    window.addEventListener('popstate', event => {
      // 上报popstate事件
      this.reportEvent('history_change', {
        type: 'popstate',
        state: event.state
      });
      
      // 记录面包屑
      this.addBreadcrumb('history_change', {
        type: 'popstate',
        url: window.location.href
      });
      
      // 如果是单页应用，则记录页面浏览
      if (config.advanced.spa && !config.advanced.hashRouter) {
        this.trackPageView();
      }
    });
  }
  
  /**
   * 记录页面浏览
   */
  trackPageView() {
    const pageInfo = getPageInfo();
    
    // 上报页面浏览事件
    this.reportEvent('page_view', pageInfo);
    
    // 记录面包屑
    this.addBreadcrumb('page_view', {
      url: pageInfo.url,
      title: pageInfo.title
    });
  }
  
  /**
   * 添加面包屑
   * @param {String} type - 面包屑类型
   * @param {Object} data - 面包屑数据
   */
  addBreadcrumb(type, data) {
    // 限制面包屑数量
    if (this.breadcrumbs.length >= this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
    
    // 添加面包屑
    this.breadcrumbs.push({
      type,
      timestamp: Date.now(),
      data
    });
  }
  
  /**
   * 上报面包屑
   */
  reportBreadcrumbs() {
    if (this.breadcrumbs.length === 0) {
      return;
    }
    
    // 上报面包屑
    this.reportEvent('breadcrumbs', {
      breadcrumbs: this.breadcrumbs
    });
    
    // 清空面包屑
    this.breadcrumbs = [];
  }
  
  /**
   * 上报事件
   * @param {String} eventType - 事件类型
   * @param {Object} eventData - 事件数据
   */
  reportEvent(eventType, eventData) {
    if (!this.reportCallback) {
      return;
    }
    
    this.reportCallback({
      type: 'event',
      subType: eventType,
      timestamp: Date.now(),
      data: eventData
    });
  }
  
  /**
   * 销毁事件追踪实例
   */
  destroy() {
    // 停止DOM观察
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // 停止元素曝光观察
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    // 移除事件监听器
    Object.keys(this.eventHandlers).forEach(eventName => {
      const handler = this.eventHandlers[eventName];
      document.removeEventListener(eventName, handler);
    });
    
    // 清空事件处理函数
    this.eventHandlers = {};
    
    // 上报剩余的面包屑
    this.reportBreadcrumbs();
    
    this.isInitialized = false;
  }
}
