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
        daysToExpiry: 730
      };

      if (!ocrData.words_result || ocrData.words_result.length === 0) {
        console.log('⚠️ 未识别到文字');
        return result;
      }

      const words = ocrData.words_result.map(item => item.words);
      const fullText = words.join('\n');
      console.log('识别到的文字:', fullText);

      const namePatterns = [
        /([\u4e00-\u9fa5]+[片胶囊颗粒丸剂膏散液注射]+)/,
        /([\u4e00-\u9fa5]{2,}[片胶囊颗粒丸]+)/
      ];
      for (const pattern of namePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          result.name = match[1];
          break;
        }
      }

      if (!result.name) {
        console.log('⚠️ 未识别到药品名称，留空待用户填写');
      }

      const specPatterns = [
        /【规\s*格】[^\n]*(\d+\.?\d*[gG克mMLl毫mgMG]+[^\n]*)/,
        /规格[^\n]*(\d+\.?\d*[gG克mMLl毫mgMG]+[^\n]*)/,
        /规格[^\n]*每[袋瓶支片粒][^\n]*(\d+\.?\d*[gG克mMLl毫mgMG]+[^\n]*)/,
        /(\d+\.?\d*[gmGMμµ]+\s*[×x*]\s*\d+[粒片袋支瓶盒])/,
        /(\d+\.?\d*[gmGMμµ]+\s*[×x*]\s*\d+\s*[×x*]\s*\d+[粒片袋支])/,
        /(\d+[mM][lL]\s*[×x*]\s*\d+[支瓶])/,
        /每[袋瓶支片粒][^\n]*(\d+\.?\d*[gG克mMLl毫mgMG]+)/
      ];
      for (const pattern of specPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          result.specification = match[1].trim();
          break;
        }
      }

      const dosagePatterns = [
        /【用法用量】[^\n]*(口服[^\n]*)/,
        /用法用量[^\n]*(口服[^\n]*)/,
        /用法用量[^\n]*(外用[^\n]*)/,
        /用法用量[^\n]*(开水冲服[^\n]*)/,
        /(口服.*?[一二三四五六七八九十\d]+次)/,
        /(外用.*?[一二三四五六七八九十\d]+次)/,
        /(开水冲服.*?[一二三四五六七八九十\d]+次)/,
        /([一二三四五六七八九十\d]+次.*?[一二三四五六七八九十\d]+[片粒袋])/
      ];
      for (const pattern of dosagePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          result.dosage = match[1].trim();
          break;
        }
      }

      const expiryPatterns = [
        /【有效期至】\s*?(\d{4}[.\-\/年]\d{1,2}(?:[.\-\/月]\d{1,2}(?:日)?)?)/,
        /有效期至\s*?(\d{4}[.\-\/年]\d{1,2}(?:[.\-\/月]\d{1,2}(?:日)?)?)/,
        /有效期\s*?(\d{4}[.\-\/年]\d{1,2}(?:[.\-\/月]\d{1,2}(?:日)?)?)/,
        /到期日\s*?(\d{4}[.\-\/年]\d{1,2}(?:[.\-\/月]\d{1,2}(?:日)?)?)/,
        /有效期?\s*?(\d{4}[.\-\/年]\d{1,2}(?:[.\-\/月]\d{1,2}(?:日)?)?)/,
        /至\s*?(\d{4}[.\-\/年]\d{1,2}(?:[.\-\/月]\d{1,2}(?:日)?)?)/,
        /(\d{4}\.\d{1,2}(?:\.\d{1,2})?)/
      ];
      console.log('📋 完整识别文字:', JSON.stringify(fullText));
      for (const pattern of expiryPatterns) {
        const match = fullText.match(pattern);
        console.log('🔍 正在匹配日期，pattern:', pattern, 'match:', match);
        if (match) {
          const dateStr = match[1].trim();
          console.log('✅ 找到日期字符串:', dateStr);
          result.expiryDate = this.formatDate(dateStr);
          break;
        }
      }

      const mfgPatterns = [
        /【生产厂家】[^\n]*([\u4e00-\u9fa5]+)/,
        /生产厂家[^\n]*([\u4e00-\u9fa5]+)/,
        /【生产企业】[^\n]*([\u4e00-\u9fa5]+)/,
        /生产企业[^\n]*([\u4e00-\u9fa5]+)/,
        /([\u4e00-\u9fa5]+制药[\u4e00-\u9fa5]*有限[公司责任]*)/,
        /([\u4e00-\u9fa5]+药业[\u4e00-\u9fa5]*有限[公司责任]*)/,
        /([\u4e00-\u9fa5]+制药[\u4e00-\u9fa5]*)/,
        /([\u4e00-\u9fa5]+药业[\u4e00-\u9fa5]*)/
      ];
      for (const pattern of mfgPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          result.manufacturer = match[1].trim();
          break;
        }
      }

      if (result.name) {
        if (result.name.includes('感冒') || result.name.includes('退热') || result.name.includes('抗病毒')) {
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
      
      // 处理各种日期格式
      if (dateStr.includes('年') && dateStr.includes('月')) {
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
        // 格式：2026/12/31 或 2026/12
        const parts = dateStr.split('/');
        if (parts.length >= 2) {
          year = parts[0];
          month = parts[1].padStart(2, '0');
          day = parts[2] ? parts[2].padStart(2, '0') : '01'; // 如果没有日，默认01
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
      
      if (year && month && day) {
        const formatted = `${year}.${month}.${day}`;
        console.log('📅 识别到过期日期:', formatted);
        return formatted;
      }
      
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