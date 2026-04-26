
// 测试有效期日期在标签前面的情况
const fullTextTest = "【产品批号】\n231010\n【生产日期】\n2023.10.27\n2025.09\n【有效期】至";

console.log('=== 测试日期在标签前面 ===');
console.log('测试文本:', fullTextTest);

let expiryDateStr = '';
let expiryToIndex = -1;

// 查找标签位置
const labelPatterns = [
  '【保质期至】', '[保质期至]', '保质期至', 
  '【有效期至】', '[有效期至]', '有效期至',
  '【有效期】至', '[有效期]至', '有效期至'
];

for (const label of labelPatterns) {
  const idx = fullTextTest.indexOf(label);
  if (idx !== -1) {
    expiryToIndex = idx;
    console.log('✅ 找到标签:', label, '位置:', idx);
    break;
  }
}

if (expiryToIndex !== -1) {
  // 先尝试搜索标签后面
  const searchAfter = fullTextTest.substring(expiryToIndex, Math.min(expiryToIndex + 60, fullTextTest.length));
  console.log('📋 搜索范围（标签后面）:', searchAfter);
  
  let nearbyDateMatch = 
    searchAfter.match(/(\d{4}\.\d{1,2}(?:\.\d{1,2})?)/) || 
    searchAfter.match(/(\d{4}-\d{1,2}(?:-\d{1,2})?)/) || 
    searchAfter.match(/(\d{4}\/\d{1,2}(?:\/\d{1,2})?)/) ||
    searchAfter.match(/(\d{4}年\d{1,2}月(?:\d{1,2}日)?)/) || 
    searchAfter.match(/(\d{8})/);
  
  if (nearbyDateMatch && nearbyDateMatch[1]) {
    expiryDateStr = nearbyDateMatch[1];
    console.log('✅ 在标签后面搜索到日期:', expiryDateStr);
  } else {
    // 搜索标签前面
    const searchBefore = fullTextTest.substring(Math.max(0, expiryToIndex - 100), expiryToIndex);
    console.log('📋 搜索范围（标签前面）:', searchBefore);
    
    const allDatePatterns = [
      /(\d{4}\.\d{1,2}(?:\.\d{1,2})?)/,
      /(\d{4}-\d{1,2}(?:-\d{1,2})?)/,
      /(\d{4}\/\d{1,2}(?:\/\d{1,2})?)/,
      /(\d{4}年\d{1,2}月(?:\d{1,2}日)?)/,
      /(\d{8})/
    ];
    
    for (const datePattern of allDatePatterns) {
      const dates = [...searchBefore.matchAll(datePattern)];
      if (dates.length > 0) {
        console.log('✅ 找到', dates.length, '个日期:', dates.map(d => d[1]));
        
        // 取最后一个日期（最接近标签的）
        const lastDate = dates[dates.length - 1];
        const possibleDate = lastDate[1];
        
        console.log('⏭️  检查最后一个日期:', possibleDate);
        
        // 检查黑名单
        const blacklist = ['生产日期', '生产批号', '产品批号', '说明书编制日期', '批准文号'];
        let isBlacklisted = false;
        const datePos = searchBefore.lastIndexOf(possibleDate);
        const context = searchBefore.substring(Math.max(0, datePos - 20), datePos + possibleDate.length);
        
        for (const keyword of blacklist) {
          if (context.includes(keyword)) {
            isBlacklisted = true;
            console.log('⚠️ 发现黑名单关键词，跳过:', keyword);
            break;
          }
        }
        
        if (!isBlacklisted) {
          expiryDateStr = possibleDate;
          console.log('✅ 在标签前面搜索到日期:', expiryDateStr);
          break;
        }
      }
    }
  }
}

console.log('\n=== 最终结果 ===');
console.log('expiryDateStr:', expiryDateStr);
console.log('=== 测试结束 ===');
