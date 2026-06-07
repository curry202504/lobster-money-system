const https = require('https');
const token = process.env.TOKEN || '';

async function fetch(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'Authorization': `token ${token}`, 'User-Agent': 'bounty-hunter' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  // Check audit-checklist repo structure
  console.log('=== audit-checklist root ===');
  const root = await fetch('https://api.github.com/repos/kcolbchain/audit-checklist/contents');
  if (Array.isArray(root)) {
    root.forEach(item => console.log(`  ${item.type} - ${item.name}`));
  } else if (root) {
    console.log(root.message || JSON.stringify(root).slice(0, 200));
  }

  // Check checks dir
  console.log('\n=== checks/ directory ===');
  const checks = await fetch('https://api.github.com/repos/kcolbchain/audit-checklist/contents/checks');
  if (Array.isArray(checks)) {
    checks.forEach(c => console.log(`  ${c.name}`));
    // Show first check file content
    if (checks.length > 0) {
      console.log(`\n=== Sample: ${checks[0].name} ===`);
      const content = await fetch(checks[0].git_url);
      if (content && content.content) {
        const decoded = Buffer.from(content.content, 'base64').toString();
        console.log(decoded.slice(0, 500));
      }
    }
  } else if (checks) {
    console.log(checks.message || JSON.stringify(checks).slice(0, 200));
  }

  // Check issue 37 body
  console.log('\n=== Issue #37 details ===');
  const issue37 = await fetch('https://api.github.com/repos/kcolbchain/audit-checklist/issues/37');
  if (issue37) console.log(issue37.body ? issue37.body.slice(0, 500) : 'No body');

  // Check issue 36 body
  console.log('\n=== Issue #36 details ===');
  const issue36 = await fetch('https://api.github.com/repos/kcolbchain/audit-checklist/issues/36');
  if (issue36) console.log(issue36.body ? issue36.body.slice(0, 500) : 'No body');
}

main();
