
const RecognitionService = require('./services/recognitionService');

// 测试云南白药气雾剂的识别
const testWords = [
  '云南白药',
  '®',
  'OTC',
  '国解753021107',
  'Yunnan Baiyao Qiwuji',
  '云南白药气雾剂',
  '云南白药气雾剂50克',
  '云南白药气雾剂保险液60克',
  '方南白药',
  '集团股份有限公司',
  'YUNNAN BAIYAO GROUP CO.,LTD.'
];

const testData = {
  words_result: testWords.map(word => ({ words: word }))
};

console.log('🔍 测试云南白药气雾剂识别');
const result1 = RecognitionService.parseOCRResult(testData);
console.log('\n📋 结果1:', JSON.stringify(result1, null, 2));

console.log('\n\n🔍 测试说明文字识别');
const testWords2 = [
  '云南白药气雾剂',
  '【成份】国家保密方，本品含草乌（制）、雪上一枝蒿（制）其余成份略。',
  '【性状】云南白药气雾剂为非定量阀门气雾剂，在耐压容器中的药液为淡黄色至黄棕色的液体；喷射时，有特异香气。',
  '【规格】云南白药气雾剂每瓶装50克，含药液38克；云南白药气雾剂保险液每瓶装60克，含药液28克。',
  '【用法用量】外用，喷于伤患处。使用云南白药气雾剂，一日3~5次。凡遇较重闭合性跌打损伤者，先喷云南白药气雾剂保险液，若剧烈疼痛仍不缓解，可间隔1~2分钟重复给药，一天使用不得超过3次。喷云南白药气雾剂保险液间隔3分钟后，再喷云南白药气雾剂。',
  '【贮藏】密封，置阴凉处。',
  '【包装】铝罐包装，云南白药气雾剂1瓶；云南白药气雾剂保险液1瓶。'
];

const testData2 = {
  words_result: testWords2.map(word => ({ words: word }))
};
const result2 = RecognitionService.parseOCRResult(testData2);
console.log('\n📋 结果2:', JSON.stringify(result2, null, 2));

console.log('\n\n🔍 测试有效期识别');
const testWords3 = [
  'C', 'V', 'B', 'N', 'M', 'SHIFT', 'CTRL',
  '产品批号：', 'ZGA2422',
  '生产日期：', '2024.07.05',
  '有效期：至', '2027.06'
];
const testData3 = {
  words_result: testWords3.map(word => ({ words: word }))
};
const result3 = RecognitionService.parseOCRResult(testData3);
console.log('\n📋 结果3:', JSON.stringify(result3, null, 2));
