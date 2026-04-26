const RecognitionService = require('./services/recognitionService');

// 模拟用户提供的识别结果数据
const testData1 = {
  words_result: [
    { words: '[用法用量]成人口服，每次1~2片，一日3次，根据年龄、症状适当增减剂量，或遵医嘱。' },
    { words: '[不良反应]偶有口渴、口内麻木、腹鸣、腹泻、便秘和心动过速、困倦、眩晕、头痛、皮疹、GOT、GPT升高等，' },
    { words: '发生率约为0.4%。' },
    { words: '[禁忌]对本品过敏者禁用。' },
    { words: '[注意事项]出现皮疹患者应停药观察。' },
    { words: '[上市许可持有人]信合援生制药股份有限公司' },
    { words: '[注册地址]固始县蓼城东路185号' },
    { words: '[有效期]至2026年11月' }
  ]
};

const testData2 = {
  words_result: [
    { words: '<' },
    { words: '3' },
    { words: 'N' },
    { words: 'M' },
    { words: ',' },
    { words: 'ED SONG' },
    { words: 'FN' },
    { words: 'CTRL' },
    { words: '3.05' },
    { words: '>1' },
    { words: '援生力维' },
    { words: '®' },
    { words: '马来酸曲美布汀片' },
    { words: 'Trimebutine Maleate Tablets' },
    { words: '30片' },
    { words: '批准文号国药准字H20000388' },
    { words: '信合援生制药股份有限公司' },
    { words: 'XINHE YUANSHENG MEDICINE CO.,LTD' }
  ]
};

const testData3 = {
  words_result: [
    { words: '®' },
    { words: '药圣堂' },
    { words: '复方板蓝根颗粒说明书' },
    { words: '请仔细阅读说明书并按说明使用或在药师指导下购买和使用' },
    { words: '【药品名称】' },
    { words: '【说明书修订日期】' },
    { words: '2025年07月29日' },
    { words: '通用名称：复方板蓝根颗粒' },
    { words: '【上市许可持有人】' },
    { words: '汉语拼音：Fufang Banlangen Keli' },
    { words: '称：广西日田药业集团有限责任公司' },
    { words: '【成份】板蓝根、大青叶。辅料为蔗糖、淀粉。' },
    { words: '地址：广西柳州市柳城县大埔镇河西工业区' },
    { words: '【性状】本品为棕色的颗粒；味甜、微苦。' },
    { words: '民路一巷6号' },
    { words: '【功能主治】清热解毒，凉血。用于风热感冒，咽喉肿痛。' },
    { words: '【生产企业】' },
    { words: '【规格】每袋装15克（相当原生药15克）' },
    { words: '【用法用量】口服。一次15克，一日3次。' },
    { words: '企业名称：广西日田药业集团有限责任公司' },
    { words: '生产地址：广西柳州市柳城县大埔镇河西工业园区' },
    { words: '【不良反应】尚不明确。' },
    { words: '【禁忌】尚不明确。' },
    { words: '民路一巷6号' },
    { words: '【注意事项】' },
    { words: '邮政编码：545299' },
    { words: '1.忌烟、酒及辛辣、生冷、油腻食物。' },
    { words: '电话号码：0772-7619961' },
    { words: '2.不宜在服药期间同时服用滋补性中药。' },
    { words: '传真号码：0772-7614366' },
    { words: '3.风寒感冒者不适用，其表现为恶寒重，发热轻，无' },
    { words: '网址：http:/www.rtyy.com' },
    { words: '汗，头痛，鼻塞，流清涕，喉痒咳嗽。' },
    { words: '4.高血压、心脏病、肝病、糖尿病、肾病等慢性病严重' },
    { words: '如有问题可与生产企业联系' },
    { words: '者应在医师指导下服用。' },
    { words: '药品追溯码' },
    { words: '5.儿童、年老体弱者、孕妇应在医师指导下服用。' },
    { words: '6.服药3天症状无缓解，应去医院就诊。' },
    { words: '7.对本品过敏者禁用，过敏体质者慎用。' },
    { words: '8.本品性状发生改变时禁止使用。' },
    { words: '9.儿童必须在成人监护下使用。' },
    { words: '10.请将本品放在儿童不能接触的地方。' },
    { words: '药品标识码：8385793序列号：0000879766660' },
    { words: '11.如正在使用其他药品，使用本品前请咨询医师或药师。' },
    { words: '请用支付宝扫码或码上放心网站查询' },
    { words: '【药物相互作用】如与其他药物同时使用可能会发生药物相互作用，详情请咨询医师或药师。' },
    { words: '【贮藏】密封，防潮。' },
    { words: '【包装】双向拉伸聚丙烯/低密度聚乙烯药品包装用复合膜；15克X19袋。' },
    { words: '【有效期】24个月。' },
    { words: '【执行标准】《中华人民共和国卫生部药品标准》中药成方制剂第十二册WS-B-2377-97' },
    { words: '6924561884074' },
    { words: '【批准文号】国药准字Z45021428' },
    { words: '【生产日期】' },
    { words: '2025.10.24' },
    { words: '【产品批号】' },
    { words: '251021' },
    { words: '【有效期】至' },
    { words: '2027.09' },
    { words: '广西日田药业集团有限责任公司' },
    { words: 'GUANGXI RITIAN PHARMACEUTICAL INDUSTRYCO.,LTD' }
  ]
};

