# AutoTracker SDK

AutoTracker是一个功能强大的无埋点前端监控SDK，可以自动收集用户行为、性能指标和错误信息，帮助开发者了解用户体验和应用性能。

## 特性

- **自动事件采集**：点击、滚动、表单提交、路由变更等
- **性能监控**：Web Vitals、资源加载时间、首屏时间等
- **错误监控**：JS错误、Promise错误、资源加载错误、AJAX错误等
- **数据批量上报**：支持sendBeacon、数据压缩、离线缓存等
- **用户行为分析**：用户行为轨迹、会话管理等
- **隐私合规**：数据脱敏、DNT支持等

## 架构

```
AutoTracker SDK
├── core/                 # 核心逻辑
│   ├── eventTracker.js   # 事件监听（点击/滚动/路由等）
│   ├── performance.js    # 性能指标采集
│   ├── errorMonitor.js   # 错误监控
│   └── utils.js          # 工具函数（生成Selector/数据缓存等）
├── sender/               # 数据上报
│   └── beaconSender.js   # 数据批量上报（支持sendBeacon）
├── config.js             # 全局配置（采样率/上报地址等）
├── index.js              # 入口文件
└── example.html          # 使用示例
```

## 快速开始

### 安装

```html
<!-- 直接在HTML中引入 -->
<script type="module">
  import autoTracker from './path/to/autotracker/index.js';
  
  // 初始化SDK
  autoTracker.init({
    appId: 'your-app-id',
    beacon: {
      url: 'https://your-analytics-endpoint.com/collect'
    }
  });
</script>
```

### 基本用法

```javascript
// 初始化SDK
autoTracker.init({
  appId: 'your-app-id',
  beacon: {
    url: 'https://your-analytics-endpoint.com/collect'
  }
});

// 手动上报事件
autoTracker.trackEvent('button_click', {
  buttonId: 'submit-button',
  page: 'checkout'
});

// 设置用户ID
autoTracker.setUserId('user-123');

// 设置用户属性
autoTracker.setUserProperties({
  plan: 'premium',
  loginCount: 5,
  lastLogin: '2025-03-18T03:30:00Z'
});

// 手动上报错误
try {
  // 可能会抛出错误的代码
} catch (error) {
  autoTracker.trackError(error);
}

// 手动上报性能指标
autoTracker.trackPerformance('image_processing', {
  duration: 150, // ms
  imageSize: '1024x768'
});
```

## 配置选项

AutoTracker SDK提供了丰富的配置选项，可以根据需要进行定制。

```javascript
autoTracker.init({
  // 基础配置
  appId: 'your-app-id',                     // 应用ID，用于区分不同应用
  debug: false,                             // 是否开启调试模式
  
  // 数据上报配置
  beacon: {
    url: 'https://analytics.example.com/collect',  // 数据上报地址
    batchSize: 10,                          // 批量上报数量阈值
    delay: 5000,                            // 定时上报间隔(ms)
    retryCount: 3,                          // 上报失败重试次数
    useBeacon: true,                        // 是否使用sendBeacon API
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
});
```

## API参考

### 核心方法

#### `init(options)`

初始化SDK，可以传入配置选项。

```javascript
autoTracker.init({
  appId: 'your-app-id',
  beacon: {
    url: 'https://your-analytics-endpoint.com/collect'
  }
});
```

#### `trackEvent(eventName, eventData)`

手动上报自定义事件。

```javascript
autoTracker.trackEvent('button_click', {
  buttonId: 'submit-button',
  page: 'checkout'
});
```

#### `trackError(error, context)`

手动上报错误。

```javascript
try {
  // 可能会抛出错误的代码
} catch (error) {
  autoTracker.trackError(error, {
    page: 'checkout',
    component: 'payment-form'
  });
}
```

#### `trackPerformance(metricName, metricData)`

手动上报性能指标。

```javascript
autoTracker.trackPerformance('image_processing', {
  duration: 150, // ms
  imageSize: '1024x768'
});
```

#### `setUserId(userId)`

设置用户ID。

```javascript
autoTracker.setUserId('user-123');
```

#### `setUserProperties(properties)`

设置用户属性。

```javascript
autoTracker.setUserProperties({
  plan: 'premium',
  loginCount: 5,
  lastLogin: '2025-03-18T03:30:00Z'
});
```

#### `destroy()`

销毁SDK实例，停止所有监控和上报。

```javascript
autoTracker.destroy();
```

## 数据格式

### 事件数据

```json
{
  "type": "event",
  "subType": "click",
  "timestamp": 1710728400000,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "selector": "button#submit-btn",
    "element": {
      "tagName": "button",
      "id": "submit-btn",
      "className": "btn btn-primary",
      "text": "Submit"
    },
    "position": {
      "x": 150,
      "y": 300
    }
  },
  "device": {
    "browser": {
      "name": "Chrome",
      "version": "120.0.0"
    },
    "os": {
      "name": "MacOS",
      "version": "14.1"
    },
    "screenWidth": 1920,
    "screenHeight": 1080
  },
  "page": {
    "url": "https://example.com/checkout",
    "title": "Checkout - Example Store",
    "referrer": "https://example.com/cart"
  }
}
```

### 性能数据

```json
{
  "type": "performance",
  "subType": "web_vitals",
  "timestamp": 1710728400000,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "name": "LCP",
    "value": 2350,
    "rating": "needs-improvement"
  },
  "device": { /* 设备信息 */ },
  "page": { /* 页面信息 */ }
}
```

### 错误数据

```json
{
  "type": "error",
  "subType": "js_error",
  "timestamp": 1710728400000,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "message": "Cannot read property 'length' of null",
    "stack": "TypeError: Cannot read property 'length' of null\n    at processData (app.js:42:10)\n    at submitForm (app.js:87:3)",
    "source": "https://example.com/js/app.js",
    "lineno": 42,
    "colno": 10,
    "fingerprint": "a1b2c3d4",
    "count": 1,
    "firstSeen": 1710728400000,
    "lastSeen": 1710728400000
  },
  "device": { /* 设备信息 */ },
  "page": { /* 页面信息 */ }
}
```

## 浏览器兼容性

AutoTracker SDK支持所有现代浏览器，包括：

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 15+

某些高级功能（如Performance Timeline API、Compression API等）可能在较旧的浏览器中不可用，SDK会自动降级处理。

## 示例

查看[example.html](./example.html)了解完整的使用示例。

## 许可证

MIT
