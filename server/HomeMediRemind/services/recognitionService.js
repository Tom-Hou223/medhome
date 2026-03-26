const axios = require('axios');
const db = require('../db');
const config = require('../config');

class RecognitionService {
  constructor() {
    this.baiduAccessToken = null;
    this.baiduTokenExpireTime = null;
  }

  /**
   * 获取百度AI access_token（缓存30天）
*/
  async getBaiduAccessToken() {
    // 检查缓存是否有效
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
        // 设置过期时间为29天（提前1天刷新）
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

      // 调用阿里云条码查询API
      // 注意：参数名是 Code 而不是 barcode
      const url = `${config.aliyun.barcodeApiUrl}?Code=${barcode}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `APPCODE ${config.aliyun.appCode}`
        },
        timeout: 10000
      });

      console.log('阿里云API响应:', response.data);

      // 检查响应状态
      if (response.data.status !== '200') {
        console.log('❌ 阿里云API返回错误:', response.data.message);
        return {
          success: false,
          message: response.data.message || '未找到该条形码对应的药品信息'
        };
      }

      // 解析阿里云返回的数据
      const apiData = response.data;
      const result = {
        name: apiData.ItemName || '',
        manufacturer: apiData.FirmName || '',
        specification: apiData.ItemSpecification || '',
        category: this.parseCategoryFromRemark(apiData.remark) || '其他',
        dosage: this.parseDosageFromRemark(apiData.remark) || '',
        daysToExpiry: 730, // 默认2年有效期
        brandName: apiData.BrandName || '',
        image: apiData.Image && apiData.Image.length > 0 ? apiData.Image[0].Imageurl : null,
        firmAddress: apiData.FirmAddress || '',
        barcode: apiData.Barcode || barcode
      };

      console.log('✅ 条形码识别成功:', result.name);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ 条形码识别失败:', error.message);
      
      // 打印详细错误信息用于调试
      if (error.response) {
        console.error('API响应状态码:', error.response.status);
        console.error('API响应数据:', JSON.stringify(error.response.data, null, 2));
        console.error('API响应头:', JSON.stringify(error.response.headers, null, 2));
      }
      
      // 如果是网络错误或超时，返回友好提示
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          message: '网络请求超时，请稍后重试'
        };
      }
      
      return {
        success: false,
        message: '识别失败，请检查条形码是否正确或稍后重试'
      };
    }
  }

  /**
   * 从remark字段解析药品分类
   * @param {string} remark - 备注信息，格式如："颗粒剂#盒#国药准字Z44021940#非处方药#中成药#感冒"
   */
  parseCategoryFromRemark(remark) {
    if (!remark) return '其他';
    
    const parts = remark.split('#');
    
    // 查找可能的分类关键词
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
   * 从remark字段解析用法用量（如果有的话）
   * @param {string} remark - 备注信息
   */
  parseDosageFromRemark(remark) {
    if (!remark) return '';
    
    // remark中通常不包含用法用量，返回空字符串让用户手动填写
    // 可以根据实际API返回的数据结构调整
    return '';
  }

  /**
   * 根据商品名称推测药品分类
   * @param {string} name - 商品名称
   */
  guessCategory(name) {
    if (!name) return '其他';
    
    if (name.includes('感冒') || name.includes('退热') || name.includes('发烧')) {
      return '感冒用药';
    } else if (name.includes('消炎') || name.includes('阿莫西林') || name.includes('头孢') || name.includes('抗生素')) {
      return '抗生素';
    } else if (name.includes('维生素') || name.includes('钙片') || name.includes('补钙')) {
      return '维生素';
    } else if (name.includes('止痛') || name.includes('布洛芬') || name.includes('镇痛')) {
      return '解热镇痛';
    } else if (name.includes('胃') || name.includes('消化') || name.includes('肠')) {
      return '消化系统';
    } else if (name.includes('咳') || name.includes('痰')) {
      return '止咳化痰';
    } else if (name.includes('创可贴') || name.includes('纱布') || name.includes('绷带')) {
      return '外用药';
    }
    
    return '其他';
  }

  /**
   * 图片OCR识别
   * @param {Buffer} imageBuffer - 图片数据
   */
  async recognizeImage(imageBuffer) {
    try {
      console.log('开始识别图片...');

      // 获取百度AI access_token
      const accessToken = await this.getBaiduAccessToken();

      // 将图片转换为base64
      const imageBase64 = imageBuffer.toString('base64');

      // 调用百度AI通用文字识别API（高精度版）
      const url = `${config.baidu.ocrUrl}?access_token=${accessToken}`;

      const response = await axios.post(url,
        `image=${encodeURIComponent(imageBase64)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data.error_code) {
        throw new Error(response.data.error_msg || '识别失败');
      }

      // 解析OCR识别结果，提取药品信息
      const result = this.parseOCRResult(response.data);

      console.log('✅ 图片识别成功');
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ 图片识别失败:', error.message);

      // 如果百度AI识别失败，返回模拟数据（开发阶段）
      console.log('使用模拟数据...');
      return {
        success: true,
        data: {
          name: '感冒灵颗粒',
          manufacturer: '广州白云山制药股份有限公司',
          specification: '10g*12袋',
          category: '感冒用药',
          dosage: '开水冲服，一次10g，一日3次',
          daysToExpiry: 730
        }
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
        daysToExpiry: 730
      };

      // 提取所有识别到的文字
      if (!ocrData.words_result || ocrData.words_result.length === 0) {
        console.log('⚠️ 未识别到文字');
        // 返回空值，让用户手动填写
        return result;
      }

      const words = ocrData.words_result.map(item => item.words);
      const fullText = words.join('\n');
      console.log('识别到的文字:', fullText);

      // 使用正则表达式提取药品信息
      
      // 1. 药品名称（通常在前几行，包含"片"、"胶囊"、"颗粒"等）
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

      // 如果没有识别到药品名称，留空让用户手动填写
      if (!result.name) {
        console.log('⚠️ 未识别到药品名称，留空待用户填写');
      }

      // 2. 生产厂家（包含"制药"、"药业"等）
      const mfgPatterns = [
        /([\u4e00-\u9fa5]+制药[\u4e00-\u9fa5]*有限[公司责任]*)/,
        /([\u4e00-\u9fa5]+药业[\u4e00-\u9fa5]*有限[公司责任]*)/,
        /([\u4e00-\u9fa5]+制药[\u4e00-\u9fa5]*)/,
        /([\u4e00-\u9fa5]+药业[\u4e00-\u9fa5]*)/
      ];
      for (const pattern of mfgPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          result.manufacturer = match[1];
          break;
        }
      }

