/**
 * 抖音粉丝 IP 归属地采集脚本
 * 
 * 使用方式：
 * 1. Chrome 打开 https://creator.douyin.com/ 并确保已登录
 * 2. 进入「粉丝管理」页面
 * 3. 按 F12 → Console
 * 4. 粘贴整个脚本，回车运行
 * 5. 脚本跑完后会自动下载一个 CSV 文件
 * 
 * 分两阶段：
 *   阶段1：滚动加载所有粉丝
 *   阶段2：逐个访问粉丝主页提取 IP 属地
 */

// ============ 配置 ============
const CONFIG = {
  maxFans: 20000,      // 最多采集数（你的1.7万足够）
  scrollDelay: 800,    // 每次滚动间隔(ms)
  profileDelay: 1500,  // 访问每个粉丝主页的间隔(ms)
};

// ============ 工具函数 ============
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function downloadCSV(data, filename = '抖音粉丝_IP属地.csv') {
  const BOM = '\uFEFF'; // Excel 中文不乱码
  const header = '序号,昵称,抖音号,IP归属地,主页链接';
  const rows = data.map((u, i) =>
    `"${i + 1}","${u.nickname}","${u.uniqueId}","${u.ipLocation}","${u.profileUrl}"`
  );
  const csv = BOM + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  console.log(`✅ 已下载 ${filename}，共 ${data.length} 条`);
}

// ============ 阶段1：滚动加载粉丝列表 ============
async function loadAllFollowers() {
  console.log('📌 阶段1：正在滚动加载粉丝列表...');
  let prevCount = 0;
  let emptyRounds = 0;

  while (true) {
    // 滚动到底部
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);

    // 统计当前粉丝卡片数（根据实际 DOM 结构适配）
    const items = document.querySelectorAll('[class*="fans"], [class*="Fans"], [class*="follower"], [class*="Follower"], .user-item, [class*="userItem"]');
    let currentCount = items.length;

    // 如果找不到上面选择器，尝试更通用的
    if (currentCount === 0) {
      // 找所有包含头像和昵称的卡片
      const allCards = document.querySelectorAll('[class*="avatar"]');
      currentCount = allCards.length;
    }

    // 实在找不到 DOM 选择器，打印帮助信息
    if (currentCount === 0) {
      console.warn('⚠️ 未找到粉丝列表 DOM，请检查是否在「粉丝管理」页面');
      console.log('当前 URL:', location.href);
      // 尝试打印一些关键元素
      const mainEl = document.querySelector('#root, #app, [class*="container"], [class*="main"]');
      console.log('主容器:', mainEl ? mainEl.className : '未找到');
      return 0;
    }

    console.log(`  已加载粉丝数: ${currentCount}`);

    if (currentCount > CONFIG.maxFans) {
      console.log(`✅ 已达到最大采集数 ${CONFIG.maxFans}`);
      return currentCount;
    }

    if (currentCount === prevCount) {
      emptyRounds++;
      if (emptyRounds >= 5) {
        console.log('✅ 粉丝列表已全部加载完毕');
        return currentCount;
      }
    } else {
      emptyRounds = 0;
    }
    prevCount = currentCount;
  }
}

// ============ 阶段2：提取粉丝信息 ============
async function extractFollowers() {
  console.log('📌 阶段2：正在提取粉丝信息...');

  // 获取所有粉丝元素
  const fans = document.querySelectorAll('[class*="fans"], [class*="Fans"], [class*="follower"], [class*="Follower"], [class*="userItem"], [class*="UserItem"]');
  // 尝试更通用的选择
  let links = document.querySelectorAll('a[href*="/user/"]');

  if (links.length === 0) {
    // 从所有元素中提取用户链接
    const allLinks = document.querySelectorAll('a');
    links = Array.from(allLinks).filter(a => a.href && a.href.includes('/user/'));
  }

  const results = [];
  const seen = new Set();

  for (const link of links) {
    const href = link.href;
    if (seen.has(href)) continue;
    seen.add(href);

    // 提取昵称
    const nicknameEl = link.querySelector('[class*="nickname"], [class*="Nickname"], [class*="name"], [class*="Name"]');
    const nickname = nicknameEl ? nicknameEl.textContent.trim() : link.textContent.trim().split('\n')[0].trim() || '未知';

    // 提取抖音号/ID
    const uidMatch = href.match(/\/user\/([a-zA-Z0-9_]+)/);
    const uniqueId = uidMatch ? uidMatch[1] : '';

    // 查看当前页面是否有 IP 属地显示
    const ipEl = link.querySelector('[class*="ip"], [class*="IP"], [class*="location"], [class*="Location"], [class*="address"]');
    let ipLocation = ipEl ? ipEl.textContent.trim() : '';

    results.push({
      nickname,
      uniqueId,
      ipLocation: ipLocation || '待获取',
      profileUrl: href.startsWith('http') ? href : `https://www.douyin.com/user/${uniqueId}`,
    });
  }

  console.log(`  ✅ 从列表中提取到 ${results.length} 个粉丝`);
  return results;
}

