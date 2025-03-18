/**
 * AutoTracker SDK 全局配置
 * 包含采样率、上报地址、错误监控等配置项
 */

const config = {
  // 基础配置
  appId: '',                                // 应用ID，用于区分不同应用
  debug: false,                             // 是否开启调试模式
  
  // 数据上报配置
  beacon: {
    url: 'https://analytics.example.com/collect',  // 数据上报地址
    batchSize: 10,                          // 批量上报数量阈值
    delay: 5000,                            // 定时上报间隔(ms)
    retryCount: 3,                          // 上报失败重试次数
    useBeacon: true,                        // 是否使用 sendBeacon API
    compression: true,                      // 是否启用数据压缩
    timeout: 10000                          // 请求超时时间(ms)
  },
  
  // 采样率配置
  sampling: {
    performance: 0.3,                       // 性能数据采样率
    error: 1.0,                             // 错误数据采样率
    behavior: 0.1                           // 用户行为采样率
  },
  
  // 事件监听配置
  events: {
    click: true,                            // 是否监听点击事件
    scroll: true,                           // 是否监听滚动事件
    pageView: true,                         // 是否监听页面浏览事件
    hashChange: true,                       // 是否监听hash变化
    historyChange: true,                    // 是否监听history API变化
    formSubmit: true,                       // 是否监听表单提交
    inputChange: false                      // 是否监听输入变化
  },
  
  // 性能监控配置
  performance: {
    webVitals: true,                        // 是否采集Web Vitals
    resourceTiming: true,                   // 是否采集资源加载时间
    firstScreenTiming: true,                // 是否采集首屏时间
    fps: false,                             // 是否采集FPS
    memory: false,                          // 是否采集内存使用情况
    timing: true                            // 是否采集Navigation Timing
  },
  
  // 错误监控配置
  errors: {
    jsError: true,                          // 是否监听JS错误
    promiseError: true,                     // 是否监听Promise错误
    resourceError: true,                    // 是否监听资源加载错误
    ajaxError: true,                        // 是否监听AJAX请求错误
    consoleError: false,                    // 是否监听console.error
    sourceMap: true,                        // 是否启用sourceMap解析
    alertThreshold: 10,                     // 错误告警阈值(每分钟)
    ignoreErrors: [                         // 忽略的错误信息
      /Script error/i,
      /ResizeObserver loop limit exceeded/i
    ]
  },
  
  // 高级功能配置
  advanced: {
    spa: true,                              // 是否为单页应用
    hashRouter: false,                      // 是否使用hash路由
    sessionTimeout: 1800,                   // 会话超时时间(秒)
    maxBreadcrumbs: 100,                    // 最大用户行为记录数
    autoTrack: true,                        // 是否自动启动追踪
    enableInIframe: false,                  // 是否在iframe中启用
    
    // 隐私配置
    privacy: {
      maskSensitiveData: true,              // 是否脱敏敏感数据
      anonymizeIP: true,                    // 是否匿名化IP
      respectDoNotTrack: true,              // 是否尊重DNT设置
      maskTextContent: false                // 是否脱敏文本内容
    }
  }
};

export default config;