const testData4 = {
  words_result: [
    { words: '防水透气型' },
    { words: '20片装创口贴' },
    { words: '水' },
    { words: '使用说明' },
    { words: '细菌' },
    { words: '【产品描述】由涂胶基材(PE或弹' },
    { words: '性布及无纺布)、吸收性敷垫（无' },
    { words: '纺吸水棉)、格拉辛离型纸防粘连' },
    { words: '空气' },
    { words: '层、可剥离的淋膜纸保护层组成的' },
    { words: '片状创口贴。其中吸收性敷垫采用' },
    { words: '可吸收渗出液的无纺吸水棉敷垫材' },
    { words: '料制成。不含有发挥药理学、免疫学' },
    { words: '或者代谢作用的成分。所含成分不被人' },
    { words: '体吸收。非无菌提供，一次性使用。' },
    { words: '【预期用途】用于小创口、擦伤、切' },
    { words: '割伤的浅表性创面的急救及临时性包扎。' },
    { words: '【注意事项】1.为了保持伤口卫生，请每天更换使用。' },
    { words: '2.本产品为一次性使用产品,拆封后忌用手接触中间复合垫。' },
    { words: '3.使用中若发现过敏现象，请立即停止使用，并请教医生。' },
    { words: '【使用说明】1.使用本产品前，应先清洁和消毒伤口。' },
    { words: '2.沿箭头方向，剥开包装纸，将吸水垫对准伤口部位，分先后把左右' },
    { words: '两面覆盖膜除去，并固定位置，再轻按周边部位，以达到最佳效果。' },
    { words: '【储存】经包装后的创口贴应储存在相对湿度不超过80%，无腐蚀性' },
    { words: '气体和通风良好的清洁室内。【说明书编制日期】:2023年6月2日' },
    { words: '【有效期】在遵守储运、储存和使用规则条件下，有效期三年。' },
    { words: '【规格类型】防水透气型70mmX18mm【包装】20片/盒' },
    { words: '【医疗器械产品备案号】：粤惠械备20230048' },
    { words: '【技术要求备案号】：粤惠械备20230048' },
    { words: '【医疗器械生产备案号】：粤惠食药监械生产备20230010号' },
    { words: '【备案人/生产单位/售后服务单位】：九邦医疗（广东）有限公司' },
    { words: '【生产地址】：惠州市惠阳区新圩镇东风村碧桂园梅龙湖智能制造产业' },
    { words: '新城A8-1201厂房【电话】：0752-3331218【邮编】：516223' },
    { words: '深圳九邦医疗控股有限公司' },
    { words: '地址：深圳市龙岗区龙城街道爱联社区中粮祥云2栋B座1213' },
    { words: '总经销' },
    { words: '电话：0755-23328282邮编：518048网址：www.jiu-bang.com' },
    { words: '生产日期：' },
    { words: '生产批号：' },
    { words: '20250303' },
    { words: '失效日期：' },
    { words: '25030318' },
    { words: '20280302' },
  ]
};

console.log('========================================');
console.log('开始测试药品识别功能');
console.log('========================================\n');

console.log('测试案例 1: 包含有效期的药品');
console.log('----------------------------------------');
const result1 = RecognitionService.parseOCRResult(testData1);
console.log('解析结果:', JSON.stringify(result1, null, 2));
console.log('\n');

