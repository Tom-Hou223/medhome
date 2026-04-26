
const RecognitionService = require('./services/recognitionService');

console.log('========================================');
console.log('测试最新修复内容');
console.log('========================================\n');

const testData14 = {
  words_result: [
    { words: 'R' }, { words: '9' }, { words: 'T' }, { words: '0' }, { words: '+' }, { words: 'Y' }, { words: '=' }, { words: '1' },
    { words: 'BACKSPACE' }, { words: 'F' }, { words: '0' }, { words: 'G' }, { words: 'P' }, { words: 'H' }, { words: 'C' }, { words: ')' },
    { words: 'K' }, { words: '1' }, { words: 'V' }, { words: 'L' }, { words: 'B' }, { words: 'N' }, { words: 'M' }, { words: '<' },
    { words: 'ENTER' }, { words: '?' }, { words: '000000' }, { words: 'SHIFT' }, { words: 'FN' }, { words: 'CTRL' }, { words: '4' },
    { words: '[生产日期]' }, { words: '2024年12月19日' }, { words: '[产品批号]' }, { words: '24121917' },
    { words: '[有效期]至' }, { words: '2026年11月' }, { words: '080' }
  ]
};

console.log('测试案例 14: 方括号格式保质期识别');
console.log('----------------------------------------');
const result14 = RecognitionService.parseOCRResult(testData14);
console.log('解析结果:', JSON.stringify(result14, null, 2));
console.log('\n');

const testData15 = {
  words_result: [
    { words: '[用法用量]成人口服，每次1~2片，一日3次，根据年龄、症状适当增减剂量，或遵医嘱。' },
    { words: '[不良反应]偶有口渴、口内麻木、腹鸣、腹泻、便秘和心动过速、困倦、眩晕、头痛、皮疹、GOT、GPT升高等，' },
    { words: '发生率约为0.4%。' },
    { words: '[禁忌]对本品过敏者禁用。' },
    { words: '[注意事项]出现皮疹患者应停药观察。' },
    { words: '[上市许可持有人]信合援生制药股份有限公司' },
    { words: '[注册地址]固始县蓼城东路185号' }
  ]
};

console.log('测试案例 15: 生产厂家标签去除');
console.log('----------------------------------------');
const result15 = RecognitionService.parseOCRResult(testData15);
console.log('解析结果:', JSON.stringify(result15, null, 2));
console.log('\n');

console.log('========================================');
console.log('修复验证完成');
console.log('========================================');

