
// 测试验证脚本
const RecognitionService = require('./services/recognitionService');

console.log('========================================');
console.log('测试最新修复内容');
console.log('========================================\n');

console.log('\n=== 测试 1: [有效期]至 格式识别 ===');
const testValidity = {
  words_result: [
    { words: '[生产日期]' }, { words: '2024年12月19日' }, 
    { words: '[产品批号]' }, { words: '24121917' },
    { words: '[有效期]至' }, { words: '2026年11月' }, { words: '080' }
  ]
};
const result1 = RecognitionService.parseOCRResult(testValidity);
console.log('expiryDate:', result1.expiryDate);

console.log('\n=== 测试 2: 制造商标签去除 ===');
const testManufacturer = {
  words_result: [
    { words: '[上市许可持有人]信合援生制药股份有限公司' },
    { words: '[注册地址]固始县蓼城东路185号' }
  ]
};
const result2 = RecognitionService.parseOCRResult(testManufacturer);
console.log('manufacturer:', result2.manufacturer);

console.log('\n=== 测试 3: 药品名识别 ===');
const testName = {
  words_result: [
    { words: '援生力维' }, { words: '®' }, { words: '马来酸曲美布汀片' }
  ]
};
const result3 = RecognitionService.parseOCRResult(testName);
console.log('name:', result3.name);

console.log('\n========================================');
console.log('验证完成');
console.log('========================================');
