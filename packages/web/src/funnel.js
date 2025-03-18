/**
 * 转化漏斗跟踪模块
 */

let config = {};
let beaconSender = null;
let activeFunnels = {};

/**
 * 初始化漏斗跟踪
 * @param {Object} sdkConfig - SDK配置
 * @param {Object} sender - 数据上报实例
 */
export function initFunnel(sdkConfig, sender) {
  config = sdkConfig;
  beaconSender = sender;
  
  // 从配置中加载预定义的漏斗
  if (config.funnel && Array.isArray(config.funnel.predefined)) {
    config.funnel.predefined.forEach(funnel => {
      createFunnel(funnel.id, funnel.name, funnel.steps);
    });
  }
  
  if (config.debug) {
    console.log('[AutoTracker] Funnel tracking initialized');
  }
  
  return {
    createFunnel,
    enterFunnelStep,
    getFunnelData,
    getConversionRate
  };
}

/**
 * 创建漏斗
 * @param {String} id - 漏斗ID
 * @param {String} name - 漏斗名称
 * @param {Array} steps - 漏斗步骤数组，每个步骤包含id和name
 * @return {Object} 漏斗对象
 */
function createFunnel(id, name, steps) {
  if (!id || !Array.isArray(steps) || steps.length < 2) {
    if (config.debug) {
      console.error('[AutoTracker] Invalid funnel configuration', { id, name, steps });
    }
    return null;
  }
  
  // 创建漏斗对象
  const funnel = {
    id,
    name: name || id,
    steps: steps.map((step, index) => ({
      id: step.id,
      name: step.name || step.id,
      index,
      count: 0,
      users: new Set()
    })),
    users: new Set(),
    startTime: Date.now()
  };
  
  // 存储漏斗
  activeFunnels[id] = funnel;
  
  if (config.debug) {
    console.log('[AutoTracker] Funnel created', funnel);
  }
  
  return funnel;
}

/**
 * 进入漏斗步骤
 * @param {String} funnelId - 漏斗ID
 * @param {String} stepId - 步骤ID
 * @param {String} userId - 用户ID
 * @param {Object} data - 附加数据
 */
function enterFunnelStep(funnelId, stepId, userId, data = {}) {
  const funnel = activeFunnels[funnelId];
  
  if (!funnel) {
    if (config.debug) {
      console.error(`[AutoTracker] Funnel not found: ${funnelId}`);
    }
    return;
  }
  
  // 查找步骤
  const step = funnel.steps.find(s => s.id === stepId);
  
  if (!step) {
    if (config.debug) {
      console.error(`[AutoTracker] Step not found in funnel ${funnelId}: ${stepId}`);
    }
    return;
  }
  
  // 记录用户进入步骤
  step.count++;
  step.users.add(userId);
  
  // 记录用户进入漏斗
  funnel.users.add(userId);
  
  // 计算转化率
  const conversionData = calculateStepConversion(funnel, step);
  
  // 上报数据
  if (beaconSender) {
    beaconSender.send({
      type: 'funnel',
      subType: 'step',
      funnelId,
      stepId,
      userId,
      timestamp: Date.now(),
      data: {
        ...data,
        stepIndex: step.index,
        stepName: step.name,
        funnelName: funnel.name,
        ...conversionData
      }
    });
  }
  
  if (config.debug) {
    console.log(`[AutoTracker] User ${userId} entered funnel ${funnelId} step ${stepId}`, {
      step,
      conversionData
    });
  }
}

/**
 * 计算步骤转化率
 * @param {Object} funnel - 漏斗对象
 * @param {Object} currentStep - 当前步骤
 * @return {Object} 转化率数据
 */
function calculateStepConversion(funnel, currentStep) {
  // 获取第一个步骤
  const firstStep = funnel.steps[0];
  
  // 获取前一个步骤
  const prevStep = currentStep.index > 0 ? funnel.steps[currentStep.index - 1] : null;
  
  // 计算与第一步的转化率
  const overallConversionRate = firstStep.count > 0 
    ? currentStep.count / firstStep.count 
    : 0;
  
  // 计算与前一步的转化率
  const stepConversionRate = prevStep && prevStep.count > 0 
    ? currentStep.count / prevStep.count 
    : 1;
  
  return {
    overallConversionRate,
    stepConversionRate,
    totalUsers: funnel.users.size,
    stepUsers: currentStep.users.size
  };
}

/**
 * 获取漏斗数据
 * @param {String} funnelId - 漏斗ID
 * @return {Object} 漏斗数据
 */
function getFunnelData(funnelId) {
  const funnel = activeFunnels[funnelId];
  
  if (!funnel) {
    if (config.debug) {
      console.error(`[AutoTracker] Funnel not found: ${funnelId}`);
    }
    return null;
  }
  
  // 计算每个步骤的转化率
  const stepsData = funnel.steps.map(step => {
    const conversionData = calculateStepConversion(funnel, step);
    
    return {
      id: step.id,
      name: step.name,
      index: step.index,
      count: step.count,
      users: step.users.size,
      ...conversionData
    };
  });
  
  return {
    id: funnel.id,
    name: funnel.name,
    startTime: funnel.startTime,
    totalUsers: funnel.users.size,
    steps: stepsData,
    conversionRate: getConversionRate(funnelId)
  };
}

/**
 * 获取漏斗整体转化率
 * @param {String} funnelId - 漏斗ID
 * @return {Number} 转化率（0-1之间的小数）
 */
function getConversionRate(funnelId) {
  const funnel = activeFunnels[funnelId];
  
  if (!funnel || funnel.steps.length < 2) {
    return 0;
  }
  
  const firstStep = funnel.steps[0];
  const lastStep = funnel.steps[funnel.steps.length - 1];
  
  if (firstStep.count === 0) {
    return 0;
  }
  
  return lastStep.count / firstStep.count;
}
