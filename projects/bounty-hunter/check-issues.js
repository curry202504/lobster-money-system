const https = require('https');
function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'bounty-hunter/1.0', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  const issues = [
    { name: 'CHANGELOG generator', url: 'https://api.github.com/repos/claude-builders-bounty/claude-builders-bounty/issues/1' },
    { name: 'Pre-tool-use hook', url: 'https://api.github.com/repos/claude-builders-bounty/claude-builders-bounty/issues/3' },
    { name: 'PR Review Agent', url: 'https://api.github.com/repos/claude-builders-bounty/claude-builders-bounty/issues/4' },
    { name: 'GH Actions CI', url: 'https://api.github.com/repos/kcolbchain/erc721-ai/issues/31' },
  ];
  
  for (const issue of issues) {
    const data = await fetchJson(issue.url);
    if (data) {
      console.log('=== ' + issue.name + ' ===');
      console.log('Title: ' + data.title);
      console.log('State: ' + data.state);
      console.log('URL: ' + data.html_url);
      console.log('Body (first 600 chars):');
      console.log((data.body || 'N/A').slice(0, 600));
      console.log('Labels: ' + (data.labels||[]).map(l=>l.name).join(', '));
      console.log('');
    } else {
      console.log('Failed: ' + issue.name);
    }
  }
}
main();
