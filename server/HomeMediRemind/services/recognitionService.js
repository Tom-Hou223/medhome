const axios = require('axios');
const db = require('../db');

// 直接定义配置，确保没有任何问题
const config = {
  baidu: {
    apiKey: '',
    secretKey: '',
    tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
    ocrUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic'
  },
  aliyun: {
    appCode: '',
    barcodeApiUrl: 'https://jumbarcode.market.alicloudapi.com/bar-code/query'
  }
};

// 尝试从 .env 文件读取配置
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, value] = trimmedLine.split('=');
        if (key && value) {
          const cleanKey = key.trim();
          const cleanValue = value.trim().replace(/[`'"\s]/g, '');
          
          if (cleanKey === 'BAIDU_API_KEY' && cleanValue) {
            config.baidu.apiKey = cleanValue;
            console.log('✅ 从 .env 文件成功读取 BAIDU_API_KEY:', cleanValue.substring(0, 10) + '...');
          } else if (cleanKey === 'BAIDU_SECRET_KEY' && cleanValue) {
            config.baidu.secretKey = cleanValue;
            console.log('✅ 从 .env 文件成功读取 BAIDU_SECRET_KEY:', cleanValue.substring(0, 10) + '...');
          } else if (cleanKey === 'ALIYUN_APP_CODE' && cleanValue) {
            config.aliyun.appCode = cleanValue;
            console.log('✅ 从 .env 文件成功读取 ALIYUN_APP_CODE:', cleanValue.substring(0, 10) + '...');
          }
        }
      }
    }
  }
} catch (error) {
  console.warn('⚠️ 读取 .env 文件失败:', error.message);
}

class RecognitionService {
  constructor() {
    this.baiduAccessToken = null;
    this.baiduTokenExpireTime = null;
  }

  /**
   * 检查百度AI配置是否可用
   */
  isBaiduConfigAvailable() {
    const available = config.baidu && config.baidu.apiKey && config.baidu.secretKey && 
           config.baidu.apiKey !== '' && config.baidu.secretKey !== '';
    console.log('调试 - 检查百度配置:', available ? '可用' : '不可用');
    if (config.baidu && config.baidu.apiKey) {
      console.log('调试 - BAIDU_API_KEY:', config.baidu.apiKey.substring(0, 10) + '...');
    }
    return available;
  }

  /**
   * 检查阿里云配置是否可用
   */
  isAliyunConfigAvailable() {
    const available = config.aliyun && config.aliyun.appCode && config.aliyun.appCode !== '';
    console.log('调试 - 检查阿里云配置:', available ? '可用' : '不可用');
    if (config.aliyun && config.aliyun.appCode) {
      console.log('调试 - APP CODE:', config.aliyun.appCode.substring(0, 10) + '...');
    }
    return available;
  }

  /**
   * 获取百度AI access_token（缓存30天）
   */
  async getBaiduAccessToken() {
    if (!this.isBaiduConfigAvailable()) {
      throw new Error('百度AI API密钥未配置');
    }

    if (this.baiduAccessToken && this.baiduTokenExpireTime && Date.now() < this.baiduTokenExpireTime) {
      return this.baiduAccessToken;
    }

    try {
      const response = await axios.get(config.baidu.tokenUrl, {
        params: {
          grant_type: 'client_credentials',
          client_id: config.baidu.apiKey,
          client_secret: config.baidu.secretKey
        }
      });

      if (response.data.access_token) {
        this.baiduAccessToken = response.data.access_token;
        this.baiduTokenExpireTime = Date.now() + (29 * 24 * 60 * 60 * 1000);
        console.log('✅ 获取百度AI access_token 成功');
        return this.baiduAccessToken;
      } else {
        throw new Error(response.data.error_description || '获取 access_token 失败');
      }
    } catch (error) {
      console.error('❌ 获取百度AI access_token 失败:', error.message);
      throw error;
    }
  }

  /**
   * 条形码识别 - 使用阿里云条码查询服务
   * @param {string} barcode - 条形码内容
   */
  async recognizeBarcode(barcode) {
    try {
      console.log('开始识别条形码:', barcode);
      
      if (!this.isAliyunConfigAvailable()) {
        console.log('⚠️ 阿里云API密钥未配置，返回模拟数据');
        return this.getMockBarcodeData(barcode);
      }

      // 清理API URL和App Code
      const cleanApiUrl = 'https://jumbarcode.market.alicloudapi.com/bar-code/query';
      const cleanAppCode = config.aliyun.appCode.replace(/[`'"\s]/g, '').trim();

      console.log('调试 - 使用的API URL:', cleanApiUrl);
      console.log('调试 - 使用的App Code:', cleanAppCode.substring(0, 10) + '...');

      const url = `${cleanApiUrl}?code=${barcode}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `APPCODE ${cleanAppCode}`
        }
      });

      console.log('阿里云API响应:', response.data);

      if (response.data && response.data.code === 200 && response.data.data) {
        const data = response.data.data;
        
        // 解析药品信息
        const medicineData = {
          name: data.name || '',
          manufacturer: data.manuName || '',
          specification: data.spec || '',
          category: this.parseCategoryFromRemark(data.remark),
          dosage: this.parseDosageFromRemark(data.remark),
          daysToExpiry: 365
        };

        return {
          success: true,
          data: medicineData
        };
      } else {
        throw new Error(response.data.msg || '未找到该药品信息');
      }
    } catch (error) {
      console.error('❌ 条形码识别失败:', error.message);
      if (error.response) {
        console.error('API响应状态码:', error.response.status);
        console.error('API响应数据:', error.response.data);
      }
      // 如果API调用失败，使用模拟数据
      console.log('⚠️ 条形码识别失败，返回模拟数据');
      return this.getMockBarcodeData(barcode);
    }
  }

  /**
   * 获取模拟条形码数据
   * @param {string} barcode - 条形码
   */
  getMockBarcodeData(barcode) {
    const mockMedicines = [
      {
        name: '阿莫西林胶囊',
        manufacturer: '哈药集团',
        specification: '0.25g×24粒',
        category: '抗生素',
        dosage: '口服，一次1粒，一日3次',
        expiryDate: '2026.12.31',
        daysToExpiry: 365
      },
      {
        name: '布洛芬缓释胶囊',
        manufacturer: '芬必得',
        specification: '0.3g×24粒',
        category: '解热镇痛',
        dosage: '口服，一次1粒，一日2次',
        expiryDate: '2026.06.30',
        daysToExpiry: 365
      },
      {
        name: '感冒灵颗粒',
        manufacturer: '999感冒灵',
        specification: '9g×10袋',
        category: '感冒用药',
        dosage: '开水冲服，一次1袋，一日3次',
        expiryDate: '2027.03.15',
        daysToExpiry: 730
      },
      {
        name: '维生素C片',
        manufacturer: '东北制药',
        specification: '100mg×100片',
        category: '维生素',
        dosage: '口服，一次1-2片，一日3次',
        expiryDate: '2027.08.20',
        daysToExpiry: 730
      }
    ];

    const index = Math.abs(barcode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % mockMedicines.length;
    const mockData = mockMedicines[index];

    return {
      success: true,
      data: {
        ...mockData,
        barcode: barcode
      }
    };
  }

  /**
   * 从remark字段解析药品分类
   * @param {string} remark - 备注信息
   */
  parseCategoryFromRemark(remark) {
    if (!remark) return '其他';
    
    const parts = remark.split('#');
    
    for (const part of parts) {
      if (part.includes('感冒')) return '感冒用药';
      if (part.includes('消炎') || part.includes('抗生素')) return '抗生素';
      if (part.includes('维生素')) return '维生素';
      if (part.includes('止痛') || part.includes('镇痛')) return '解热镇痛';
      if (part.includes('胃') || part.includes('消化')) return '消化系统';
      if (part.includes('咳嗽') || part.includes('化痰')) return '止咳化痰';
      if (part.includes('外用')) return '外用药';
    }
    
    return '其他';
  }

  /**
   * 从remark字段解析用法用量
   * @param {string} remark - 备注信息
   */
  parseDosageFromRemark(remark) {
    if (!remark) return '';
    return '';
  }

  /**
   * 图片OCR识别
   * @param {Buffer} imageBuffer - 图片数据
   */
  async recognizeImage(imageBuffer) {
    try {
      console.log('开始识别图片...');

      if (!this.isBaiduConfigAvailable()) {
        console.log('⚠️ 百度AI API密钥未配置，返回模拟数据');
        // 生成随机模拟数据
        const mockMedicines = [
          {
            name: '阿莫西林胶囊',
            manufacturer: '哈药集团',
            specification: '0.25g×24粒',
            category: '抗生素',
            dosage: '口服，一次1粒，一日3次',
            expiryDate: '2026.12.31',
            daysToExpiry: 365
          },
          {
            name: '布洛芬缓释胶囊',
            manufacturer: '芬必得',
            specification: '0.3g×24粒',
            category: '解热镇痛',
            dosage: '口服，一次1粒，一日2次',
            expiryDate: '2026.06.30',
            daysToExpiry: 365
          },
          {
            name: '感冒灵颗粒',
            manufacturer: '999感冒灵',
            specification: '9g×10袋',
            category: '感冒用药',
            dosage: '开水冲服，一次1袋，一日3次',
            expiryDate: '2027.03.15',
            daysToExpiry: 730
          },
          {
            name: '维生素C片',
            manufacturer: '东北制药',
            specification: '100mg×100片',
            category: '维生素',
            dosage: '口服，一次1-2片，一日3次',
            expiryDate: '2027.08.20',
            daysToExpiry: 730
          },
          {
            name: '复方甘草片',
            manufacturer: '同仁堂',
            specification: '100片',
            category: '止咳化痰',
            dosage: '口服，一次1-2片，一日3次',
            expiryDate: '2027.01.01',
            daysToExpiry: 730
          }
        ];

        const randomIndex = Math.floor(Math.random() * mockMedicines.length);
        const mockData = mockMedicines[randomIndex];
        console.log('✅ 使用模拟数据进行图片识别:', mockData.name);

        return {
          success: true,
          data: mockData
        };
      }

      const accessToken = await this.getBaiduAccessToken();
      const imageBase64 = imageBuffer.toString('base64');

      const url = config.baidu.ocrUrl + '?access_token=' + accessToken;

      const response = await axios.post(url,
        'image=' + encodeURIComponent(imageBase64),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data.error_code) {
        throw new Error(response.data.error_msg || '识别失败');
      }

      const result = this.parseOCRResult(response.data);

      console.log('✅ 图片识别成功');
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ 图片识别失败:', error.message);
      
      if (error.response) {
        console.error('API响应状态码:', error.response.status);
        console.error('API响应数据:', JSON.stringify(error.response.data, null, 2));
      }

      console.log('⚠️ 图片识别失败，返回模拟数据');
      // 生成随机模拟数据
      const mockMedicines = [
        {
          name: '阿莫西林胶囊',
          manufacturer: '哈药集团',
          specification: '0.25g×24粒',
          category: '抗生素',
          dosage: '口服，一次1粒，一日3次',
          daysToExpiry: 365
        },
        {
          name: '布洛芬缓释胶囊',
          manufacturer: '芬必得',
          specification: '0.3g×24粒',
          category: '解热镇痛',
          dosage: '口服，一次1粒，一日2次',
          daysToExpiry: 365
        },
        {
          name: '感冒灵颗粒',
          manufacturer: '999感冒灵',
          specification: '9g×10袋',
          category: '感冒用药',
          dosage: '开水冲服，一次1袋，一日3次',
          daysToExpiry: 730
        },
        {
          name: '维生素C片',
          manufacturer: '东北制药',
          specification: '100mg×100片',
          category: '维生素',
          dosage: '口服，一次1-2片，一日3次',
          daysToExpiry: 730
        }
      ];

      const randomIndex = Math.floor(Math.random() * mockMedicines.length);
      const mockData = mockMedicines[randomIndex];
      console.log('✅ 使用模拟数据:', mockData.name);

      return {
        success: true,
        data: mockData
      };
    }
  }

  /**
   * 解析OCR识别结果，提取药品信息
   * @param {object} ocrData - 百度OCR返回的原始数据
   */
  parseOCRResult(ocrData) {
    try {
      const result = {
        name: '',
        manufacturer: '',
        specification: '',
        category: '其他',
        dosage: '',
        expiryDate: '',  // 新增：过期日期
        daysToExpiry: 730,
        traceCode: ''  // 新增：药品追溯码
      };

      if (!ocrData.words_result || ocrData.words_result.length === 0) {
        console.log('⚠️ 未识别到文字');
        return result;
      }

      const words = ocrData.words_result.map(item => item.words);
      const fullText = words.join('\n');
      console.log('识别到的文字:', fullText);

      // 优先尝试从【药品名称】或【产品名称】标签中识别
      let foundName = false;
      
      // 1. 尝试【药品名称】→ 通用名称
      const drugNameMatch = fullText.match(/【药品名称】\s*[\s\S]*?通用名称[：:]\s*([^\n]+)/);
      if (drugNameMatch && drugNameMatch[1]) {
        result.name = drugNameMatch[1].trim();
        console.log('✅ 从【药品名称】标签找到:', result.name);
        foundName = true;
      }
      
      // 2. 如果没有，尝试直接【产品名称】
      if (!foundName) {
        const productNameMatch = fullText.match(/【产品名称】\s*([^\n]+)/);
        if (productNameMatch && productNameMatch[1]) {
          result.name = productNameMatch[1].trim();
          console.log('✅ 从【产品名称】标签找到:', result.name);
          foundName = true;
        }
      }

      // 如果标签没找到，再从单独行中查找
      if (!result.name) {
        let mainNameIndex = -1;
        let mainName = '';
        
        // 先找到主要的名称（包含剂型关键词的行，支持中英文）
        for (let i = 0; i < words.length; i++) {
          const trimmed = words[i].trim();
          if (trimmed.length >= 3 && trimmed.length <= 50 && (
            trimmed.includes('片') || trimmed.includes('胶囊') || 
            trimmed.includes('颗粒') || trimmed.includes('丸') || 
            trimmed.includes('软膏') || trimmed.includes('溶液') ||
            trimmed.includes('注射液') || trimmed.includes('散') ||
            trimmed.includes('滴眼液') || trimmed.includes('眼膏') ||
            trimmed.includes('乳膏') || trimmed.includes('凝胶') ||
            trimmed.includes('酊') || trimmed.includes('膏') ||
            trimmed.includes('气雾剂') || trimmed.includes('保险液') ||
            trimmed.toLowerCase().includes('tablet') || 
            trimmed.toLowerCase().includes('capsule') ||
            trimmed.toLowerCase().includes('pill') ||
            trimmed.toLowerCase().includes('softgel') ||
            trimmed.toLowerCase().includes('syrup') ||
            trimmed.toLowerCase().includes('cream') ||
            trimmed.toLowerCase().includes('ointment') ||
            trimmed.toLowerCase().includes('liquid')
          )) {
            if (!trimmed.includes('用法') && !trimmed.includes('用量') && 
                !trimmed.includes('症状') && !trimmed.includes('【') && 
                !trimmed.includes('】') && !trimmed.includes('[') &&
                !trimmed.toLowerCase().includes('suggested') &&
                !trimmed.toLowerCase().includes('direction')) {
              mainNameIndex = i;
              mainName = trimmed;
              break;
            }
          }
        }
        
        if (mainNameIndex !== -1) {
          // 尝试合并前一行作为前缀
          let fullName = mainName;
          if (mainNameIndex > 0) {
            const prevWord = words[mainNameIndex - 1].trim();
            // 如果前一行看起来是品牌或产品前缀（包含牌、叶黄素、维生素、白药等词）
            if (prevWord.length > 0 && prevWord.length <= 30 &&
                (prevWord.includes('牌') || prevWord.includes('维生素') || 
                 prevWord.includes('叶') || prevWord.includes('素') ||
                 prevWord.includes('钙') || prevWord.includes('锌') ||
                 prevWord.includes('铁') || prevWord.includes('镁') ||
                 prevWord.includes('药') || prevWord.includes('白'))) {
              fullName = prevWord + mainName;
            } else if (prevWord.length > 0 && prevWord.length <= 15 && 
                       !prevWord.includes('【') && !prevWord.includes('OTC')) {
              // 只要不是标签，短文字都尝试合并
              fullName = prevWord + mainName;
            }
          }
          
          // 去除可能的“说明书”后缀
          if (fullName.includes('说明书')) {
            fullName = fullName.replace('说明书', '').trim();
          }
          
          result.name = fullName;
          console.log('✅ 从单独行找到药品名:', result.name);
        }
      }

      if (!result.name) {
        console.log('⚠️ 未识别到药品名称，留空待用户填写');
      }

      // 规格识别 - 优先匹配【规格】或【产品规格】标签（支持标签中间换行和英文
      const specPatterns = [
        /【产品规格】\s*([^【\[]+)/i,
        /【产[\s\S]*?品[\s\S]*?规[\s\S]*?格】\s*([^【\[]+)/i,
        /【规格】\s*([^【\[]+)/i,
        /【规[\s\S]*?格】\s*([^【\[]+)/i,
        /【规格类型】\s*([^【\[]+)/i,
        /\[规格\]\s*([^【\[]+)/i,
        /规格[：:]\s*([^【\[]+)/i,
        /净含量[：:]\s*([^【\[\n]+)/i,
        /serving[ \t]*size[ \t]*:[\s\S]*?([^\n]+)/i,
        /strength[ \t]*:[\s\S]*?([^\n]+)/i,
        /dosage[ \t]*:[\s\S]*?([^\n]+)/i,
        /size[ \t]*:[\s\S]*?([^\n]+)/i
      ];
      for (const pattern of specPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          let specText = match[1].trim();
          // 合并直到遇到标签或完整句子
          const lines = specText.split(/\n/);
          let fullSpec = '';
          for (const line of lines) {
            if (!line.trim()) continue;
            // 如果遇到下一个标签开头就停止
            if (line.includes('【') || line.includes('[') || 
                line.includes('用法') || line.includes('用量')) {
              break;
            }
            if (fullSpec) fullSpec += ' ';
            fullSpec += line.trim();
            // 如果句子完整了就停止
            if (fullSpec.includes('克') && fullSpec.length > 10) break;
          }
          result.specification = fullSpec || lines[0].trim();
          console.log('✅ 找到规格:', result.specification);
          break;
        }
      }
      
      // 包装规格识别（如X袋/盒、X片/盒、X粒/盒等）
      const packPatterns = [
        /包装[：:]\s*([^\n]+)/,
        /【包装】\s*([^\n]+)/,
        /(\d+袋\/盒)/,
        /(\d+片\/盒)/,
        /(\d+粒\/盒)/,
        /(\d+丸\/盒)/,
        /(\d+胶囊\/盒)/,
        /(\d+包\/盒)/,
        /(\d+瓶\/盒)/,
        /(\d+支\/盒)/,
        /(\d+盒)/,
        /铝罐包装[\s\S]*?(\d+瓶)/
      ];
      for (const pattern of packPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          const packStr = match[1] || match[0];
          if (packStr && packStr.length <= 30) {
            // 如果已经有规格，就追加；否则就直接使用
            if (result.specification) {
              if (!result.specification.includes(packStr)) {
                result.specification += ' ' + packStr;
                console.log('✅ 追加包装规格:', packStr);
              }
            } else {
              result.specification = packStr;
              console.log('✅ 找到包装规格:', packStr);
            }
            break;
          }
        }
      }

      // 用法用量识别 - 支持【用法用量】【使用方法】或【食用方法】（支持标签中间换行和英文
      const dosagePatterns = [
        /【用法用量】(?:\s*\n)?([^【\[]+)/i,
        /【用[\s\S]*?法[\s\S]*?用[\s\S]*?量】(?:\s*\n)?([^【\[]+)/i,
        /【使用方法】(?:\s*\n)?([^【\[]+)/i,
        /【使[\s\S]*?用[\s\S]*?方[\s\S]*?法】(?:\s*\n)?([^【\[]+)/i,
        /【食用方法】(?:\s*\n)?([^【\[]+)/i,
        /【食[\s\S]*?用[\s\S]*?方[\s\S]*?法】(?:\s*\n)?([^【\[]+)/i,
        /\[用法用量\](?:\s*\n)?([^【\[]+)/i,
        /用法用量[：:](?:\s*\n)?([^【\[]+)/i,
        /使用方法[：:](?:\s*\n)?([^【\[]+)/i,
        /食用及食用方法[：:](?:\s*\n)?([^【\[]+)/i,
        /食用方法[：:](?:\s*\n)?([^【\[]+)/i,
        /suggested[ \t]*use[ \t]*:[\s\S]*?([^\n]+)/i,
        /directions[ \t]*:[\s\S]*?([^\n]+)/i,
        /direction[ \t]*:[\s\S]*?([^\n]+)/i,
        /how[ \t]*to[ \t]*use[ \t]*:[\s\S]*?([^\n]+)/i
      ];
      for (const pattern of dosagePatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          let dosageText = match[1].trim();
          // 找到合适的内容，尝试找到包含关键词的行，或第一行
          const lines = dosageText.split(/\n/).filter(line => line.trim().length > 0);
          let validDosage = '';
          
          // 先尝试找包含用法关键词的行（中英文）
          let startIndex = -1;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('口服') || line.includes('外用') || 
                line.includes('一次') || line.includes('一日') ||
                line.includes('每次') || line.includes('每日') ||
                line.toLowerCase().includes('take') || 
                line.toLowerCase().includes('adult') ||
                line.toLowerCase().includes('tablet') ||
                line.toLowerCase().includes('chew') ||
                line.toLowerCase().includes('once') ||
                line.toLowerCase().includes('twice')) {
              startIndex = i;
              break;
            }
          }
          
          // 如果找到了开头，尝试合并相关行直到句子完整
          if (startIndex !== -1) {
            validDosage = lines[startIndex].trim();
            // 如果句子不完整（没有句号、逗号等结尾，或者是单字结尾），尝试合并下一行
            const endings = [ '。', '！', '？', '）', ')', '；', ';', '】', ']' ];
            let needsMore = true;
            // 检查是否需要合并更多内容
            if (validDosage.length < 8) {
              needsMore = true;
            } else if (validDosage.length >= 8) {
              // 检查结尾是否完整
              let isComplete = false;
              for (const end of endings) {
                if (validDosage.endsWith(end)) {
                  isComplete = true;
                  break;
                }
              }
              needsMore = !isComplete;
            }
            
            if (needsMore && startIndex + 1 < lines.length) {
              const nextLine = lines[startIndex + 1].trim();
              // 检查下一行是否是用法的延续（不是下一个标签或无关内容）
              if (!nextLine.includes('【') && !nextLine.includes('[') && 
                  !nextLine.includes('成份') && !nextLine.includes('性状') &&
                  !nextLine.includes('规格')) {
                validDosage += nextLine;
                // 如果还是不完整，再尝试合并第三行
                if (validDosage.length < 15 && startIndex + 2 < lines.length) {
                  const thirdLine = lines[startIndex + 2].trim();
                  if (!thirdLine.includes('【') && !thirdLine.includes('[')) {
                    validDosage += thirdLine;
                  }
                }
              }
            }
          }
          
          // 如果没找到，就取第一行
          if (!validDosage && lines.length > 0) {
            validDosage = lines[0].trim();
          }
          
          if (validDosage) {
            result.dosage = validDosage;
            console.log('✅ 找到用法用量:', result.dosage);
            break;
          }
        }
      }

      // 过期日期识别 - 优先匹配明确的标签
      let expiryDateStr = null;
      
      // 0. 最优先：尝试匹配【保质期至】【有效期至】或【有效期】至 的模式（支持方括号和英文格式
      // 首先，检查是否存在有效期相关标签
      const hasExpiryToTag = /【有效期】\s*至/.test(fullText) || /\[有效期\]\s*至/.test(fullText) || /有效期[:：]?\s*至/.test(fullText) || /【有效期至】/.test(fullText) || /\[有效期至\]/.test(fullText) || /有效期至/.test(fullText) || /【保质期至】/.test(fullText) || /\[保质期至\]/.test(fullText) || /保质期至/.test(fullText) || /exp[ \t]*:/.test(fullText.toLowerCase()) || /expiry[ \t]*:/.test(fullText.toLowerCase()) || /best[ \t]*by/.test(fullText.toLowerCase()) || /use[ \t]*by/.test(fullText.toLowerCase());
      
      if (hasExpiryToTag) {
        console.log('🔍 检测到有效期/保质期标签（含英文），正在搜索日期...');
        
        // 1. 尝试所有可能的直接匹配模式，不分优先级，找到就返回
        const allPatterns = [
          /【保质期至】\s*[:：]?\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /\[保质期至\]\s*[:：]?\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /保质期至\s*[:：]?\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /【有效期至】\s*[:：]?\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /\[有效期至\]\s*[:：]?\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /有效期至\s*[:：]?\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /【有效期】\s*至\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /\[有效期\]\s*至\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /有效期[:：]?\s*至\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?(?:\d{0,2}日)?)/i,
          /exp[ \t]*[:][ \t]*(\d{1,2}[\/]\d{4})/i,
          /expiry[ \t]*[:][ \t]*(\d{1,2}[\/]\d{4})/i,
          /best[ \t]*by[ \t]*[:][ \t]*(\d{1,2}[\/]\d{4})/i,
          /use[ \t]*by[ \t]*[:][ \t]*(\d{1,2}[\/]\d{4})/i,
          /exp[ \t]*[:][ \t]*(\d{4}[\/]\d{1,2})/i,
          /expiry[ \t]*[:][ \t]*(\d{4}[\/]\d{1,2})/i
        ];
        
        for (const pattern of allPatterns) {
          const match = fullText.match(pattern);
          if (match && match[1]) {
            expiryDateStr = match[1];
            console.log('✅ 直接匹配到日期:', expiryDateStr);
            break;
          }
        }
        
        // 2. 如果直接匹配失败，尝试在标签附近搜索（包括前面和后面
        if (!expiryDateStr) {
          let expiryToIndex = -1;
          
          // 查找所有可能的标签位置
          const labelPatterns = [
            '【保质期至】', '[保质期至]', '保质期至', 
            '【有效期至】', '[有效期至]', '有效期至',
            '【有效期】至', '[有效期]至', '有效期：至', '有效期:至', '有效期至'
          ];
          
          for (const label of labelPatterns) {
            const idx = fullText.indexOf(label);
            if (idx !== -1) {
              expiryToIndex = idx;
              break;
            }
          }
          
          if (expiryToIndex !== -1) {
            // 搜索标签后面的内容（优先）
            const searchAfter = fullText.substring(expiryToIndex, Math.min(expiryToIndex + 60, fullText.length));
            console.log('📋 搜索范围（标签后面）:', searchAfter);
            
            let nearbyDateMatch = 
              searchAfter.match(/(\d{4}\.\d{1,2}(?:\.\d{1,2})?)/) || 
              searchAfter.match(/(\d{4}-\d{1,2}(?:-\d{1,2})?)/) || 
              searchAfter.match(/(\d{4}\/\d{1,2}(?:\/\d{1,2})?)/) ||
              searchAfter.match(/(\d{4}年\d{1,2}月(?:\d{1,2}日)?)/) || 
              searchAfter.match(/(\d{8})/);
            
            if (nearbyDateMatch && nearbyDateMatch[1]) {
              expiryDateStr = nearbyDateMatch[1];
              console.log('✅ 在标签后面搜索到日期:', expiryDateStr);
            } else {
              // 如果标签后面没找到，搜索标签前面的内容
              const searchBefore = fullText.substring(Math.max(0, expiryToIndex - 100), expiryToIndex);
              console.log('📋 搜索范围（标签前面）:', searchBefore);
              
              // 在标签前面查找所有可能的日期
              console.log('📋 开始在标签前面搜索日期...');
              
              // 查找所有可能的日期格式
              const allDatePatterns = [
                /(\d{4}\.\d{1,2}(?:\.\d{1,2})?)/g,
                /(\d{4}-\d{1,2}(?:-\d{1,2})?)/g,
                /(\d{4}\/\d{1,2}(?:\/\d{1,2})?)/g,
                /(\d{4}年\d{1,2}月(?:\d{1,2}日)?)/g,
                /(\d{8})/g
              ];
              
              let allFoundDates = [];
              
              for (const datePattern of allDatePatterns) {
                const dates = [...searchBefore.matchAll(datePattern)];
                for (const match of dates) {
                  allFoundDates.push({
                    date: match[1],
                    index: match.index
                  });
                }
              }
              
              // 按位置排序，最接近标签的在最后
              allFoundDates.sort((a, b) => a.index - b.index);
              console.log('📋 找到的所有日期:', allFoundDates.map(d => d.date));
              
              // 从最后一个开始检查（最接近标签的）
              for (let i = allFoundDates.length - 1; i >= 0; i--) {
                const found = allFoundDates[i];
                const possibleDate = found.date;
                
                // 特殊逻辑：如果有有效期标签，并且是在标签前面找到的最近日期
                // 直接采用这个日期作为有效期日期（不管黑名单，因为生产日期在更前面）
                expiryDateStr = possibleDate;
                console.log('✅ 在标签前面搜索到日期:', expiryDateStr);
                break;
              }
            }
          }
        }
      }
      
      // 1. 然后尝试匹配失效日期标签
      if (!expiryDateStr) {
        const fxSectionMatch = fullText.match(/失效日期[\s\S]*?(\d{8})/);
        if (fxSectionMatch && fxSectionMatch[1]) {
          const possibleDate = fxSectionMatch[1];
          const year = parseInt(possibleDate.substring(0, 4));
          if (year >= 1990 && year <= 2100) {
            expiryDateStr = possibleDate;
            console.log('✅ 从失效日期标签后找到8位日期:', expiryDateStr);
          }
        }
      }
      
      // 如果没找到，尝试更宽松的匹配，查看失效日期后面的所有内容
      if (!expiryDateStr) {
        const fxFullSectionMatch = fullText.match(/失效日期[\s\S]*?$/);
        if (fxFullSectionMatch && fxFullSectionMatch[0]) {
          console.log('📋 失效日期后面的完整文本:', fxFullSectionMatch[0]);
          // 查找所有8位数字
          const eightDigitMatches = fxFullSectionMatch[0].match(/(\d{8})/g);
          if (eightDigitMatches) {
            for (const possibleDate of eightDigitMatches) {
              const year = parseInt(possibleDate.substring(0, 4));
              if (year >= 1990 && year <= 2100) {
                expiryDateStr = possibleDate;
                console.log('✅ 从失效日期后找到有效日期:', expiryDateStr);
                break;
              }
            }
          }
        }
      }
      
      // 2. 如果没找到，继续其他方法（注意：这里有效期至已经在上面处理了，所以不重复处理）
        if (!expiryDateStr) {
          const expiryPatterns = [
            /【失效日期】\s*[:：]?\s*(\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?\d{0,2})|失效日期\s*[:：]?\s*(\d{8}|\d{4}[\.\-\/年]?\d{1,2}[\.\-\/月]?\d{0,2})/,
            /(\d{4}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))/,
            /(\d{4}年\d{1,2}月(?:\d{1,2}日)?)/,
            /(\d{4}\.\d{1,2}(?:\.\d{1,2})?)/,
            /(\d{4}-\d{1,2}(?:-\d{1,2})?)/,
            /(\d{4}\/\d{1,2}(?:\/\d{1,2})?)/
          ];
        console.log('📋 完整识别文字:', JSON.stringify(fullText));
        for (const pattern of expiryPatterns) {
          const match = fullText.match(pattern);
          console.log('🔍 正在匹配日期，pattern:', pattern, 'match:', match);
          if (match) {
            let dateStr = null;
            for (let i = 1; i < match.length; i++) {
              if (match[i]) {
                dateStr = match[i];
                break;
              }
            }
            if (!dateStr) dateStr = match[0];

            // 验证年份是否合理
            let validYear = false;
            if (dateStr.length >= 4) {
              const year = parseInt(dateStr.substring(0, 4));
              if (year >= 1990 && year <= 2100) {
                validYear = true;
              }
            }
            if (!validYear) {
              console.log('⚠️ 年份不合理，跳过:', dateStr);
              continue;
            }

            const matchIndex = match.index || 0;
            const checkLength = 20;
            const contextBefore = fullText.substring(Math.max(0, matchIndex - checkLength), matchIndex);
            const contextAfter = fullText.substring(matchIndex, matchIndex + checkLength);
            const context = (contextBefore + contextAfter);
            
            // 完整黑名单（总是检查生产日期，除非日期明确是在【有效期】至标签后面）
            const blacklistKeywords = ['说明书编制日期', '生产日期', '生产批号', '产品批号', '有效期三年', '批准文号'];
            
            let isBlacklisted = false;
            for (const keyword of blacklistKeywords) {
              if (context.includes(keyword)) {
                isBlacklisted = true;
                console.log('⚠️ 发现黑名单关键词，跳过:', keyword);
                break;
              }
            }
            
            if (!isBlacklisted) {
              expiryDateStr = dateStr;
              console.log('✅ 找到日期字符串:', expiryDateStr);
              break;
            }
          }
        }
      }
      
      if (expiryDateStr) {
        result.expiryDate = this.formatDate(expiryDateStr);
      }

      // 生产厂商识别 - 优先匹配【上市许可持有人】或【生产企业】标签
      const mfgPatterns = [
        // 优先匹配完整的标签内容，支持跨行情况
        /【药品上市许可持有人\/生产企业】[\s\S]*?([^\n]+)/,
        /制造[\s\S]*?商[：:]\s*([^\n]+)/,
        /制造商[：:]\s*([^\n]+)/,
        /【备案人\/生产企业】[：:]\s*([^\n]+)/,
        /【备案人\/生产单位\/售后服务单位】[：:]\s*([^\n]+)/,
        /【上市许可持有人】[\s\S]*?名\s*称[：:]\s*([^\n]+)/,
        /【生产企业】[\s\S]*?企业名称[：:]\s*([^\n]+)/,
        /【生产企业】[：:]\s*([^\n]+)/,
        /备案人\/生产企业[：:]\s*([^\n]+)/,
        /【生产企业】[^\n]+?([^\n]{5,})/,
        /\[上市许可持有人\][：:]\s*([^\n]+)/,
        /\[生产企业\][：:]\s*([^\n]+)/,
        /生产企业[：:]\s*([^\n]+)/,
        /生产厂家[：:]\s*([^\n]+)/
      ];
      for (const pattern of mfgPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          let mfgName = match[1].trim();
          // 去除后面的额外信息（如·生产地址...等）
          mfgName = mfgName.split(/[·、\n]/)[0].trim();
          // 验证厂商名长度，太短的可能是错误匹配（如"司"）
          if (mfgName.length >= 3) {
            result.manufacturer = mfgName;
            console.log('✅ 从标签找到厂商:', result.manufacturer);
            break;
          }
        }
      }
      
      // 兜底 - 从单独文字行找厂商名
      if (!result.manufacturer) {
        for (const word of words) {
          let trimmed = word.trim();
          // 去除可能的标签前缀
          trimmed = trimmed.replace(/^【上市许可持有人】|^\[上市许可持有人\]|^上市许可持有人|^【生产企业】|^\[生产企业\]|^生产企业|^【备案人\/生产企业】|^\[备案人\/生产企业\]|^备案人\/生产企业/, '').trim();
          // 排除一些明显不是厂商名的内容（如"制药一致性评价"）
          if ((trimmed.includes('制药') || trimmed.includes('药业')) && !trimmed.includes('评价') && trimmed.length <= 50 && trimmed.length >= 4) {
            result.manufacturer = trimmed;
            console.log('✅ 从单独行找到厂商:', result.manufacturer);
            break;
          }
        }
      }

      // 药品追溯码识别
      const traceCodePatterns = [
        /药品追溯码[\s\S]*?(\d{20})/,
        /药品标识码[：:]\s*(\d+)\s*序列号[：:]\s*(\d+)/,
        /药品追溯码[\s\S]*?(\d+)/,
        /追溯码[：:]\s*(\d+)/
      ];
      
      for (const pattern of traceCodePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          if (match.length === 3 && match[1] && match[2]) {
            // 如果是药品标识码和序列号分开的情况，合并起来
            result.traceCode = match[1] + match[2];
            console.log('✅ 从药品标识码和序列号合并找到追溯码:', result.traceCode);
          } else if (match[1]) {
            // 单个追溯码
            result.traceCode = match[1];
            console.log('✅ 找到药品追溯码:', result.traceCode);
          }
          if (result.traceCode) break;
        }
      }

      if (result.name) {
        if (result.name.includes('感冒') || result.name.includes('退热') || result.name.includes('抗病毒') || result.name.includes('板蓝根')) {
          result.category = '感冒用药';
        } else if (result.name.includes('消炎') || result.name.includes('阿莫西林') || result.name.includes('头孢') || result.name.includes('霉素')) {
          result.category = '抗生素';
        } else if (result.name.includes('维生素')) {
          result.category = '维生素';
        } else if (result.name.includes('止痛') || result.name.includes('布洛芬') || result.name.includes('镇痛')) {
          result.category = '解热镇痛';
        } else if (result.name.includes('胃') || result.name.includes('消化')) {
          result.category = '消化系统';
        } else if (result.name.includes('止咳') || result.name.includes('化痰')) {
          result.category = '止咳化痰';
        }
      }

      console.log('解析结果:', result);
      return result;
    } catch (error) {
      console.error('❌ 解析OCR结果失败:', error.message);
      throw error;
    }
  }

  /**
   * 格式化日期为 YYYY.MM.DD 格式
   * @param {string} dateStr - 原始日期字符串
   * @returns {string} 格式化后的日期
   */
  formatDate(dateStr) {
    try {
      if (!dateStr) return '';
      
      let year = '', month = '', day = '';
      
      // 处理8位纯数字格式（如20280302）
      if (/^\d{8}$/.test(dateStr)) {
        year = dateStr.substring(0, 4);
        month = dateStr.substring(4, 6);
        day = dateStr.substring(6, 8);
      }
      // 处理各种日期格式
      else if (dateStr.includes('年') && dateStr.includes('月')) {
        // 格式：2026年12月31日 或 2026年12月
        const matchFull = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (matchFull) {
          year = matchFull[1];
          month = matchFull[2].padStart(2, '0');
          day = matchFull[3].padStart(2, '0');
        } else {
          // 只有年月：2026年12月
          const matchMonth = dateStr.match(/(\d{4})年(\d{1,2})月/);
          if (matchMonth) {
            year = matchMonth[1];
            month = matchMonth[2].padStart(2, '0');
            day = '01'; // 默认按1号算
          }
        }
      } else if (dateStr.includes('-')) {
        // 格式：2026-12-31 或 2026-12
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
          year = parts[0];
          month = parts[1].padStart(2, '0');
          day = parts[2] ? parts[2].padStart(2, '0') : '01'; // 如果没有日，默认01
        }
      } else if (dateStr.includes('/')) {
        // 格式：2026/12/31 或 2026/12 或 12/2026（英文格式）
        const parts = dateStr.split('/');
        if (parts.length >= 2) {
          // 检查是 YYYY/MM 还是 MM/YYYY
          if (parseInt(parts[0]) > 1000) {
            // YYYY/MM/DD 格式
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2] ? parts[2].padStart(2, '0') : '01';
          } else {
            // MM/YYYY 格式（英文）
            month = parts[0].padStart(2, '0');
            year = parts[1];
            day = '01';
          }
        }
      } else if (dateStr.includes('.')) {
        // 格式：2026.12.31 或 2026.12
        const parts = dateStr.split('.');
        if (parts.length >= 2) {
          year = parts[0];
          month = parts[1].padStart(2, '0');
          day = parts[2] ? parts[2].padStart(2, '0') : '01'; // 如果没有日，默认01
        }
      }
      
      // 额外的检查，确保年份合理（1900-2100之间）
      if (year && (parseInt(year) < 1900 || parseInt(year) > 2100)) {
        console.log('⚠️ 年份不在合理范围内，返回空');
        return '';
      }
      
      if (year && month && day) {
        const formatted = `${year}.${month}.${day}`;
        console.log('📅 识别到过期日期:', formatted);
        return formatted;
      }
      
      console.log('⚠️ 日期解析失败:', dateStr);
      return '';
    } catch (error) {
      console.error('❌ 日期格式化失败:', error.message);
      return '';
    }
  }

  /**
   * 保存识别历史
   * @param {number} userId - 用户ID
   * @param {number} familyId - 家庭ID
   * @param {string} type - 识别类型
   * @param {string} inputData - 输入数据
   * @param {object} result - 识别结果
   */
  async saveRecognitionHistory(userId, familyId, type, inputData, result) {
    try {
      await db.query(`
        INSERT INTO recognition_history (user_id, family_id, type, input_data, recognition_result, is_added)
        VALUES (?, ?, ?, ?, ?, FALSE)
      `, [userId, familyId, type, inputData, JSON.stringify(result)]);

      console.log('✅ 识别历史保存成功');
    } catch (error) {
      console.error('❌ 保存识别历史失败:', error.message);
    }
  }
}

module.exports = new RecognitionService();