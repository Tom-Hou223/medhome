
// 测试布洛芬缓释胶囊的识别
const RecognitionService = require('./services/recognitionService');

const testWords = [
  '®',
  '感康',
  'OTC',
  '布洛芬缓释胶囊',
  '请仔细阅读说明书并按说明使用或在药师指导下购买和使用。',
  '【适应症】用于缓解轻至中度疼痛如头痛、关节痛、偏头痛、牙痛、肌肉痛、神经痛、痛经。也用于普通感冒或流行性感冒引起的发热。',
  '药品追溯码',
  '药品标识码：8436282 序列号：0442053402132',
  '请用支付宝扫码或码上放心网站查询',
  '【生产日期】',
  '20241227',
  '【产品批号】',
  '241230',
  '【有效期】至',
  '2026年11月',
  '仿制药一致性评',
  '【成份】本品每粒含主要成份布洛芬0.3克。辅料为：蔗糖丸芯、硬脂酸、聚维酮K30。',
  '【性状】本品内容物为白色球形小丸。',
  '【规格】0.3克',
  '【用法用量】口服。成人一次1粒，一日2次（早晚各一次）。',
  '【不良反应】【禁忌】【注意事项】详见说明书。',
  '【贮藏】密封保存。',
  '【包装】药用铝箔/聚氯乙烯/聚偏二氯乙烯固体药用复合硬片泡罩，6粒×2板/盒。',
  '【批准文号】国药准字H20003774',
  '【药品上市许可持有人/生产企业】',
  '吉林吴太感康药业有限公司',
  '注册地址：长春经济技术开发区辽港街991号',
  '生产地址：长春经济技术开发区辽港街991号',
  '邮政编码：130102',
  '电话号码：400-159-0431、0431-80786083',
  '网址：www.wutaigroup.com',
  '6934418417034'
];

const testData = {
  words_result: testWords.map(word => ({ words: word }))
};

console.log('🔍 开始测试布洛芬缓释胶囊识别...');
const result = RecognitionService.parseOCRResult(testData);
console.log('\n📋 最终识别结果:');
console.log('药品名:', result.name);
console.log('厂商:', result.manufacturer);
console.log('规格:', result.specification);
console.log('用法用量:', result.dosage);
console.log('有效期:', result.expiryDate);
console.log('分类:', result.category);

console.log('\n✅ 测试完成！');
