// API基础URL
const API_BASE_URL = 'http://172.20.10.3:3001/api';

// Token管理
class TokenManager {
  static getToken() {
    return wx.getStorageSync('token') || '';
  }

  static setToken(token) {
    wx.setStorageSync('token', token);
  }

  static clearToken() {
    wx.removeStorageSync('token');
  }
}

// 家庭管理
class FamilyManager {
  static getCurrentFamilyId() {
    return wx.getStorageSync('currentFamilyId') || '';
  }

  static setCurrentFamilyId(familyId) {
    wx.setStorageSync('currentFamilyId', familyId);
  }

  static getCurrentFamily() {
    return wx.getStorageSync('currentFamily') || null;
  }

  static setCurrentFamily(family) {
    wx.setStorageSync('currentFamily', family);
    if (family && family.id) {
      this.setCurrentFamilyId(family.id);
    }
  }

  static clearCurrentFamily() {
    wx.removeStorageSync('currentFamilyId');
    wx.removeStorageSync('currentFamily');
  }

  static isAdmin() {
    const family = this.getCurrentFamily();
    return family ? family.role === 'admin' : false;
  }
}

// 缓存管理
class CacheManager {
  // 缓存键前缀
  static CACHE_PREFIX = 'medicine_cache_';
  // 缓存过期时间（毫秒）
  static CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟

  // 设置缓存
  static setCache(key, data) {
    const cacheData = {
      data: data,
      timestamp: Date.now()
    };
    wx.setStorageSync(`${this.CACHE_PREFIX}${key}`, cacheData);
  }

  // 获取缓存
  static getCache(key) {
    const cacheData = wx.getStorageSync(`${this.CACHE_PREFIX}${key}`);
    if (!cacheData) return null;

    // 检查缓存是否过期
    if (Date.now() - cacheData.timestamp > this.CACHE_EXPIRY) {
      this.removeCache(key);
      return null;
    }

    return cacheData.data;
  }

  // 移除缓存
  static removeCache(key) {
    wx.removeStorageSync(`${this.CACHE_PREFIX}${key}`);
  }

  // 清除所有缓存
  static clearCache() {
    const keys = wx.getStorageInfoSync().keys;
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        wx.removeStorageSync(key);
      }
    });
  }

  // 清除与特定家庭相关的缓存
  static clearFamilyCache(familyId) {
    const keys = wx.getStorageInfoSync().keys;
    keys.forEach(key => {
      if (key.startsWith(`${this.CACHE_PREFIX}${familyId}_`)) {
        wx.removeStorageSync(key);
      }
    });
  }
}

// 用户信息管理
class UserManager {
  static getUserInfo() {
    return wx.getStorageSync('userInfo') || null;
  }

  static setUserInfo(userInfo) {
    wx.setStorageSync('userInfo', userInfo);
  }

  static clearUserInfo() {
    wx.removeStorageSync('userInfo');
  }
}

