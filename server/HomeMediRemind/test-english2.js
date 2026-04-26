
// 简化的英文测试
const fullTextTest = `Nature's Key
SLEEP
Chewable Tablets
Dietary Supplements
Melatonin
6mg
Suggested Use: Adults take 2 tablets 20-30 mins before bedtime.
LOT: N259M1214
EXP: 12/2026`;

console.log('=== 简单测试英文识别 ===');

// 1. 测试英文有效期格式
const test1 = /exp[ \t]*[:][ \t]*(\d{1,2}[\/]\d{4})/i.exec(fullTextTest);
console.log('EXP: 12/2026 匹配:', test1 ? test1[1] : '失败');

// 2. 测试用法用量
const test2 = /suggested[ \t]*use[ \t]*:[\s\S]*?([^\n]+)/i.exec(fullTextTest);
console.log('Suggested Use 匹配:', test2 ? test2[1].trim() : '失败');

// 3. 测试药品名称
const tabletLine = fullTextTest.split('\n').find(line => line.toLowerCase().includes('tablet'));
console.log('Tablet 名称:', tabletLine || '未找到');

console.log('\n=== 测试格式转换 ===');
// 测试 MM/YYYY 转换
const testDate1 = '12/2026';
const parts1 = testDate1.split('/');
let y, m, d;
if (parseInt(parts1[0]) > 1000) {
  y = parts1[0];
  m = parts1[1];
} else {
  m = parts1[0];
  y = parts1[1];
}
d = '01';
console.log(`${testDate1} → ${y}.${m.padStart(2, '0')}.${d}`);

const testDate2 = '2025/12';
const parts2 = testDate2.split('/');
let y2, m2, d2;
if (parseInt(parts2[0]) > 1000) {
  y2 = parts2[0];
  m2 = parts2[1];
} else {
  m2 = parts2[0];
  y2 = parts2[1];
}
d2 = '01';
console.log(`${testDate2} → ${y2}.${m2.padStart(2, '0')}.${d2}`);
console.log('=== 简单测试完成 ===');