console.log('测试案例 2: 药品包装盒信息');
console.log('----------------------------------------');
const result2 = RecognitionService.parseOCRResult(testData2);
console.log('解析结果:', JSON.stringify(result2, null, 2));
console.log('\n');

console.log('测试案例 3: 复方板蓝根颗粒');
console.log('----------------------------------------');
const result3 = RecognitionService.parseOCRResult(testData3);
console.log('解析结果:', JSON.stringify(result3, null, 2));
console.log('\n');

console.log('测试案例 4: 创口贴');
console.log('----------------------------------------');
const result4 = RecognitionService.parseOCRResult(testData4);
console.log('解析结果:', JSON.stringify(result4, null, 2));
console.log('\n');

const testData5 = {
  words_result: [
    { words: '创口贴说明书' },
    { words: '◎修订日期：2021年01月31日' },
    { words: '【产品名称】创口贴' },
    { words: '产品结构】创口贴由胶带、吸水层、隔离层构成。' },
    { words: '【品型号】防水透明型' },
    { words: '【产品规格】7.2cm×2.2cm' },
    { words: '【适用范围】用于真皮浅层及其以上的浅表性小创伤、擦伤等，为浅表' },
    { words: '创面、及肤损伤提供愈合环境。' },
    { words: '【产品性能】1、规格尺寸、外观。1.1、创口贴的规格尺寸应符合表1的' },
    { words: '要求。1.2、创口贴的隔离层应交叉完全覆盖创口贴的粘贴面，无胶带、' },
    { words: '吸水层外露现象。1.3、创口贴的吸水层应无明显的歪斜、错位，不应存' },
    { words: '在无吸水层现象。1.4、创口贴的胶带应涂胶均匀，无脱胶、漏胶、背面' },
    { words: '渗胶现象。1.5、创口贴应切边整齐，表面清洁，无污渍、破损。2、创' },
    { words: '口贴胶带剥离强度：胶带每1cm宽度所需的平均力应不小于1.0N。3、创' },
    { words: '口贴胶带持粘性：在烘箱内试验期间，贴于不锈钢板上黏贴胶带的顶端' },
    { words: '下滑应不超过2.5mm。' },
    { words: '【使用方法】1、使用本品前，应先清洁和消毒伤口。2、撕开小包装袋，' },
    { words: '将吸水层上的隔离层揭开，敷在创伤处，然后撕去隔离层，并将粘面与皮肤' },
    { words: '粘住固定。3、水胶型可参照箭头方向揭开隔离层，主要用于脚后跟、脚趾' },
    { words: '等部位防止鞋子摩擦。' },
    { words: '【注意事项】1、包装破损或超过有效期时应禁止使用。2、有过敏现象请' },
    { words: '停止使用。3、本产品拆封后忌用手接触吸水层。4、本产品一次性使用，' },
    { words: '禁止重复使用。5、水胶型吸收饱和时，创口贴外观会变成乳白色，此时' },
    { words: '提示更换，若提前更换可能会引起皮肤损伤。' },
    { words: '【禁忌症】无。' },
    { words: '【贮' },
    { words: '存】贮存在防潮、防尘，空气流通、无腐蚀性气体，相对湿度' },
    { words: '不超过80%的库房中。' },
    { words: '【生产日期】见包装。' },
    { words: '【使用期限】三年' },
    { words: '请仔细阅读产品说明书或者在' },
    { words: '医务人员的指导下购买和使用' },
    { words: '备案人/生产企业：振德医疗用品股份有限公司' },
    { words: '住所：浙江省绍兴市越城区皋埠镇皋北工业区' },
    { words: '生产备案凭证号：浙绍食药监械生产备20150001号（更）' },
    { words: '产品备案（技术要求）号：浙绍械备20150001号（更）' },
    { words: '生产地址：浙江省绍兴市皋埠镇皋马线皋北大桥以北' },
    { words: '售后服务单位：振德医疗用品股份有限公司' },
    { words: '生产批号：20220605' },
    { words: '电话：0575-88086666电子邮箱：zhende@zhonde.com' },
    { words: '生产日期：20220605' },
    { words: '质量热线：4008265166网址：http:/www.zhende.com' },
    { words: '失效日期：20250604' },
    { words: '传真：0575-88088878邮编：312035' },
    { words: '20' },
    { words: '合格' },
    { words: '6959385738265' }
  ]
};

