// LinkClean - 后台服务
// 追踪参数黑名单 - 持续更新
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  'msclkid', 'twclid', 'igshid', 'mc_cid', 'mc_eid',
  'trk', 'trkCampaign', 'trk_content', 'trk_organization',
  'yclid', 'ysclid', 'hkclid',
  'ref', 'ref_src', 'ref_url',
  'source', 'si',
  '_ga', '_gl',
  'sc_campaign', 'sc_channel', 'sc_content', 'sc_medium', 'sc_outcome', 'sc_geo',
  'vero_conv', 'vero_id',
  'wickedid', 'wickedid',
  'mkt_tok',
];

// 监听复制事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkClean 已安装');
});

console.log('LinkClean background service started');
