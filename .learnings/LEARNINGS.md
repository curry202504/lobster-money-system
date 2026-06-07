# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260514-001] correction

**Logged**: 2026-05-14T16:00:00+08:00
**Priority**: high
**Status**: promoted
**Area**: research

### Summary
When user asks for "高空幕墙清洗机器人" (curtain wall cleaning robots) on Amazon, do NOT search for general "window cleaning robot" — those return consumer products ($100-$600). Industrial-grade products ($100k+) are B2B only.

### Details
- User specifically said "高空幕墙清洗" = industrial building facade cleaning
- Amazon only sells consumer-grade window cleaning robots (Ecovacs WINBOT, FRUITEAM, OUKESEN etc.)
- Industrial products are sold via: Alibaba (B2B), brand official websites, supplier platforms (gys.cn, made-in-china.com), distributors
- Key brands: SERBOT (SERBOT I/II/III), Skyline Robotics (Ozmo), IPC Eagle (Gulliver), 凌度智能 (X-Human), 哈工鹏泽
- Price range: ¥100,000-2,000,000 (NOT $100-600)

### Correct Approach
1. First verify what category the user means (consumer vs industrial)
2. For industrial: search Alibaba Showroom, brand websites, B2B platforms
3. Use 360搜索 (so.com) for Chinese industrial data — it's more accessible than Baidu
4. Screenshots must be of actual product/website pages, NOT search result pages

### Metadata
- Source: user_correction (multiple times)
- Tags: industrial_research, ecommerce, B2B
- Promoted: TOOLS.md

---

## [LRN-20260514-002] correction

**Logged**: 2026-05-14T16:05:00+08:00
**Priority**: high
**Status**: promoted
**Area**: screenshots

### Summary
When taking screenshots for reports: capture actual product/website pages, NOT search results or navigation pages.

### Details
- User complained screenshots were "乱七八糟" (messy)
- Search result pages are not useful screenshots
- Need to navigate to actual product detail pages or official website homepages
- For sites with SSL issues (like serbot.com.cn), bypass the warning first
- For sites that don't load (like skylinerobotics.com), use alternative search results snapshot

### Correct Approach
1. Navigate to the actual page URL
2. Wait for content to load
3. Take screenshot of rendered page
4. Verify screenshot has meaningful content (check file size > 50KB for web pages)

### Metadata
- Source: user_correction
- Tags: screenshots, documentation
- Promoted: TOOLS.md

---

## [LRN-20260514-003] best_practice

**Logged**: 2026-05-14T16:10:00+08:00
**Priority**: medium
**Status**: pending
**Area**: research

### Summary
Before presenting data to user, verify accuracy and relevance — don't make the user catch mistakes.

### Details
- Presenting wrong Amazon products wasted multiple rounds
- Should have checked: "is this the right category?" before sending
- User should not need to correct the same mistake twice
- After each round of results, do a self-check: "Would I trust this data?"

### Suggested Action
Before presenting any research results, pause and verify:
1. Does this match the user's stated requirements?
2. Are the prices in the right range?
3. Are these the same type of product?
4. Are screenshots showing what they should show?

### Metadata
- Source: user_feedback ("你要学会进步，不用每次都让我提醒你")
- Tags: quality, verification
- See Also: LRN-20260514-001, LRN-20260514-002

---

## [LRN-20260514-004] knowledge_gap

**Logged**: 2026-05-14T16:15:00+08:00
**Priority**: medium
**Status**: pending
**Area**: industry

### Summary
凌度智能 (X-Human) now has obstacle-crossing (越障) products: 凌云Y3 (3rd gen, 2025.11) and 凌风S1.

### Details
- 凌度智能 tried obstacle-crossing around 2017, abandoned due to cost (+75%)
- Focused on flat curtain wall cleaning (凌空K1), became commercially successful
- In 2025.11, relaunched obstacle-crossing with 凌云Y3 (3rd gen robot)
- Also has 凌风S1 (another obstacle-crossing model)
- This is directly competitive with 哈工鹏泽GE02

### Metadata
- Source: research
- Tags: competitor, curtain_wall_cleaning
- Related Files: 哈工鹏泽竞品分析/汇总文档/竞品分析报告_工业级_含图.docx

---