// ============ 阶段3：访问主页获取 IP 属地 ============
async function fetchIPLocations(fans) {
  const pending = fans.filter(f => f.ipLocation === '待获取' || !f.ipLocation);
  if (pending.length === 0) {
    console.log('  ✅ 所有粉丝 IP 属地已在列表中');
    return fans;
  }

  console.log(`📌 阶段3：正在逐个获取 IP 属地（共 ${pending.length} 个，间隔 ${CONFIG.profileDelay}ms）...`);
  console.log('⚠️ 不要操作浏览器，脚本会自动打开新标签页...');

  const total = pending.length;
  let completed = 0;

  for (const fan of pending) {
    completed++;
    try {
      const newWin = window.open(fan.profileUrl, '_blank');
      if (!newWin) {
        console.warn('  ⚠️ 弹窗被拦截，请允许弹窗后重新运行');
        break;
      }
      await sleep(3000); // 等待页面加载

      // 尝试读取 IP 属地
      try {
        const ipEl = newWin.document.querySelector('[class*="ip"], [class*="IP"], [class*="location"], [class*="address"]');
        if (ipEl) {
          fan.ipLocation = ipEl.textContent.trim();
        } else {
          // 尝试查找包含"IP属地"的文字
          const body = newWin.document.body.innerText;
          const match = body.match(/IP[属地属]?[：:]\s*(\S+)/);
          fan.ipLocation = match ? match[1] : '未显示';
        }
      } catch (e) {
        fan.ipLocation = '读取失败(跨域)';
      }

      newWin.close();
    } catch (e) {
      fan.ipLocation = '读取失败';
      console.error(`  第 ${completed}/${total} 个出错: ${fan.nickname}`, e.message);
    }

    if (completed % 20 === 0) {
      console.log(`  进度: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
    }

    await sleep(CONFIG.profileDelay);
  }

  // 更新原数组
  pending.forEach(f => {
    const idx = fans.indexOf(f);
    if (idx !== -1) fans[idx] = f;
  });

  return fans;
}

// ============ 主流程 ============
(async function main() {
  console.log('🚀 抖音粉丝 IP 属地采集工具');
  console.log('='.repeat(50));
  console.log('配置: 最大采集 ' + CONFIG.maxFans + ' 个粉丝');

  const total = await loadAllFollowers();
  if (total === 0) {
    console.error('❌ 无法加载粉丝列表');
    console.log('💡 请确认：');
    console.log('  1. 你已在 https://creator.douyin.com/ 登录');
    console.log('  2. 已进入「粉丝管理」页面');
    console.log('  3. 如有弹窗提示"是否继续"，请点击继续');
    return;
  }

  let fans = await extractFollowers();

  if (fans.length === 0) {
    console.error('❌ 未能提取到粉丝数据，请检查页面结构');
    return;
  }

  // 检查是否已有 IP 属地
  const hasIP = fans.some(f => f.ipLocation && f.ipLocation !== '待获取');
  if (!hasIP) {
    const confirmGo = confirm(`已提取 ${fans.length} 个粉丝，但列表未显示 IP 属地。\n是否要逐个访问粉丝主页获取？（需要允许弹窗）`);
    if (confirmGo) {
      fans = await fetchIPLocations(fans);
    } else {
      console.log('⚠️ 跳过 IP 属地获取，只导出粉丝列表');
    }
  }

  // 导出 CSV
  downloadCSV(fans);
  console.log('🎉 完成！');

  // 打印前10条预览
  console.log('\n📊 预览（前10条）：');
  console.table(fans.slice(0, 10));
})();
