const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 调试输出，看看是否读取到了环境变量
console.log('调试 - 读取到的环境变量:');
console.log('  BAIDU_API_KEY:', process.env.BAIDU_API_KEY ? '已设置' : '未设置');
console.log('  BAIDU_SECRET_KEY:', process.env.BAIDU_SECRET_KEY ? '已设置' : '未设置');
console.log('  ALIYUN_APP_CODE:', process.env.ALIYUN_APP_CODE ? '已设置' : '未设置');
if (process.env.ALIYUN_APP_CODE) {
  console.log('  ALIYUN_APP_CODE 值:', process.env.ALIYUN_APP_CODE);
}

module.exports = {
  baidu: {
    apiKey: process.env.BAIDU_API_KEY || '',
    secretKey: process.env.BAIDU_SECRET_KEY || '',
    tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
    ocrUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic'
  },
  aliyun: {
    appCode: process.env.ALIYUN_APP_CODE || '',
    barcodeApiUrl: 'https://jumbarcode.market.alicloudapi.com/bar-code/query'
  }
};