class DataManager {
  // 登录状态管理
  static getCurrentMode() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn') || false;
    const token = TokenManager.getToken();
    // 如果有token，即使isLoggedIn为false，也应该视为已登录
    const actualLoggedIn = isLoggedIn || !!token;
    return {
      isLoggedIn: actualLoggedIn,
      isGuestMode: !actualLoggedIn,
      token: token
    };
  }

  static switchToGuestMode() {
    TokenManager.clearToken();
    FamilyManager.clearCurrentFamily();
    UserManager.clearUserInfo();
    wx.setStorageSync('isLoggedIn', false);
  }

  static switchToLoginMode(token, userInfo) {
    if (token) {
      TokenManager.setToken(token);
    }
    FamilyManager.clearCurrentFamily();
    if (userInfo) {
      UserManager.setUserInfo(userInfo);
    }
    wx.setStorageSync('isLoggedIn', true);
  }

  // HTTP请求封装
  static request(url, method = 'GET', data = {}, needAuth = true) {
    return new Promise((resolve, reject) => {
      const mode = this.getCurrentMode();
      const isLoggedIn = mode.isLoggedIn;
      
      console.log('开始请求:', { url, method, data, needAuth, isLoggedIn });
      
      // 如果未登录且需要认证，返回错误
      if (!isLoggedIn && needAuth) {
        console.error('请求失败：未登录');
        reject(new Error('未登录'));
        return;
      }

      const header = {
        'Content-Type': 'application/json'
      };

      // 添加认证token
      if (needAuth) {
        const token = mode.token;
        if (token) {
          header['Authorization'] = `Bearer ${token}`;
          console.log('添加认证token:', token);
        }
      }

      // 添加家庭ID（如果需要）
      const excludePaths = ['/auth/', '/families/'];
      const needFamilyId = needAuth && !excludePaths.some(path => url.includes(path));
      
      if (needFamilyId) {
        const familyId = FamilyManager.getCurrentFamilyId();
        if (familyId) {
          header['X-Family-Id'] = familyId.toString();
          console.log('添加家庭ID:', familyId);
        } else {
          // 如果需要家庭ID但没有选择家庭，返回错误
          console.error('请求失败：请先选择家庭');
          reject(new Error('请先选择家庭'));
          return;
        }
      }

      const requestUrl = `${API_BASE_URL}${url}`;
      console.log('请求URL:', requestUrl);
      console.log('请求头:', header);

      wx.request({
        url: requestUrl,
        method,
        data,
        header,
        success: (res) => {
          console.log('请求成功，状态码:', res.statusCode);
          console.log('响应数据:', res.data);
          if (res.statusCode === 200) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // 检查是否使用的是模拟token
            const token = mode.token;
            if (token && token.startsWith('mock_token_')) {
              // 如果是模拟token，不清除登录状态，而是使用模拟数据
              console.log('模拟token被服务器拒绝，继续使用模拟数据');
              reject(new Error('模拟token被服务器拒绝，继续使用模拟数据'));
            } else {
              // 真实token过期或无效
              wx.showToast({
                title: '登录已过期',
                icon: 'none'
              });
              this.switchToGuestMode();
              setTimeout(() => {
                wx.redirectTo({
                  url: '/pages/login/login'
                });
              }, 1500);
              reject(res);
            }
          } else {
            const errorMessage = res.data.message || '操作失败';
            console.error('请求失败，错误信息:', errorMessage);
            // 登录相关的请求不显示错误提示
            if (!url.includes('/auth/')) {
              wx.showToast({
                title: errorMessage,
                icon: 'none'
              });
            }
            reject(new Error(errorMessage));
          }
        },
        fail: (err) => {
          console.error('请求失败，网络错误:', err);
          const errorMessage = '网络连接失败，请检查网络设置后重试';
          // 登录相关的请求不显示错误提示
          if (!url.includes('/auth/')) {
            wx.showToast({
              title: errorMessage,
              icon: 'none'
            });
          }
          reject(new Error(errorMessage));
        }
      });
    });
  }

  // 获取示例数据
  static getMockData(url) {
    // 药品列表示例数据
    if (url === '/medicine/list') {
      return {
        code: 0,
        message: 'success',
        data: [
          {
            id: 5001,
            name: '阿莫西林胶囊',
            manufacturer: '华北制药',
            specification: '0.25g*24粒',
            dosage: '每次2粒，每日3次，饭后服用',
            stock: 10,
            unit: '盒',
            expiryDate: '2026-06-30',
            category: '抗生素',
            status: 'normal',
            note: '请遵医嘱服用',
            createdAt: '2025-11-15',
            updatedAt: '2025-11-15'
          },
          {
            id: 5002,
            name: '布洛芬缓释胶囊',
            manufacturer: '中美天津史克',
            specification: '0.3g*12粒',
            dosage: '每次1粒，每日2次，疼痛时服用',
            stock: 5,
            unit: '盒',
            expiryDate: '2026-04-30',
            category: '止痛药',
            status: 'normal',
            note: '孕妇禁用',
            createdAt: '2025-12-10',
            updatedAt: '2025-12-10'
          },
          {
            id: 5003,
            name: '盐酸伐地那非片',
            manufacturer: '辉瑞制药',
            specification: '20mg*1片',
            dosage: '每次1片，按需服用，性生活前30分钟服用',
            stock: 3,
            unit: '盒',
            expiryDate: '2026-03-31',
            category: '男科用药',
            status: 'warning',
            note: '请勿与硝酸酯类药物同时服用，即将过期',
            createdAt: '2026-01-05',
            updatedAt: '2026-01-05'
          },
          {
            id: 5004,
            name: '感冒清热颗粒',
            manufacturer: '北京同仁堂',
            specification: '10g*10袋',
            dosage: '每次1袋，每日3次，开水冲服',
            stock: 2,
            unit: '盒',
            expiryDate: '2026-05-31',
            category: '感冒药',
            status: 'normal',
            note: '风寒感冒适用，库存不足',
            createdAt: '2026-02-10',
            updatedAt: '2026-02-10'
          },
          {
            id: 5005,
            name: '维生素C片',
            manufacturer: '华北制药',
            specification: '0.1g*100片',
            dosage: '每次1片，每日1次，口服',
            stock: 20,
            unit: '瓶',
            expiryDate: '2026-07-31',
            category: '维生素',
            status: 'normal',
            note: '补充维生素C',
            createdAt: '2026-03-01',
            updatedAt: '2026-03-01'
          },
          {
            id: 5006,
            name: '创可贴',
            manufacturer: '云南白药',
            specification: '100片/盒',
            dosage: '按需使用，外用',
            stock: 50,
            unit: '盒',
            expiryDate: '2026-02-28',
            category: '医疗器械',
            status: 'expired',
            note: '用于小伤口止血，已过期',
            createdAt: '2025-10-15',
            updatedAt: '2025-10-15'
          },
          {
            id: 5007,
            name: '板蓝根颗粒',
            manufacturer: '白云山',
            specification: '10g*20袋',
            dosage: '每次1袋，每日3次，开水冲服',
            stock: 8,
            unit: '盒',
            expiryDate: '2026-08-31',
            category: '感冒药',
            status: 'normal',
            note: '清热解毒',
            createdAt: '2026-03-10',
            updatedAt: '2026-03-10'
          },
          {
            id: 5008,
            name: '对乙酰氨基酚片',
            manufacturer: '上海强生',
            specification: '0.5g*24片',
            dosage: '每次1片，每日3次，发热时服用',
            stock: 15,
            unit: '盒',
            expiryDate: '2026-03-20',
            category: '解热镇痛',
            status: 'normal',
            note: '发热时服用',
            createdAt: '2026-03-10',
            updatedAt: '2026-03-10'
          },
          {
            id: 5009,
            name: '头孢拉定胶囊',
            manufacturer: '哈药集团',
            specification: '0.25g*24粒',
            dosage: '每次2粒，每日3次，饭后服用',
            stock: 5,
            unit: '盒',
            expiryDate: '2026-03-18',
            category: '抗生素',
            status: 'normal',
            note: '抗生素类药物',
            createdAt: '2026-03-10',
            updatedAt: '2026-03-10'
          }
        ]
      };
    }
    
    // 用药计划示例数据
    if (url === '/plan/list') {
      // 使用固定日期2026-03-17，与系统显示的日期一致
      const todayStr = '2026-03-17';
      
      // 5天后
      const fiveDaysLaterStr = '2026-03-22';
      
      // 10天后
      const tenDaysLaterStr = '2026-03-27';
      
      // 10天前
      const tenDaysAgoStr = '2026-03-07';
      
      // 5天前
      const fiveDaysAgoStr = '2026-03-12';
      
      // 15天前
      const fifteenDaysAgoStr = '2026-03-02';
      
      // 10天前
      const tenDaysAgo2Str = '2026-03-07';
      
      // 5天前
      const fiveDaysAgo2Str = '2026-03-12';
      
      // 15天前
      const fifteenDaysAgo2Str = '2026-03-02';
      
      // 10天前
      const tenDaysAgo3Str = '2026-03-07';
      
      return {
        code: 0,
        message: 'success',
        data: [
          {
            id: 6001,
            medicineId: 5001,
            medicineName: '阿莫西林胶囊',
            memberId: 4001,
            memberName: '我',
            frequency: '每日3次',
            timeSlots: ['08:00', '12:00', '18:00'],
            startDate: todayStr,
            endDate: fiveDaysLaterStr,
            status: 'active',
            note: '饭后服用，短期治疗',
            createdAt: todayStr,
            updatedAt: todayStr
          },
          {
            id: 6002,
            medicineId: 5005,
            medicineName: '维生素C片',
            memberId: 4001,
            memberName: '我',
            frequency: '每日1次',
            timeSlots: ['08:30'],
            startDate: tenDaysAgoStr,
            endDate: tenDaysLaterStr,
            status: 'active',
            note: '早餐后服用，短期补充',
            createdAt: tenDaysAgoStr,
            updatedAt: tenDaysAgoStr
          },
          {
            id: 6003,
            medicineId: 5007,
            medicineName: '板蓝根颗粒',
            memberId: 4002,
            memberName: '家人',
            frequency: '每日2次',
            timeSlots: ['09:00', '18:00'],
            startDate: fifteenDaysAgoStr,
            endDate: tenDaysAgoStr,
            status: 'completed',
            note: '预防感冒',
            createdAt: fifteenDaysAgoStr,
            updatedAt: tenDaysAgoStr
          },
          {
            id: 6004,
            medicineId: 5004,
            medicineName: '感冒清热颗粒',
            memberId: 4002,
            memberName: '家人',
            frequency: '每日3次',
            timeSlots: ['08:00', '12:00', '18:00'],
            startDate: tenDaysAgo2Str,
            endDate: fiveDaysAgo2Str,
            status: 'completed',
            note: '感冒治疗',
            createdAt: tenDaysAgo2Str,
            updatedAt: fiveDaysAgo2Str
          },
          {
            id: 6005,
            medicineId: 5002,
            medicineName: '布洛芬缓释胶囊',
            memberId: 4001,
            memberName: '我',
            frequency: '每日2次',
            timeSlots: ['09:00', '20:00'],
            startDate: fifteenDaysAgo2Str,
            endDate: tenDaysAgo3Str,
            status: 'completed',
            note: '疼痛时服用',
            createdAt: fifteenDaysAgo2Str,
            updatedAt: tenDaysAgo3Str
          }
        ]
      };
    }
    
    // 家庭成员示例数据
    if (url === '/family/list') {
      return {
        code: 0,
        message: 'success',
        data: [
          {
            id: 4001,
            name: '张三',
            relationship: '本人',
            age: 35,
            gender: '男',
            note: '健康状况良好',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          },
          {
            id: 4002,
            name: '李四',
            relationship: '配偶',
            age: 33,
            gender: '女',
            note: '有轻微过敏史',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          },
          {
            id: 4003,
            name: '张小明',
            relationship: '子女',
            age: 10,
            gender: '男',
            note: '小学生，活泼好动',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          },
          {
            id: 4004,
            name: '张父',
            relationship: '父亲',
            age: 60,
            gender: '男',
            note: '高血压患者，需要长期服药',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          },
          {
            id: 4005,
            name: '张母',
            relationship: '母亲',
            age: 58,
            gender: '女',
            note: '糖尿病患者，需要控制饮食',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          }
        ]
      };
    }
    
    // 用药记录示例数据
    if (url.includes('/records')) {
      // 使用固定日期2026-03-17，与系统显示的日期一致
      const todayStr = '2026-03-17';
      const yesterdayStr = '2026-03-16';
      const twoDaysAgoStr = '2026-03-15';
      const threeDaysAgoStr = '2026-03-14';
      const fourDaysAgoStr = '2026-03-13';
      const fiveDaysAgoStr = '2026-03-12';
      const sixDaysAgoStr = '2026-03-11';
      const sevenDaysAgoStr = '2026-03-10';
      const eightDaysAgoStr = '2026-03-09';
      const nineDaysAgoStr = '2026-03-08';
      const tenDaysAgoStr = '2026-03-07';
      const elevenDaysAgoStr = '2026-03-06';
      const twelveDaysAgoStr = '2026-03-05';
      
      return {
        code: 0,
        message: 'success',
        data: [
          // 今天的记录
          {
            id: 7001,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '08:00',
            date: todayStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-17T08:00:00Z',
            updatedAt: '2026-03-17T08:00:00Z'
          },
          {
            id: 7002,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '12:00',
            date: todayStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-17T12:00:00Z',
            updatedAt: '2026-03-17T12:00:00Z'
          },
          {
            id: 7003,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '18:00',
            date: todayStr,
            status: 'pending',
            supplement: '晚餐后服用',
            createdAt: '2026-03-17T00:00:00Z',
            updatedAt: '2026-03-17T00:00:00Z'
          },
          {
            id: 7004,
            planId: 6002,
            medicineName: '维生素C片',
            memberName: '我',
            time: '08:30',
            date: todayStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-17T08:30:00Z',
            updatedAt: '2026-03-17T08:30:00Z'
          },
          
          // 昨天的记录
          {
            id: 7005,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '08:00',
            date: yesterdayStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-16T08:00:00Z',
            updatedAt: '2026-03-16T08:00:00Z'
          },
          {
            id: 7006,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '12:00',
            date: yesterdayStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-16T12:00:00Z',
            updatedAt: '2026-03-16T12:00:00Z'
          },
          {
            id: 7007,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '18:00',
            date: yesterdayStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-16T18:00:00Z',
            updatedAt: '2026-03-16T18:00:00Z'
          },
          {
            id: 7008,
            planId: 6002,
            medicineName: '维生素C片',
            memberName: '我',
            time: '08:30',
            date: yesterdayStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-16T08:30:00Z',
            updatedAt: '2026-03-16T08:30:00Z'
          },
          
          // 前天的记录
          {
            id: 7009,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '08:00',
            date: twoDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-15T08:00:00Z',
            updatedAt: '2026-03-15T08:00:00Z'
          },
          {
            id: 7010,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '12:00',
            date: twoDaysAgoStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-15T12:00:00Z',
            updatedAt: '2026-03-15T12:00:00Z'
          },
          {
            id: 7011,
            planId: 6001,
            medicineName: '阿莫西林胶囊',
            memberName: '我',
            time: '18:00',
            date: twoDaysAgoStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-15T18:00:00Z',
            updatedAt: '2026-03-15T18:00:00Z'
          },
          {
            id: 7012,
            planId: 6002,
            medicineName: '维生素C片',
            memberName: '我',
            time: '08:30',
            date: twoDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-15T08:30:00Z',
            updatedAt: '2026-03-15T08:30:00Z'
          },
          
          // 感冒清热颗粒的记录（3月8日-12日）
          {
            id: 7013,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '08:00',
            date: fiveDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-12T08:00:00Z',
            updatedAt: '2026-03-12T08:00:00Z'
          },
          {
            id: 7014,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '12:00',
            date: fiveDaysAgoStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-12T12:00:00Z',
            updatedAt: '2026-03-12T12:00:00Z'
          },
          {
            id: 7015,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '18:00',
            date: fiveDaysAgoStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-12T18:00:00Z',
            updatedAt: '2026-03-12T18:00:00Z'
          },
          {
            id: 7016,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '08:00',
            date: sixDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-11T08:00:00Z',
            updatedAt: '2026-03-11T08:00:00Z'
          },
          {
            id: 7017,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '12:00',
            date: sixDaysAgoStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-11T12:00:00Z',
            updatedAt: '2026-03-11T12:00:00Z'
          },
          {
            id: 7018,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '18:00',
            date: sixDaysAgoStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-11T18:00:00Z',
            updatedAt: '2026-03-11T18:00:00Z'
          },
          {
            id: 7019,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '08:00',
            date: sevenDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-10T08:00:00Z',
            updatedAt: '2026-03-10T08:00:00Z'
          },
          {
            id: 7020,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '12:00',
            date: sevenDaysAgoStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-10T12:00:00Z',
            updatedAt: '2026-03-10T12:00:00Z'
          },
          {
            id: 7021,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '18:00',
            date: sevenDaysAgoStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-10T18:00:00Z',
            updatedAt: '2026-03-10T18:00:00Z'
          },
          {
            id: 7022,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '08:00',
            date: eightDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-09T08:00:00Z',
            updatedAt: '2026-03-09T08:00:00Z'
          },
          {
            id: 7023,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '12:00',
            date: eightDaysAgoStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-09T12:00:00Z',
            updatedAt: '2026-03-09T12:00:00Z'
          },
          {
            id: 7024,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '18:00',
            date: eightDaysAgoStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-09T18:00:00Z',
            updatedAt: '2026-03-09T18:00:00Z'
          },
          {
            id: 7025,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '08:00',
            date: nineDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-08T08:00:00Z',
            updatedAt: '2026-03-08T08:00:00Z'
          },
          {
            id: 7026,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '12:00',
            date: nineDaysAgoStr,
            status: 'completed',
            supplement: '午餐后服用',
            createdAt: '2026-03-08T12:00:00Z',
            updatedAt: '2026-03-08T12:00:00Z'
          },
          {
            id: 7027,
            planId: 6004,
            medicineName: '感冒清热颗粒',
            memberName: '家人',
            time: '18:00',
            date: nineDaysAgoStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-08T18:00:00Z',
            updatedAt: '2026-03-08T18:00:00Z'
          },
          
          // 板蓝根颗粒和布洛芬的记录（3月1日-5日）
          {
            id: 7028,
            planId: 6003,
            medicineName: '板蓝根颗粒',
            memberName: '家人',
            time: '09:00',
            date: twelveDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-05T09:00:00Z',
            updatedAt: '2026-03-05T09:00:00Z'
          },
          {
            id: 7029,
            planId: 6003,
            medicineName: '板蓝根颗粒',
            memberName: '家人',
            time: '18:00',
            date: twelveDaysAgoStr,
            status: 'completed',
            supplement: '晚餐后服用',
            createdAt: '2026-03-05T18:00:00Z',
            updatedAt: '2026-03-05T18:00:00Z'
          },
          {
            id: 7030,
            planId: 6005,
            medicineName: '布洛芬缓释胶囊',
            memberName: '我',
            time: '09:00',
            date: twelveDaysAgoStr,
            status: 'completed',
            supplement: '早餐后服用',
            createdAt: '2026-03-05T09:00:00Z',
            updatedAt: '2026-03-05T09:00:00Z'
          },
          {
            id: 7031,
            planId: 6005,
            medicineName: '布洛芬缓释胶囊',
            memberName: '我',
            time: '20:00',
            date: twelveDaysAgoStr,
            status: 'completed',
            supplement: '睡前服用',
            createdAt: '2026-03-05T20:00:00Z',
            updatedAt: '2026-03-05T20:00:00Z'
          }
        ]
      };
    }
    
    // 家庭列表示例数据
    if (url === '/families/my') {
      return {
        code: 0,
        message: 'success',
        data: [
          {
            id: 2001,
            name: '测试家庭',
            role: 'admin',
            creatorId: 1001,
            inviteCode: 'TEST1234',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          }
        ]
      };
    }
    
    // 家庭详情示例数据
    if (url.includes('/families/')) {
      return {
        code: 0,
        message: 'success',
        data: {
          id: 2001,
          name: '测试家庭',
          creatorId: 1001,
          inviteCode: 'TEST1234',
          createdAt: '2023-01-01',
          updatedAt: '2023-01-01',
          members: [
            {
              userId: 1001,
              nickname: '张三',
              role: 'admin',
              relationship: 'self'
            },
            {
              userId: 1002,
              nickname: '李四',
              role: 'member',
              relationship: 'spouse'
            }
          ]
        }
      };
    }
    
    // 通知设置示例数据
    if (url === '/notifications/settings') {
      return {
        code: 0,
        message: 'success',
        data: {
          medicineReminder: true,
          stockAlert: true,
          expiryAlert: true,
          dailySummary: true
        }
      };
    }
    
    // 订阅状态示例数据
    if (url === '/notifications/subscriptions') {
      return {
        code: 0,
        message: 'success',
        data: {
          medicineReminder: true,
          stockAlert: true,
          expiryAlert: true,
          dailySummary: true
        }
      };
    }
    
    // 关系规则示例数据
    if (url === '/families/relationship-rules') {
      return {
        code: 0,
        message: 'success',
        data: [
          '本人', '配偶', '子女', '父亲', '母亲', '祖父', '祖母', '外祖父', '外祖母', '兄弟姐妹'
        ]
      };
    }
    
    // 药品识别历史示例数据
    if (url.includes('/medicine/recognize/history')) {
      return {
        code: 0,
        message: 'success',
        data: [
          {
            id: 1,
            type: 'barcode',
            content: '6901234567890',
            result: '阿莫西林胶囊',
            createdAt: '2023-01-01T10:00:00Z'
          },
          {
            id: 2,
            type: 'image',
            content: 'https://example.com/image.jpg',
            result: '布洛芬缓释胶囊',
            createdAt: '2023-01-02T14:30:00Z'
          }
        ],
        total: 2,
        page: 1,
        limit: 20
      };
    }
    
    return null;
  }

  // ==================== 认证相关 ====================

  // 微信登录
  static async login(code, userInfo = null) {
    try {
      const res = await this.request('/auth/login', 'POST', { code, userInfo }, false);
      if (res.code === 0) {
        const { token, userId, hasFamily, families } = res.data;
        this.switchToLoginMode(token, { userId, ...(userInfo || {}) });

        // 如果有家庭，设置第一个为当前家庭
        if (hasFamily && families && families.length > 0) {
          FamilyManager.setCurrentFamily(families[0]);
        }

        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  static async loginByPhone(phone, password) {
    try {
      // 使用真实API登录
      const res = await this.request('/auth/login-by-phone', 'POST', { phone, password }, false);
      if (res.code === 0) {
        const { token, userId, hasFamily, families } = res.data;
        this.switchToLoginMode(token, { userId, phone });

        // 如果有家庭，设置第一个为当前家庭
        if (hasFamily && families && families.length > 0) {
          FamilyManager.setCurrentFamily(families[0]);
        }

        console.log('真实API登录成功，保存登录状态:', { isLoggedIn: true, token: token });
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('手机号登录失败:', error);
      throw error;
    }
  }

  static async loginByNickname(nickname, password) {
    try {
      console.log('开始昵称登录:', { nickname, password });
      // 使用真实API登录
      const res = await this.request('/auth/login-by-nickname', 'POST', { nickname, password }, false);
      console.log('登录API返回结果:', res);
      if (res.code === 0) {
        const { token, userId, hasFamily, families } = res.data;
        this.switchToLoginMode(token, { userId, nickname });

        // 如果有家庭，设置第一个为当前家庭
        if (hasFamily && families && families.length > 0) {
          FamilyManager.setCurrentFamily(families[0]);
        }

        // 登录成功后立即获取完整的用户信息，包括头像URL
        try {
          await this.getProfile();
          console.log('获取用户信息成功');
        } catch (profileError) {
          console.error('获取用户信息失败:', profileError);
        }

        console.log('真实API登录成功，保存登录状态:', { isLoggedIn: true, token: token });
        return res.data;
      }
      console.error('登录API返回错误:', res.message);
      throw new Error(res.message || '登录失败');
    } catch (error) {
      console.error('昵称登录失败:', error);
      throw error;
    }
  }

  // 获取用户信息
  static async getProfile() {
    try {
      const res = await this.request('/auth/profile', 'GET');
      if (res.code === 0) {
        // 处理头像 URL，确保保存的是完整的 URL
        let userData = res.data;
        if (userData.avatarUrl) {
          // 使用正确的服务器 IP 地址
          const serverBaseUrl = 'http://10.167.79.202:3001';
          // 直接构建完整的头像 URL，不管返回的是什么格式
          if (userData.avatarUrl.startsWith('http://') || userData.avatarUrl.startsWith('https://')) {
            // 已经是完整 URL，添加时间戳避免缓存
            userData.avatarUrl = userData.avatarUrl + (userData.avatarUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
          } else {
            // 相对路径，构建完整 URL
            const avatarPath = userData.avatarUrl.startsWith('/') ? userData.avatarUrl : '/' + userData.avatarUrl;
            userData.avatarUrl = serverBaseUrl + avatarPath + '?t=' + Date.now();
          }
        }
        
        UserManager.setUserInfo(userData);
        return userData;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  // 更新用户信息
  static async updateProfile(userInfo) {
    try {
      // 检查是否为游客模式
      const isGuestMode = this.getCurrentMode().isGuestMode;
      
      // 如果是游客模式，模拟更新用户信息成功
      if (isGuestMode) {
        const mockData = {
          code: 0,
          message: 'success',
          data: {
            ...userInfo,
            userId: '1001'
          }
        };
        
        UserManager.setUserInfo(mockData.data);
        return mockData.data;
      }
      
      // 实际更新请求
      const res = await this.request('/auth/profile', 'PUT', userInfo);
      if (res.code === 0) {
        // 处理头像 URL，确保保存的是完整的 URL
        let userData = res.data;
        if (userData.avatarUrl) {
          // 使用正确的服务器 IP 地址
          const serverBaseUrl = 'http://10.167.79.202:3001';
          // 直接构建完整的头像 URL，不管返回的是什么格式
          if (userData.avatarUrl.startsWith('http://') || userData.avatarUrl.startsWith('https://')) {
            // 已经是完整 URL，添加时间戳避免缓存
            userData.avatarUrl = userData.avatarUrl + (userData.avatarUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
          } else {
            // 相对路径，构建完整 URL
            const avatarPath = userData.avatarUrl.startsWith('/') ? userData.avatarUrl : '/' + userData.avatarUrl;
            userData.avatarUrl = serverBaseUrl + avatarPath + '?t=' + Date.now();
          }
        }
        
        UserManager.setUserInfo(userData);
        return userData;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  // ==================== 家庭管理 ====================

  // 获取我的家庭列表
  static async getMyFamilies() {
    try {
      const res = await this.request('/families/my', 'GET');
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取家庭列表失败:', error);
      throw error;
    }
  }

  // 创建家庭
  static async createFamily(name) {
    try {
      const res = await this.request('/families/create', 'POST', { name });
      if (res.code === 0) {
        // 自动设置为当前家庭
        FamilyManager.setCurrentFamily(res.data);
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('创建家庭失败:', error);
      throw error;
    }
  }

  // 加入家庭
  static async joinFamily(inviteCode) {
    try {
      const res = await this.request('/families/join', 'POST', { inviteCode });
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('加入家庭失败:', error);
      throw error;
    }
  }

  // 获取家庭详情
  static async getFamilyDetail(familyId) {
    try {
      const res = await this.request(`/families/${familyId}`, 'GET');
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取家庭详情失败:', error);
      throw error;
    }
  }

  // 更新家庭信息
  static async updateFamily(familyId, data) {
    try {
      const res = await this.request(`/families/${familyId}`, 'PUT', data);
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('更新家庭信息失败:', error);
      throw error;
    }
  }

  // 获取家庭成员列表
  static async getFamilyMembers(familyId) {
    try {
      const res = await this.request(`/families/${familyId}/members`, 'GET');
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取家庭成员失败:', error);
      throw error;
    }
  }

  // 生成邀请码
  static async generateInviteCode(familyId) {
    try {
      const res = await this.request(`/families/${familyId}/invite`, 'POST');
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('生成邀请码失败:', error);
      throw error;
    }
  }

  // 修改成员角色
  static async updateMemberRole(familyId, userId, role) {
    try {
      const res = await this.request(`/families/${familyId}/members/${userId}/role`, 'PUT', { role });
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('修改成员角色失败:', error);
      throw error;
    }
  }

  // 移除成员
  static async removeMember(familyId, userId) {
    try {
      const res = await this.request(`/families/${familyId}/members/${userId}`, 'DELETE');
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('移除成员失败:', error);
      throw error;
    }
  }

  // 退出家庭
  static async leaveFamily(familyId) {
    try {
      const res = await this.request(`/families/${familyId}/leave`, 'POST');
      if (res.code === 0) {
        // 如果退出的是当前家庭，清除当前家庭
        if (FamilyManager.getCurrentFamilyId() === familyId) {
          FamilyManager.clearCurrentFamily();
        }
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('退出家庭失败:', error);
      throw error;
    }
  }

  // 删除家庭
  static async deleteFamily(familyId) {
    try {
      const res = await this.request(`/families/${familyId}`, 'DELETE');
      if (res.code === 0) {
        // 如果删除的是当前家庭，清除当前家庭
        if (FamilyManager.getCurrentFamilyId() === familyId) {
          FamilyManager.clearCurrentFamily();
        }
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('删除家庭失败:', error);
      throw error;
    }
  }

  // 通过手机号添加家庭成员
  static async addFamilyMemberByPhone(familyId, phone, relationship) {
    try {
      const res = await this.request(`/families/${familyId}/members/add-by-phone`, 'POST', {
        phone,
        relationship
      });
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('添加家庭成员失败:', error);
      throw error;
    }
  }

  // 获取关系规则列表
  static async getRelationshipRules() {
    try {
      const res = await this.request('/families/relationship-rules', 'GET');
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取关系规则失败:', error);
      throw error;
    }
  }

  // 更新成员关系
  static async updateMemberRelationship(familyId, userId, relationship) {
    try {
      const res = await this.request(`/families/${familyId}/members/${userId}/relationship`, 'PUT', {
        relationship
      });
      if (res.code === 0) {
        return res.data;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('更新成员关系失败:', error);
      throw error;
    }
  }

  // ==================== 药品管理 ====================

  static async getMedicines() {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：从本地存储读取数据
        const savedMedicines = wx.getStorageSync('guest_medicines') || [];
        if (savedMedicines.length > 0) {
          return {
            code: 0,
            message: 'success',
            data: savedMedicines
          };
        } else {
          // 如果没有保存的数据，返回默认模拟数据
          return this.getMockData('/medicine/list');
        }
      }

      // 登录模式：从API获取数据
      // 尝试从缓存获取
      const familyId = FamilyManager.getCurrentFamilyId();
      const cacheKey = familyId ? `${familyId}_medicines` : 'guest_medicines';
      const cachedData = CacheManager.getCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      try {
        const res = await this.request('/medicine/list', 'GET');
        if (res.code === 0) {
          // 缓存数据
          CacheManager.setCache(cacheKey, res);
          return res;
        }
        throw new Error(res.message);
      } catch (apiError) {
        console.error('API获取药品列表失败，使用模拟数据:', apiError);
        // 登录模式下API请求失败，也返回模拟数据
        return this.getMockData('/medicine/list');
      }
    } catch (error) {
      console.error('获取药品列表失败:', error);
      // 任何情况下失败，都返回模拟数据
      return this.getMockData('/medicine/list');
    }
  }

  static async addMedicine(medicine) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：保存到本地存储
        const savedMedicines = wx.getStorageSync('guest_medicines') || [];
        const newMedicine = {
          ...medicine,
          id: `medicine_${Date.now()}`,
          status: 'normal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        savedMedicines.push(newMedicine);
        wx.setStorageSync('guest_medicines', savedMedicines);
        return {
          code: 0,
          message: 'success',
          data: newMedicine
        };
      }

      // 登录模式：调用API
      const res = await this.request('/medicine/add', 'POST', medicine);
      if (res.code === 0) {
        // 清除缓存
        const familyId = FamilyManager.getCurrentFamilyId();
        const cacheKey = familyId ? `${familyId}_medicines` : 'guest_medicines';
        CacheManager.removeCache(cacheKey);
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('添加药品失败:', error);
      throw error;
    }
  }

  static async updateMedicine(id, medicine) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：更新本地存储
        const savedMedicines = wx.getStorageSync('guest_medicines') || [];
        const index = savedMedicines.findIndex(m => m.id === id);
        if (index >= 0) {
          savedMedicines[index] = {
            ...savedMedicines[index],
            ...medicine,
            updatedAt: new Date().toISOString()
          };
          wx.setStorageSync('guest_medicines', savedMedicines);
          return {
            code: 0,
            message: 'success',
            data: savedMedicines[index]
          };
        } else {
          throw new Error('药品不存在');
        }
      }

      // 登录模式：调用API
      const res = await this.request(`/medicine/update/${id}`, 'PUT', medicine);
      if (res.code === 0) {
        // 清除缓存
        const familyId = FamilyManager.getCurrentFamilyId();
        const cacheKey = familyId ? `${familyId}_medicines` : 'guest_medicines';
        CacheManager.removeCache(cacheKey);
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('更新药品失败:', error);
      throw error;
    }
  }

  static async deleteMedicine(id) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：从本地存储删除
        const savedMedicines = wx.getStorageSync('guest_medicines') || [];
        const filteredMedicines = savedMedicines.filter(m => m.id !== id);
        wx.setStorageSync('guest_medicines', filteredMedicines);
        return {
          code: 0,
          message: 'success'
        };
      }

      // 登录模式：调用API
      const res = await this.request(`/medicine/delete/${id}`, 'DELETE');
      if (res.code === 0) {
        // 清除缓存
        const familyId = FamilyManager.getCurrentFamilyId();
        const cacheKey = familyId ? `${familyId}_medicines` : 'guest_medicines';
        CacheManager.removeCache(cacheKey);
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('删除药品失败:', error);
      throw error;
    }
  }

  // ==================== 用药计划 ====================

  static async getPlans() {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：从本地存储读取数据
        const savedPlans = wx.getStorageSync('guest_plans') || [];
        if (savedPlans.length > 0) {
          return {
            code: 0,
            message: 'success',
            data: savedPlans
          };
        } else {
          // 如果没有保存的数据，返回默认模拟数据
          return this.getMockData('/plan/list');
        }
      }

      // 登录模式：从API获取数据
      // 尝试从缓存获取
      const familyId = FamilyManager.getCurrentFamilyId();
      const cacheKey = familyId ? `${familyId}_plans` : 'guest_plans';
      const cachedData = CacheManager.getCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      try {
        const res = await this.request('/plan/list', 'GET');
        if (res.code === 0) {
          // 缓存数据
          CacheManager.setCache(cacheKey, res);
          return res;
        }
        throw new Error(res.message);
      } catch (apiError) {
        console.error('API获取计划列表失败，使用模拟数据:', apiError);
        // 登录模式下API请求失败，也返回模拟数据
        return this.getMockData('/plan/list');
      }
    } catch (error) {
      console.error('获取计划列表失败:', error);
      // 任何情况下失败，都返回模拟数据
      return this.getMockData('/plan/list');
    }
  }

  static async addPlan(plan) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：保存到本地存储
        const savedPlans = wx.getStorageSync('guest_plans') || [];
        const newPlan = {
          ...plan,
          id: `plan_${Date.now()}`,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        savedPlans.push(newPlan);
        wx.setStorageSync('guest_plans', savedPlans);
        return {
          code: 0,
          message: 'success',
          data: newPlan
        };
      }

      // 登录模式：调用API
      const res = await this.request('/plan/create', 'POST', plan);
      if (res.code === 0) {
        // 清除缓存
        const familyId = FamilyManager.getCurrentFamilyId();
        const cacheKey = familyId ? `${familyId}_plans` : 'guest_plans';
        CacheManager.removeCache(cacheKey);
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('创建计划失败:', error);
      throw error;
    }
  }

  static async updatePlan(id, plan) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：更新本地存储
        const savedPlans = wx.getStorageSync('guest_plans') || [];
        const index = savedPlans.findIndex(p => p.id === id);
        if (index >= 0) {
          savedPlans[index] = {
            ...savedPlans[index],
            ...plan,
            updatedAt: new Date().toISOString()
          };
          wx.setStorageSync('guest_plans', savedPlans);
          return {
            code: 0,
            message: 'success',
            data: savedPlans[index]
          };
        } else {
          throw new Error('计划不存在');
        }
      }

      // 登录模式：调用API
      const res = await this.request(`/plan/update/${id}`, 'PUT', plan);
      if (res.code === 0) {
        // 清除缓存
        const familyId = FamilyManager.getCurrentFamilyId();
        const cacheKey = familyId ? `${familyId}_plans` : 'guest_plans';
        CacheManager.removeCache(cacheKey);
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('更新计划失败:', error);
      throw error;
    }
  }

  static async deletePlan(id) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：从本地存储删除
        const savedPlans = wx.getStorageSync('guest_plans') || [];
        const filteredPlans = savedPlans.filter(p => p.id !== id);
        wx.setStorageSync('guest_plans', filteredPlans);
        return {
          code: 0,
          message: 'success'
        };
      }

      // 登录模式：调用API
      const res = await this.request(`/plan/delete/${id}`, 'DELETE');
      if (res.code === 0) {
        // 清除缓存
        const familyId = FamilyManager.getCurrentFamilyId();
        const cacheKey = familyId ? `${familyId}_plans` : 'guest_plans';
        CacheManager.removeCache(cacheKey);
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('删除计划失败:', error);
      throw error;
    }
  }

  // ==================== 家庭成员信息 ====================

  static async getFamilyMembersList() {
    try {
      const res = await this.request('/family/list', 'GET');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取家庭成员列表失败:', error);
      throw error;
    }
  }

  static async addFamilyMember(member) {
    try {
      const res = await this.request('/family/add', 'POST', member);
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('添加家庭成员失败:', error);
      throw error;
    }
  }

  static async updateFamilyMember(id, member) {
    try {
      const res = await this.request(`/family/update/${id}`, 'PUT', member);
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('更新家庭成员失败:', error);
      throw error;
    }
  }

  static async deleteFamilyMember(id) {
    try {
      const res = await this.request(`/family/delete/${id}`, 'DELETE');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('删除家庭成员失败:', error);
      throw error;
    }
  }

  // ==================== 用药记录 ====================

  static async getRecords(date) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：从本地存储读取数据
        const savedRecords = wx.getStorageSync('guest_records') || [];
        let filteredRecords = savedRecords;
        
        // 如果没有保存的数据，使用模拟数据
        if (savedRecords.length === 0) {
          const mockData = this.getMockData('/records');
          filteredRecords = mockData ? mockData.data : [];
        }
        
        // 如果指定了日期，过滤记录
        if (date) {
          filteredRecords = filteredRecords.filter(record => record.date === date);
        }
        
        return {
          code: 0,
          message: 'success',
          data: filteredRecords
        };
      }

      // 登录模式：调用API
      try {
        const url = date ? `/records?date=${date}` : '/records';
        const res = await this.request(url, 'GET');
        if (res.code === 0) {
          return res;
        }
        throw new Error(res.message);
      } catch (apiError) {
        console.error('API获取记录失败，使用模拟数据:', apiError);
        // 登录模式下API请求失败，也返回模拟数据
        const mockData = this.getMockData('/records');
        const mockRecords = mockData ? mockData.data : [];
        if (date) {
          return {
            code: 0,
            message: 'success',
            data: mockRecords.filter(record => record.date === date)
          };
        }
        return {
          code: 0,
          message: 'success',
          data: mockRecords
        };
      }
    } catch (error) {
      console.error('获取记录失败:', error);
      // 任何情况下失败，都返回模拟数据
      const mockData = this.getMockData('/records');
      const mockRecords = mockData ? mockData.data : [];
      if (date) {
        return {
          code: 0,
          message: 'success',
          data: mockRecords.filter(record => record.date === date)
        };
      }
      return {
        code: 0,
        message: 'success',
        data: mockRecords
      };
    }
  }

  // 获取日期范围内的记录
  static async getRecordsByRange(startDate, endDate) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：使用模拟数据
        const mockData = this.getMockData('/records');
        const mockRecords = mockData ? mockData.data : [];
        
        // 过滤日期范围
        const filteredRecords = mockRecords.filter(record => {
          return record.date >= startDate && record.date <= endDate;
        });
        return {
          code: 0,
          message: 'success',
          data: filteredRecords
        };
      }

      // 登录模式：调用API
      try {
        const res = await this.request('/records', 'GET');
        if (res.code === 0) {
          // 在客户端过滤日期范围
          const filteredRecords = res.data.filter(record => {
            return record.date >= startDate && record.date <= endDate;
          });
          return {
            code: 0,
            message: 'success',
            data: filteredRecords
          };
        }
        throw new Error(res.message);
      } catch (apiError) {
        console.error('API获取记录失败，使用模拟数据:', apiError);
        // 登录模式下API请求失败，也返回模拟数据
        const mockData = this.getMockData('/records');
        const mockRecords = mockData ? mockData.data : [];
        const filteredRecords = mockRecords.filter(record => {
          return record.date >= startDate && record.date <= endDate;
        });
        return {
          code: 0,
          message: 'success',
          data: filteredRecords
        };
      }
    } catch (error) {
      console.error('获取记录失败:', error);
      // 任何情况下失败，都返回模拟数据
      const mockData = this.getMockData('/records');
      const mockRecords = mockData ? mockData.data : [];
      const filteredRecords = mockRecords.filter(record => {
        return record.date >= startDate && record.date <= endDate;
      });
      return {
        code: 0,
        message: 'success',
        data: filteredRecords
      };
    }
  }

  static async completeRecord(id) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：更新本地存储
        const savedRecords = wx.getStorageSync('guest_records') || [];
        const index = savedRecords.findIndex(r => r.id === id);
        if (index >= 0) {
          savedRecords[index] = {
            ...savedRecords[index],
            status: 'completed',
            updatedAt: new Date().toISOString()
          };
          wx.setStorageSync('guest_records', savedRecords);
          return {
            code: 0,
            message: 'success',
            data: savedRecords[index]
          };
        } else {
          throw new Error('记录不存在');
        }
      }

      // 登录模式：调用API
      const res = await this.request(`/records/complete/${id}`, 'POST');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('完成记录失败:', error);
      throw error;
    }
  }

  static async missRecord(id) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：更新本地存储
        const savedRecords = wx.getStorageSync('guest_records') || [];
        const index = savedRecords.findIndex(r => r.id === id);
        if (index >= 0) {
          savedRecords[index] = {
            ...savedRecords[index],
            status: 'missed',
            updatedAt: new Date().toISOString()
          };
          wx.setStorageSync('guest_records', savedRecords);
          return {
            code: 0,
            message: 'success',
            data: savedRecords[index]
          };
        } else {
          throw new Error('记录不存在');
        }
      }

      // 登录模式：调用API
      const res = await this.request(`/records/miss/${id}`, 'POST');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('标记错过失败:', error);
      throw error;
    }
  }

  static async addRecord(record) {
    try {
      // 检查是否为游客模式
      const mode = this.getCurrentMode();
      if (mode.isGuestMode) {
        // 游客模式：保存到本地存储
        const savedRecords = wx.getStorageSync('guest_records') || [];
        const newRecord = {
          ...record,
          id: `record_${Date.now()}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        savedRecords.push(newRecord);
        wx.setStorageSync('guest_records', savedRecords);
        return {
          code: 0,
          message: 'success',
          data: newRecord
        };
      }

      // 登录模式：调用API
      const res = await this.request('/records/add', 'POST', record);
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('添加记录失败:', error);
      throw error;
    }
  }

  // 创建或更新用药记录
  static async createOrUpdateRecord(planId, date, timeSlot, status, supplement = '') {
    try {
      // 先查询是否已存在记录
      const recordsRes = await this.getRecords(date);
      const existingRecord = recordsRes.data.find(r => 
        r.planId === planId && r.time === timeSlot
      );

      if (existingRecord) {
        // 更新现有记录
        if (status === 'completed') {
          return await this.completeRecord(existingRecord.id);
        } else if (status === 'missed') {
          return await this.missRecord(existingRecord.id);
        }
      } else {
        // 创建新记录
        const plansRes = await this.getPlans();
        const plan = plansRes.data.find(p => p.id === planId);
        
        if (!plan) {
          throw new Error('计划不存在');
        }

        const record = {
          planId: planId,
          medicineName: plan.medicineName,
          memberName: plan.memberName,
          time: timeSlot,
          date: date
        };

        const addRes = await this.addRecord(record);
        
        // 创建后立即更新状态
        if (status === 'completed') {
          return await this.completeRecord(addRes.data.id);
        } else if (status === 'missed') {
          return await this.missRecord(addRes.data.id);
        }
        
        return addRes;
      }
    } catch (error) {
      console.error('创建或更新记录失败:', error);
      throw error;
    }
  }

  // ==================== 通知管理 ====================

  // 订阅通知
  static async subscribeNotification(templateType) {
    try {
      const res = await this.request('/notifications/subscribe', 'POST', {
        templateType
      });
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('订阅通知失败:', error);
      throw error;
    }
  }

  // 取消订阅
  static async unsubscribeNotification(templateType) {
    try {
      const res = await this.request(`/notifications/unsubscribe/${templateType}`, 'DELETE');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('取消订阅失败:', error);
      throw error;
    }
  }

  // 获取订阅状态
  static async getSubscriptions() {
    try {
      const res = await this.request('/notifications/subscriptions', 'GET');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取订阅状态失败:', error);
      throw error;
    }
  }

  // 保存通知设置
  static async saveNotificationSettings(settings) {
    try {
      const res = await this.request('/notifications/settings', 'POST', settings);
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('保存通知设置失败:', error);
      throw error;
    }
  }

  // 获取通知设置
  static async getNotificationSettings() {
    try {
      const res = await this.request('/notifications/settings', 'GET');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取通知设置失败:', error);
      throw error;
    }
  }

  // ==================== 药品识别 ====================

  // 条形码识别
  static async recognizeBarcode(barcode) {
    try {
      const res = await this.request('/medicine/recognize/barcode', 'POST', { barcode });
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('条形码识别失败:', error);
      throw error;
    }
  }

  // 图片识别（使用 wx.uploadFile）
  static recognizeImage(imagePath) {
    return new Promise((resolve, reject) => {
      const token = TokenManager.getToken();
      const familyId = FamilyManager.getCurrentFamilyId();

      wx.uploadFile({
        url: `${API_BASE_URL}/medicine/recognize/image`,
        filePath: imagePath,
        name: 'image',
        header: {
          'Authorization': `Bearer ${token}`,
          'X-Family-Id': familyId
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data);
            } else {
              reject(new Error(data.message));
            }
          } catch (error) {
            reject(new Error('解析响应失败'));
          }
        },
        fail: (error) => {
          console.error('图片上传失败:', error);
          reject(error);
        }
      });
    });
  }

  // 获取识别历史
  static async getRecognitionHistory(page = 1, limit = 20) {
    try {
      const res = await this.request(`/medicine/recognize/history?page=${page}&limit=${limit}`, 'GET');
      if (res.code === 0) {
        return res;
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取识别历史失败:', error);
      throw error;
    }
  }

  // ==================== 工具方法 ====================

  // 拼接文件完整访问地址（用于头像等静态资源）
  static getFileUrl(path) {
    if (!path) return '';
    // 已经是完整 URL，直接返回
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    // 去掉 API 前缀中的 /api，得到服务根地址
    const base = API_BASE_URL.replace(/\/api\/?$/, '');
    if (path.startsWith('/')) {
      return `${base}${path}`;
    }
    return `${base}/${path}`;
  }

  // 检查是否为管理员
  static isAdmin() {
    return FamilyManager.isAdmin();
  }

  // 获取当前家庭信息
  static getCurrentFamily() {
    return FamilyManager.getCurrentFamily();
  }

  // 获取当前家庭ID
  static getCurrentFamilyId() {
    return FamilyManager.getCurrentFamilyId();
  }

  // 设置当前家庭
  static setCurrentFamily(family) {
    FamilyManager.setCurrentFamily(family);
  }

  // 清除所有游客数据
  static clearGuestData() {
    wx.removeStorageSync('guest_medicines');
    wx.removeStorageSync('guest_plans');
    wx.removeStorageSync('guest_records');
    // 清除相关缓存
    CacheManager.removeCache('guest_medicines');
    CacheManager.removeCache('guest_plans');
  }

  // ==================== 数据统计 ====================

  // 获取药品统计数据
  static async getMedicineStatistics() {
    try {
      const res = await this.getMedicines();
      if (res.code === 0) {
        const medicines = res.data;
        const total = medicines.length;
        const normal = medicines.filter(m => m.status === 'normal').length;
        const warning = medicines.filter(m => m.status === 'warning').length;
        const expired = medicines.filter(m => m.status === 'expired').length;

        // 计算过期趋势（最近5个时间点）
        const expiryTrend = this.calculateExpiryTrend(medicines);

        return {
          code: 0,
          message: 'success',
          data: {
            total,
            normal,
            warning,
            expired,
            expiryTrend
          }
        };
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取药品统计失败:', error);
      throw error;
    }
  }

  // 计算过期趋势
  static calculateExpiryTrend(medicines) {
    const now = new Date();
    const trendPoints = [];
    
    // 生成最近5个时间点（每3个月一个点）
    for (let i = 4; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      trendPoints.push({
        date: dateStr,
        count: 0
      });
    }

    // 统计每个时间点的过期药品数
    medicines.forEach(medicine => {
      const expiryDate = new Date(medicine.expiryDate);
      trendPoints.forEach(point => {
        const pointDate = new Date(point.date + '-01');
        if (expiryDate <= pointDate) {
          point.count++;
        }
      });
    });

    return trendPoints;
  }

  // 获取用药计划统计数据
  static async getPlanStatistics() {
    try {
      const res = await this.getPlans();
      if (res.code === 0) {
        const plans = res.data;
        const total = plans.length;
        const active = plans.filter(p => p.status === 'active').length;
        const completed = plans.filter(p => p.status === 'completed').length;

        // 计算计划趋势（最近5个时间点）
        const planTrend = this.calculatePlanTrend(plans);

        return {
          code: 0,
          message: 'success',
          data: {
            total,
            active,
            completed,
            planTrend
          }
        };
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取用药计划统计失败:', error);
      throw error;
    }
  }

  // 计算计划趋势
  static calculatePlanTrend(plans) {
    const now = new Date();
    const trendPoints = [];
    
    // 生成最近5个时间点（每3个月一个点）
    for (let i = 4; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      trendPoints.push({
        date: dateStr,
        count: 0
      });
    }

    // 统计每个时间点的计划数
    plans.forEach(plan => {
      const startDate = new Date(plan.startDate || plan.startTime);
      trendPoints.forEach(point => {
        const pointDate = new Date(point.date + '-01');
        if (startDate <= pointDate) {
          point.count++;
        }
      });
    });

    return trendPoints;
  }

  // 获取提醒记录统计数据
  static async getReminderStatistics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await this.getRecords(today);
      
      if (res.code === 0) {
        const todayRecords = res.data;
        const todayTotal = todayRecords.length;
        const completed = todayRecords.filter(r => r.status === 'completed').length;
        const missed = todayRecords.filter(r => r.status === 'missed').length;

        // 获取提醒总数（所有记录）
        const allRes = await this.getRecords();
        const totalReminders = allRes.code === 0 ? allRes.data.length : 0;

        return {
          code: 0,
          message: 'success',
          data: {
            todayTotal,
            completed,
            missed,
            totalReminders
          }
        };
      }
      throw new Error(res.message);
    } catch (error) {
      console.error('获取提醒记录统计失败:', error);
      throw error;
    }
  }
}

module.exports = DataManager;
