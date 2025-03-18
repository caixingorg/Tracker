# AutoTracker SDK

AutoTracker SDK 是一个无埋点数据采集SDK，支持Web、微信小程序和支付宝小程序等多平台。

## 项目架构

项目使用Lerna管理的monorepo结构，包含以下几个主要模块：

```
AutoTracker/
├── packages/               # Lerna管理的包
│   ├── core/               # 核心功能模块
│   ├── utils/              # 通用工具函数
│   ├── web/                # Web平台适配器
│   ├── wechat/             # 微信小程序适配器
│   └── alipay/             # 支付宝小程序适配器
├── dist/                   # 构建输出目录
│   ├── auto-tracker-web.js       # Web平台SDK
│   ├── auto-tracker-wechat.js    # 微信小程序SDK
│   └── auto-tracker-alipay.js    # 支付宝小程序SDK
├── auto-tracker.js         # 统一入口文件
├── build.js                # 构建脚本
├── cleanup.js              # 清理旧代码脚本
└── example.html            # 示例文件
```

## 架构设计

AutoTracker SDK采用模块化设计，主要包含以下几个部分：

1. **核心模块 (Core)**: 包含SDK的核心功能，如配置管理、数据上报等
2. **工具模块 (Utils)**: 提供通用工具函数，如设备信息获取、平台检测等
3. **平台适配器**: 针对不同平台的特定实现
   - Web平台适配器
   - 微信小程序适配器
   - 支付宝小程序适配器

## 构建流程

新的构建流程直接生成三个平台的SDK，无需分别构建每个包：

```
npm run build        # 开发环境构建
npm run build:prod   # 生产环境构建
```

构建后的文件将输出到`dist`目录，包括：

- `auto-tracker-web.js` - Web平台SDK (UMD格式)
- `auto-tracker-web.esm.js` - Web平台SDK (ES Module格式)
- `auto-tracker-wechat.js` - 微信小程序SDK (CommonJS格式)
- `auto-tracker-wechat.esm.js` - 微信小程序SDK (ES Module格式)
- `auto-tracker-alipay.js` - 支付宝小程序SDK (CommonJS格式)
- `auto-tracker-alipay.esm.js` - 支付宝小程序SDK (ES Module格式)

## 使用方法

### Web平台

```html
<!-- 使用UMD格式 -->
<script src="dist/auto-tracker-web.js"></script>
<script>
  AutoTracker.init({
    appId: 'your-app-id',
    // 其他配置...
  });
</script>

<!-- 或者使用ES Module格式 -->
<script type="module">
  import autoTracker from './auto-tracker.js';
  
  autoTracker.init({
    appId: 'your-app-id',
    // 其他配置...
  });
</script>
```

### 微信小程序

```javascript
// app.js
import autoTracker from 'path/to/auto-tracker-wechat.js';

autoTracker.init({
  appId: 'your-app-id',
  // 其他配置...
});
```

### 支付宝小程序

```javascript
// app.js
import autoTracker from 'path/to/auto-tracker-alipay.js';

autoTracker.init({
  appId: 'your-app-id',
  // 其他配置...
});
```

### 自动平台检测

使用统一入口文件，SDK会自动检测当前平台并加载对应的实现：

```javascript
import autoTracker from './auto-tracker.js';

autoTracker.init({
  appId: 'your-app-id',
  // 其他配置...
});
```

## 开发命令

```bash
# 安装依赖
npm install

# 初始化Lerna工作区
npm run bootstrap

# 构建开发版本
npm run build

# 构建生产版本
npm run build:prod

# 清理旧代码（会先备份）
npm run clean:legacy

# 运行测试
npm test

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 配置选项

```javascript
{
  // 基础配置
  appId: '',                // 应用ID
  debug: false,             // 是否开启调试模式
  userId: '',               // 用户ID
  userProperties: {},       // 用户属性
  
  // 事件跟踪配置
  event: {
    click: {
      enabled: true,        // 是否跟踪点击事件
      // ...
    },
    // ...
  },
  
  // 性能监控配置
  performance: {
    enabled: true,          // 是否启用性能监控
    // ...
  },
  
  // 错误监控配置
  error: {
    enabled: true,          // 是否启用错误监控
    // ...
  },
  
  // 数据上报配置
  beacon: {
    url: '',                // 数据上报地址
    // ...
  },
  
  // 热图配置
  heatmap: {
    enabled: true,          // 是否启用热图功能
    throttleTime: 200,      // 点击事件节流时间（毫秒）
    maxRecords: 10000,      // 最大记录数
    ignoreSelectors: [],    // 忽略的元素选择器
    sampleRate: 0.5         // 采样率
  },
  
  // 会话指标配置
  session: {
    enabled: true,          // 是否启用会话指标
    sessionTimeout: 1800,   // 会话超时时间（秒）
    trackBounceRate: true,  // 是否跟踪跳出率
    trackSessionDuration: true, // 是否跟踪会话时长
    sampleRate: 1.0         // 采样率
  },
  
  // 漏斗配置
  funnel: {
    enabled: true,          // 是否启用漏斗跟踪
    maxFunnels: 20,         // 最大漏斗数
    maxStepsPerFunnel: 10,  // 每个漏斗的最大步骤数
    // 预定义漏斗
    predefined: [
      {
        id: 'registration',
        name: '用户注册漏斗',
        steps: [
          { id: 'view_register', name: '查看注册页' },
          { id: 'fill_form', name: '填写表单' },
          { id: 'submit_form', name: '提交表单' },
          { id: 'verify_email', name: '验证邮箱' },
          { id: 'complete_profile', name: '完成资料' }
        ]
      }
    ]
  },
  
  // 小程序配置
  miniProgram: {
    // ...
  }
}
```

## 新增功能

### 1. 用户点击热图

热图功能可以记录用户在页面上的点击位置，帮助分析用户行为模式和页面热点区域。

```javascript
// 开始记录热图数据
sdk.startHeatmapRecording();

// 停止记录热图数据
sdk.stopHeatmapRecording();

// 获取热图数据
const heatmapData = sdk.getHeatmapData();
```

热图数据包含以下信息：
- 点击坐标（绝对和相对）
- 点击元素路径
- 页面URL
- 时间戳
- 视口和页面尺寸

### 2. 跳出率统计

会话指标功能可以跟踪用户会话信息，包括跳出率、会话时长等。

```javascript
// 获取会话ID
const sessionId = sdk.getSessionId();

// 获取会话持续时间（毫秒）
const sessionDuration = sdk.getSessionDuration();

// 获取跳出率（0-1之间的小数）
const bounceRate = sdk.getBounceRate();
```

跳出率定义为：没有交互的页面访问次数 / 总页面访问次数。

### 3. 转化漏斗

漏斗功能可以跟踪用户在转化流程中的进度，帮助分析转化率和流失点。

```javascript
// 创建漏斗
sdk.createFunnel('checkout', '结账流程', [
  { id: 'view_cart', name: '查看购物车' },
  { id: 'enter_shipping', name: '填写收货信息' },
  { id: 'enter_payment', name: '填写支付信息' },
  { id: 'confirm_order', name: '确认订单' },
  { id: 'complete_payment', name: '完成支付' }
]);

// 记录用户进入漏斗步骤
sdk.enterFunnelStep('checkout', 'view_cart', 'user123', { 
  cartValue: 100 
});

// 获取漏斗数据
const funnelData = sdk.getFunnelData('checkout');

// 获取漏斗整体转化率
const conversionRate = sdk.getConversionRate('checkout');
```

漏斗数据包含每个步骤的访问次数、用户数、转化率等信息。

## 许可证

MIT