console.log('测试案例 5: 振德医疗创口贴');
console.log('----------------------------------------');
const result5 = RecognitionService.parseOCRResult(testData5);
console.log('解析结果:', JSON.stringify(result5, null, 2));
console.log('\n');

const testData6 = {
  words_result: [
    { words: 'F' },
    { words: '<' },
    { words: '>' },
    { words: 'C' },
    { words: 'B' },
    { words: 'N' },
    { words: 'M' },
    { words: '?/' },
    { words: ',' },
    { words: 'UNTITLED SONG' },
    { words: 'FN' },
    { words: 'CTRL' },
    { words: '0.00' },
    { words: '305' },
    { words: 'K' },
    { words: '>1' },
    { words: '葫芦爸' },
    { words: '肠炎宁胶囊' },
    { words: '【功能主治】' },
    { words: '【成份】' },
    { words: '【用法用量】' },
    { words: '清热利湿、行气。用于急、慢性胃' },
    { words: '地锦草、金毛耳草、樟树根、香薷、' },
    { words: '口服，一次5粒，一日3~4次；小儿' },
    { words: '肠炎，腹泻，小儿消化不良。' },
    { words: '枫香树叶。辅料为糊精。' },
    { words: '酌减。' },
    { words: '【不良反应】、【禁忌】、【注意事项】详见说明书。' },
    { words: '【性状】本品为硬胶囊，内容物为棕黄色颗粒性粉末；味酸、微苦。' },
    { words: '【贮藏】密封，置阴凉（不超过20℃）干燥处。' },
    { words: '【规格】每粒装0.3克。' },
    { words: '【包装】铝塑包装，外套铝袋；每板12粒，每盒2板。' },
    { words: '【批准文号】国药准字Z20060105' },
    { words: '【上市许可持有人】' },
    { words: '企业名称：海南葫芦娃药业集团股份有限公司' },
    { words: '注册地址：海南省海口市海口国家高新区药谷工业园二期药谷四路8号' },
    { words: '【生产企业】' },
    { words: '6941914201302' },
    { words: '企业名称：海南葫芦娃药业集团股份有限公司' },
    { words: '生产地址：海南省海口市海口国家高新区药谷工业园二期药谷四路8号' },
    { words: '邮政编码：570100' },
    { words: '电话号码：0898-68689766传真号码：0898-66819512' }
  ]
};

console.log('测试案例 6: 葫芦爸肠炎宁胶囊');
console.log('----------------------------------------');
const result6 = RecognitionService.parseOCRResult(testData6);
console.log('解析结果:', JSON.stringify(result6, null, 2));
console.log('\n');

const testData7 = {
  words_result: [
    { words: '1' },
    { words: '2' },
    { words: 's' },
    { words: 'F7' },
    { words: 'TAB' },
    { words: '4' },
    { words: 'Q' },
    { words: '%' },
    { words: 'A' },
    { words: '6' },
    { words: 'CAPSLOCK' },
    { words: 'E' },
    { words: 'R' },
    { words: '8' },
    { words: 'A' },
    { words: 'T' },
    { words: '(9' },
    { words: 'Y' },
    { words: 'SHF1' },
    { words: 'D' },
    { words: 'U' },
    { words: 'F' },
    { words: 'G' },
    { words: '(' },
    { words: 'CTRL' },
    { words: '×' },
    { words: 'H' },
    { words: 'C' },
    { words: 'J' },
    { words: 'WIN' },
    { words: 'V' },
    { words: 'K' },
    { words: 'ALy' },
    { words: 'B' },
    { words: 'N' },
    { words: 'M' },
    { words: '<' },
    { words: '【产品批号】' },
    { words: '3' },
    { words: '【生产日期】' },
    { words: '2025.09' },
    { words: '【有效期】至' }
  ]
};

console.log('测试案例 7: 有效期至标签示例');
console.log('----------------------------------------');
const result7 = RecognitionService.parseOCRResult(testData7);
console.log('解析结果:', JSON.stringify(result7, null, 2));
console.log('\n');

const testData8 = {
  words_result: [
    { words: '2' },
    { words: '3' },
    { words: '0' },
    { words: '产品批号：' },
    { words: '25A047' },
    { words: '有效期至：' },
    { words: '2027/12' },
    { words: '生产日期：' },
    { words: '2025/01/23' }
  ]
};

