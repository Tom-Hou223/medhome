
const RecognitionService = require('./services/recognitionService');

console.log('========================================');
console.log('测试英文药品识别功能');
console.log('========================================\n');

const testData = {
  words_result: [
    { words: "Nature's Key" },
    { words: "SLEEP" },
    { words: "Chewable Tablets" },
    { words: "Dietary Supplements" },
    { words: "Melatonin" },
    { words: "6mg" },
    { words: "Fall Asleep Faster" },
    { words: "Stay Asleep Longer" },
    { words: "Suggested Use: Adults take 2 tablets 20-30" },
    { words: "mins before bedtime. Chew thoroughly before" },
    { words: "swallowing." },
    { words: "Supplement Facts" },
    { words: "30 servings per container" },
    { words: "Serving Size 2 Tablets" },
    { words: "Amount Per Serving %DV" },
    { words: "Vitamin B6 6mg 353%" },
    { words: "Melatonin 6mg +" },
    { words: '"Percent Daily Values (DV) are based on a 2,000 calorie diet"' },
    { words: "Daily Value (DV) not established" },
    { words: "Other Ingredients: Sorbitol, D-Mannitol, Citric Acid" },
    { words: "Warning: If you are pregnant, nursing, taking any medications or having any medical conditions" },
    { words: "consult your doctor before use" },
    { words: "STORE IN A COOL, DRY PLACE" },
    { words: "KEEP OUT OF REACH OF CHILDREN" },
    { words: "LOT: N259M1214" },
    { words: "EXP: 12/2026" }
  ]
};

const result = RecognitionService.parseOCRResult(testData);
console.log('\n解析结果:');
console.log('name:', result.name);
console.log('specification:', result.specification);
console.log('dosage:', result.dosage);
console.log('expiryDate:', result.expiryDate);
console.log('manufacturer:', result.manufacturer);
console.log('========================================');
