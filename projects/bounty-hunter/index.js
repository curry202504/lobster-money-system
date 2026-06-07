#!/usr/bin/env node
/**
 * 🦞 Bounty Hunter - 代码赏金查找工具
 * 
 * 扫描多个平台找钱，不用你自己一个个翻
 * 
 * 用法: node index.js [search-term]
 */

const https = require('https');
const http = require('http');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// ========== GitHub API - 找标注了 bounty/help wanted 的 issue ==========
async function fetchGitHubBounties(query = '') {
  const searchTerms = query || 'label:bounty+label:help-wanted+state:open';
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(searchTerms)}&sort=updated&per_page=10`;
  
  try {
    const data = await fetchJson(url, { 'User-Agent': 'bounty-hunter/1.0' });
    if (!data || !data.items) return [];
    
    return data.items.map(item => ({
      platform: 'GitHub',
      title: item.title,
      url: item.html_url,
      repo: item.repository_url?.split('/').slice(-2).join('/') || 'unknown',
      labels: item.labels?.map(l => l.name) || [],
      created: item.created_at?.slice(0, 10),
      score: item.score || 0,
    }));
  } catch (e) {
    return [];
  }
}

// ========== Algora API (直接fetch) ==========
async function fetchAlgoraBounties() {
  try {
    const data = await fetchJson('https://api.algora.io/v1/bounties?limit=5');
    if (!data || !data.bounties) return [];
    return data.bounties.map(b => ({
      platform: 'Algora',
      title: b.title,
      url: `https://algora.io/bounty/${b.id}`,
      repo: b.repo,
      amount: b.amount ? `$${b.amount}` : '未标注',
      status: b.status,
    }));
  } catch (e) {
    return [];
  }
}

// ========== 辅助函数 ==========
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { headers: { 'Accept': 'application/json', ...headers } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Handle API rate limits
          if (res.statusCode === 403 || res.statusCode === 429) {
            console.log(`  ${YELLOW}⚠ API rate limited${RESET}`);
            resolve(null);
            return;
          }
          if (res.statusCode === 404) {
            resolve(null);
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

function printBanner() {
  console.log(`
${GREEN}╔══════════════════════════════════════╗
║      🦞  BOUNTY HUNTER v1.0         ║
║      代码赏金·一把梭                ║
╚══════════════════════════════════════╝${RESET}
`);
}

function printResults(type, results) {
  if (!results || results.length === 0) {
    console.log(`  ${DIM}暂无数据（API限制或无结果）${RESET}`);
    return;
  }

  console.log(`\n${BOLD}${CYAN}▸ ${type}${RESET}`);
  console.log(`  ${DIM}${'─'.repeat(50)}${RESET}`);
  
  results.slice(0, 8).forEach((r, i) => {
    const tags = r.labels ? r.labels.slice(0, 3).join(', ') : (r.amount || r.status || '');
    console.log(`  ${GREEN}${i+1}.${RESET} ${r.title?.slice(0, 50) || '无标题'}`);
    console.log(`     ${DIM}${r.url}${RESET}`);
    if (tags) console.log(`     ${YELLOW}🏷 ${tags}${RESET}`);
    if (r.repo) console.log(`     ${MAGENTA}📦 ${r.repo}${RESET}`);
    console.log();
  });
}

// ========== Main ==========
async function main() {
  printBanner();
  
  const searchTerm = process.argv[2] || '';
  console.log(` ${DIM}搜索: ${searchTerm || '热门bounty'}${RESET}`);
  console.log(` ${DIM}时间: ${new Date().toLocaleString('zh-CN')}${RESET}\n`);

  // GitHub bounties
  console.log(` ${YELLOW}⟳ 正在扫描 GitHub...${RESET}`);
  const ghBounties = await fetchGitHubBounties(searchTerm);
  printResults('GitHub Bounty Issues', ghBounties);

  // Algora bounties  
  console.log(` ${YELLOW}⟳ 正在扫描 Algora...${RESET}`);
  const algBounties = await fetchAlgoraBounties();
  printResults('Algora Bounties', algBounties);

  // Summary
  console.log(`\n${BOLD}${GREEN}══════════════════════════════════════${RESET}`);
  const total = (ghBounties?.length || 0) + (algBounties?.length || 0);
  console.log(` ${BOLD}共计找到 ${total} 个可接任务${RESET}`);
  console.log(` ${DIM}更多平台: Gitcoin · BountyHub · 程序员客栈 · Upwork${RESET}`);
  console.log(`${BOLD}${GREEN}══════════════════════════════════════${RESET}\n`);
  
  console.log(` ${DIM}💡 提示: 用 "node index.js <关键词>" 搜索特定技术栈${RESET}`);
  console.log(` ${DIM}   例: node index.js python   (找Python相关的bounty)${RESET}`);
  console.log(` ${DIM}   例: node index.js javascript (找JS相关的bounty)${RESET}\n`);
}

main().catch(console.error);