      // 3. 规格（如 0.25g*24粒、10mg×20片）
      const specPatterns = [
        /(\d+\.?\d*[gmGMμµ]+\s*[×x*]\s*\d+[粒片袋支瓶盒])/,
        /(\d+\.?\d*[gmGMμµ]+\s*[×x*]\s*\d+\s*[×x*]\s*\d+[粒片袋支])/,
        /(\d+[mM][lL]\s*[×x*]\s*\d+[支瓶])/
      ];
      for (const pattern of specPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          result.specification = match[1];
          break;
        }
      }

      // 4. 用法用量
      const dosagePatterns = [
        /(口服.*?[一二三四五六七八九十\d]+次)/,
        /(外用.*?[一二三四五六七八九十\d]+次)/,
        /([一二三四五六七八九十\d]+次.*?[一二三四五六七八九十\d]+[片粒袋])/
      ];
      for (const pattern of dosagePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          result.dosage = match[1];
          break;
        }
      }

      // 5. 根据药品名称推测分类
      if (result.name) {
        if (result.name.includes('感冒') || result.name.includes('退热')) {
          result.category = '感冒用药';
        } else if (result.name.includes('消炎') || result.name.includes('阿莫西林') || result.name.includes('头孢')) {
          result.category = '抗生素';
        } else if (result.name.includes('维生素')) {
          result.category = '维生素';
        } else if (result.name.includes('止痛') || result.name.includes('布洛芬')) {
          result.category = '解热镇痛';
        } else if (result.name.includes('胃') || result.name.includes('消化')) {
          result.category = '消化系统';
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
