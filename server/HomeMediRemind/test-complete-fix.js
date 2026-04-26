
const RecognitionService = require('./services/recognitionService');

console.log('=== 测试日期在有效期标签前面的情况 ===');

const testData = {
  words_result: [
    { words: '【产品批号】' },
    { words: '231010' },
    { words: '【生产日期】' },
    { words: '2023.10.27' },
    { words: '2025.09' },
    { words: '【有效期】至' }
  ]
};

console.log('输入的words:', testData.words_result.map(w => w.words));
console.log('开始解析...');

const result = RecognitionService.parseOCRResult(testData);
console.log('\n=== 解析结果 ===');
console.log(JSON.stringify(result, null, 2));
console.log('=== 测试结束 ===');
