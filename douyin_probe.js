// === 抖音关注列表 DOM 探测器 ===
// 在抖音关注列表页面 (https://www.douyin.com/user/self?showTab=follow) 的 Console 中运行
// 先运行这个看看页面结构，不要做任何操作

(function() {
  console.clear();
  console.log('🔍 正在探测抖音关注页面 DOM 结构...');
  
  const report = {
    url: location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
  };
  
  // 1. 查找所有包含"关注"文字的可见元素
  console.log('\n📌 查找"关注"相关元素...');
  const followTexts = [];
  document.querySelectorAll('*').forEach(el => {
    const text = (el.textContent || '').trim();
    if (el.children.length === 0 && text && ['已关注', '关注', '回关', '朋友', '取消关注', '互相关注'].includes(text)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        followTexts.push({
          text: text,
          tag: el.tagName,
          class: el.className?.substring(0, 120),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          visible: true,
          html: el.outerHTML.substring(0, 200),
        });
      }
    }
  });
  report.followElements = followTexts;
  console.log(`找到 ${followTexts.length} 个关注相关元素:`, followTexts.slice(0, 20));
  
  // 2. 查找用户列表容器
  console.log('\n📌 查找可能的用户列表容器...');
  const containers = [];
  document.querySelectorAll('div, ul, section').forEach(el => {
    const text = el.textContent || '';
    if (el.children.length > 3 && text.includes('关注') && text.includes('粉丝')) {
      containers.push({
        tag: el.tagName,
        id: el.id || '(none)',
        class: el.className?.substring(0, 120),
        childCount: el.children.length,
        textPreview: text.substring(0, 200),
      });
    }
  });
  report.containers = containers.slice(0, 10);
  containers.slice(0, 5).forEach(c => console.log(`  容器: <${c.tag}> class="${c.class}" children=${c.childCount}`));
  
  // 3. 查找用户列表项
  console.log('\n📌 查找用户列表项...');
  const userItems = [];
  // 尝试常见选择器模式
  const selectors = [
    '[class*="user"]',
    '[class*="follow-item"]',
    '[class*="UserItem"]',
    '[class*="user-item"]',
    '[class*="list-item"]',
    'li[class*="item"]',
    '[class*="card"]',
  ];
  
  selectors.forEach(sel => {
    try {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        userItems.push({ selector: sel, count: els.length });
      }
    } catch(e) {}
  });
  
  report.userItemSelectors = userItems;
  console.log('用户列表项选择器:', userItems);
  
  // 4. 页面整体结构
  console.log('\n📌 页面文本摘要（前1000字符）:');
  const bodyText = document.body.innerText.substring(0, 1000);
  console.log(bodyText);
  report.bodyPreview = bodyText;
  
  // 5. 查找互关标识
  console.log('\n📌 查找互关/朋友标识...');
  const mutualEls = [];
  document.querySelectorAll('*').forEach(el => {
    const text = (el.textContent || '').trim();
    if (el.children.length === 0 && ['回关', '朋友', '互相关注', '互关'].includes(text)) {
      mutualEls.push({
        text: text,
        tag: el.tagName,
        class: el.className?.substring(0, 120),
        parentTag: el.parentElement?.tagName,
        parentClass: el.parentElement?.className?.substring(0, 120),
      });
    }
  });
  report.mutualElements = mutualEls;
  console.log(`找到 ${mutualEls.length} 个互关相关元素:`, mutualEls.slice(0, 10));
  
  // 输出完整报告
  console.log('\n✅ 探测完成！');
  console.log('完整报告:', report);
  
  // 把报告存到全局变量方便后续使用
  window.__douyin_report = report;
  console.log('报告已存储到 window.__douyin_report');
})();