console.log('测试案例 8: 用户提供的有效期至示例');
console.log('----------------------------------------');
const result8 = RecognitionService.parseOCRResult(testData8);
console.log('解析结果:', JSON.stringify(result8, null, 2));
console.log('\n');

const testData9 = {
  words_result: [
    { words: '外' },
    { words: '施图伦' },
    { words: '七叶洋地黄双苷滴眼液' },
    { words: '批准文号：国药准字HJ20130295' },
    { words: '主要成份：每支含洋地黄苷（按洋地黄毒苷计）0.006mg，七叶亭苷0.040mg' },
    { words: '规格：0.4ml:洋地黄苷（按洋地黄毒苷计）0.006mg，七叶亭苷0.040mg' },
    { words: '性状：本品为无色澄明液体。' },
    { words: '适应症：眼底黄斑变性。' },
    { words: '所有类型的眼疲劳，包括眼肌性、神经性和适应性的。' },
    { words: '用法用量：黄斑变性：每日3次，每次1滴，滴入眼结膜囊内（近耳侧外眼角）。' },
    { words: '眼疲劳：每日3次，每次1滴，滴入眼结膜囊内（近耳侧外眼角），延续1周或至病情好转，建议每日2次，每次1滴。' },
    { words: '不良反应、禁忌、注意事项：详见说明书' }
  ]
};

console.log('测试案例 9: 用户提供的七叶洋地黄双苷滴眼液');
console.log('----------------------------------------');
const result9 = RecognitionService.parseOCRResult(testData9);
console.log('解析结果:', JSON.stringify(result9, null, 2));
console.log('\n');

const testData10 = {
  words_result: [
    { words: 'BACKSPACE' },
    { words: '9' },
    { words: '8' },
    { words: '6' },
    { words: '5' },
    { words: '盒补补' },
    { words: '保健食品' },
    { words: '32025028' },
    { words: '管理总局批' },
    { words: 'TM' },
    { words: 'Acarer' },
    { words: '长兴牌叶黄素' },
    { words: '维生素A加锌软胶囊' },
    { words: 'CHANG XING BRAND LUTEIN VITAMIN' },
    { words: 'WITH ZINC SOFT CAPSULE' },
    { words: '缓解' },
    { words: '净含量' },
    { words: '疲劳' },
    { words: '(0.5g粒x6' },
    { words: '离仅作参考' },
    { words: '尿健食品不是药物，不能代替药物治疗疾病。' }
  ]
};

console.log('测试案例 10: 长兴牌叶黄素软胶囊');
console.log('----------------------------------------');
const result10 = RecognitionService.parseOCRResult(testData10);
console.log('解析结果:', JSON.stringify(result10, null, 2));
console.log('\n');

const testData11 = {
  words_result: [
    { words: '·注册号：国食健注G20250288·执行标准：Q/GDCX' },
    { words: '0270S·食品生产许可证编号：SC1274451020125·制造' },
    { words: '商：广东长兴生物科技股份有限公司·生产地址：广东省潮州' },
    { words: '市桥东东山路神农工业区联系方式：0768-2503333经' },
    { words: '销商：上海盒马物联网有限公司·地址：上海市浦东新区航头' },
    { words: '镇航都路33号5幢3层304室·邮政编码：200120○产地：广' },
    { words: '东省潮州市·投诉服务电话：400-676-3929·服务时段法' },
    { words: '定工作日：900-12：0014：00-17：30' },
    { words: '生产批号：' },
    { words: 'RAX75120204' },
    { words: '生产日期：' },
    { words: '2025年12月10日' },
    { words: '保质期至：' },
    { words: '2027年12月09日' },
    { words: '6909782936306' }
  ]
};

console.log('测试案例 11: 保质期至标签示例');
console.log('----------------------------------------');
const result11 = RecognitionService.parseOCRResult(testData11);
console.log('解析结果:', JSON.stringify(result11, null, 2));
console.log('\n');

