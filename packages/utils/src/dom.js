/**
 * DOM相关工具函数
 */

/**
 * 生成元素的唯一选择器
 * @param {HTMLElement} element - DOM元素
 * @param {Boolean} optimized - 是否优化选择器长度
 * @return {String} 元素的CSS选择器
 */
export function generateSelector(element, optimized = true) {
  // 检查是否在浏览器环境
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }
  
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  // 如果元素有ID，直接使用ID选择器
  if (element.id && optimized) {
    return `#${element.id}`;
  }
  
  // 获取元素的标签名
  let selector = element.tagName.toLowerCase();
  
  // 添加类名（最多使用前两个类名）
  if (element.classList && element.classList.length && optimized) {
    const classes = Array.from(element.classList).slice(0, 2);
    selector += classes.map(c => `.${c}`).join('');
  }
  
  // 如果是根元素或已经到达body，则返回
  if (element === document.documentElement || element === document.body) {
    return selector;
  }
  
  // 如果有父元素，递归生成父元素的选择器
  if (element.parentElement) {
    // 查找同级相同标签的元素，确定元素在其中的位置
    if (!optimized || !element.id) {
      const sameTagSiblings = Array.from(element.parentElement.children)
        .filter(child => child.tagName === element.tagName);
      
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(element) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    // 递归处理父元素，但限制选择器的最大长度
    const parentSelector = optimized 
      ? generateSelector(element.parentElement, false).split(' ').slice(-2).join(' ')
      : generateSelector(element.parentElement, false);
    
    return parentSelector ? `${parentSelector} > ${selector}` : selector;
  }
  
  return selector;
}
