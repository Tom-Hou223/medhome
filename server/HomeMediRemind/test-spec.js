
// 测试多标签规格识别
const fullTextTest = 
"=\nG\nH\nJ\nK\nL\n;\n>\n?\n<\nSHIFT\nB\nN\nM\n/\n,\n.\nFN\nCTRL\n、\nK\n>1\n抗病毒颗粒\n【成\n份】板蓝根、连翘、石膏、知母、芦根、地黄、广藿香、石菖蒲、\n郁金。辅料为蔗糖、糊精、广藿香油、薄荷油、白芷酊。\n【性\n状】本品为黄色至棕黄色的颗粒；气香、味甜。\n【规\n格】每袋装9克\n6\n【用法用量】开水冲服，一次1袋，一日3次。";

const specPatterns = [
  /【产品规格】\s*([^【\[]+)/,
  /【产[\s\S]*?品[\s\S]*?规[\s\S]*?格】\s*([^【\[]+)/,
  /【规格】\s*([^【\[]+)/,
  /【规[\s\S]*?格】\s*([^【\[]+)/,
  /【规格类型】\s*([^【\[]+)/,
  /\[规格\]\s*([^【\[]+)/,
  /规格[：:]\s*([^【\[]+)/,
  /净含量[：:]\s*([^【\[\n]+)/
];

console.log('=== 测试规格识别 ===');
console.log('测试文本:');
console.log(fullTextTest);

for (let i = 0; i < specPatterns.length; i++) {
  const pattern = specPatterns[i];
  const match = fullTextTest.match(pattern);
  if (match && match[1]) {
    let specText = match[1].trim();
    specText = specText.split(/\n/)[0].trim();
    console.log(`✅ 第${i+1}个模式匹配:`, specText);
    break;
  }
}
console.log('\n=== 测试结束 ===');