const testData12 = {
  words_result: [
    { words: '·注册号：国食健注G20250288·执行标准：Q/GDCX' },
    { words: '0270S·食品生产许可证编号：SC1274451020125·制造' },
    { words: '商：广东长兴生物科技股份有限公司·生产地址：广东省潮州' },
    { words: '市桥东东山路神农工业区联系方式：0768-2503333经' },
    { words: '销商：上海盒马物联网有限公司·地址：上海市浦东新区航头' },
    { words: '镇航都路33号5幢3层304室·邮政编码：200120○产地：广' },
    { words: '东省潮州市·投诉服务电话：400-676-3929·服务时段法' },
    { words: '定工作日：900-12：0014：00-17：30' },
    { words: '生产批号：' },
    { words: 'RAX75120204' },
    { words: '生产日期：' },
    { words: '2025年12月10日' },
    { words: '保质期至：' },
    { words: '2027年12月09日' },
    { words: '6909782936306' }
  ]
};

console.log('测试案例 12: 用户提供的保质期和制造商识别');
console.log('----------------------------------------');
const result12 = RecognitionService.parseOCRResult(testData12);
console.log('解析结果:', JSON.stringify(result12, null, 2));
console.log('\n');

const testData13 = {
  words_result: [
    { words: 'Pgon' },
    { words: 'Alt' },
    { words: 'Ctrl' },
    { words: '↑' },
    { words: '0' },
    { words: 'Enter' },
    { words: ',' },
    { words: 'Ins' },
    { words: 'Del' },
    { words: '+' },
    { words: '↓' },
    { words: ',' },
    { words: '11' },
    { words: '份】金' },
    { words: 'oit' },
    { words: 'timeslats' },
    { words: ':' },
    { words: ':1' },
    { words: 'onoua' },
    { words: '药股份有' },
    { words: '王力维' },
    { words: '马' },
    { words: '·原料：葡萄糖酸锌、维生素C(L-抗坏血酸)、叶黄素、维' },
    { words: '生素E(dl-a-醋酸生育酚)、维生素A(维生素A醋酸酯)' },
    { words: '·辅料亚麻籽油、明胶、纯化水、甘油、蜂蜡、红氧化铁' },
    { words: '【标志性成分及含量】每100g含：' },
    { words: '叶黄素' },
    { words: '维生素A' },
    { words: '1.0g' },
    { words: 'F12' },
    { words: 'DEL' },
    { words: '锌' },
    { words: '30mg' },
    { words: 'INS' },
    { words: '400mg' },
    { words: 'PGUP' },
    { words: 'PGDN' },
    { words: '8' },
    { words: 's' },
    { words: '·保健功能缓解视觉疲劳' },
    { words: '·适宜人群：视力易疲劳者' },
    { words: '1' },
    { words: '·不适宜人群：婴幼儿、孕妇、乳母' },
    { words: 'KSPACE' },
    { words: 'NUM' },
    { words: '·贮藏方法：密封，置阴凉干燥处' },
    { words: '1' },
    { words: '1' },
    { words: '*' },
    { words: '注意事项：本品不能代替药物：适言人外的人群不准活合' },
    { words: 'A' },
    { words: '本产品：本品添加了营养素，与同类营养间时食用不宜' },
    { words: '推荐量' },
    { words: '|\\' },
    { words: '+' },
    { words: '√' },
    { words: 'K' },
    { words: '·食用及食用方法：每日1次，每次2位，口服一格0.5g粒' },
    { words: '7' },
    { words: '8' },
    { words: '·保质期：24个月' },
    { words: '9' },
    { words: 'ER' },
    { words: 'M' },
    { words: '<' },
    { words: '25A' },
    { words: '4' },
    { words: '5' },
    { words: '6' },
    { words: ',' },
    { words: '1' },
    { words: '2' },
    { words: '3' },
    { words: 'RL' }
  ]
};

console.log('测试案例 13: 保健品食用方法识别');
console.log('----------------------------------------');
const result13 = RecognitionService.parseOCRResult(testData13);
console.log('解析结果:', JSON.stringify(result13, null, 2));
console.log('\n');

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
console.log('测试日期格式化功能');
console.log('========================================\n');

const testDates = [
  '2026年11月',
  '2026年11月15日',
  '2026.11',
  '2026.11.15',
  '2026-11',
  '2026-11-15',
  '2026/11',
  '2026/11/15'
];

testDates.forEach(dateStr => {
  const formatted = RecognitionService.formatDate(dateStr);
  console.log(`原始: "${dateStr}" -> 格式化: "${formatted}"`);
});

console.log('\n========================================');
console.log('测试完成');
console.log('========================================');