const DataManager = require('../../utils/dataManager');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isAdmin: false,
    isSeniorMode: false,
    seniorTheme: 'white',
    loading: false,
    statusBarHeight: 0,
    
    medicines: [],
    searchKeyword: '',
    
    showAddDialog: false,
    editingMedicine: null,
    showDatePicker: false,
    datePickerType: 'start',
    selectedDate: '',
    
    formData: {
      name: '',
      manufacturer: '',
      specification: '',
      barcode: '',
      category: '抗生素',
      stock: 1,
      unit: '盒',
      expiryDate: '',
      dosage: ''
    },
    
    categories: [
      { label: '抗生素', value: '抗生素' },
      { label: '解热镇痛', value: '解热镇痛' },
      { label: '感冒用药', value: '感冒用药' },
      { label: '维生素', value: '维生素' },
      { label: '止咳化痰', value: '止咳化痰' }
    ],
    
    currentDate: new Date().getTime(),
    minDate: new Date().getTime(), // 今天
    maxDate: new Date().getTime() + 10 * 365 * 24 * 60 * 60 * 1000 // 10年后
  },

  onLoad: function(options) {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.loadMedicines();
    this.handleScanParams(options);
    this.updateTabBar();
  },

  handleScanParams: function(options) {
    if (options && options.scan === 'true') {
      const formData = {
        name: options.name || '',
        manufacturer: options.manufacturer || '',
        specification: options.specification || '',
        category: options.category || '抗生素',
        dosage: options.dosage || '',
        expiryDate: options.expiryDate || '',
        stock: 1,
        unit: '盒',
        barcode: ''
      };
      
      this.setData({
        showAddDialog: true,
        editingMedicine: null,
        formData: formData
      });
    }
  },

  onShow: function() {
    this.checkLoginStatus();
    this.loadMedicines();
    this.updateTabBar();
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    const isAdmin = DataManager.isAdmin();
    this.setData({
      isLoggedIn: mode.isLoggedIn,
      isGuestMode: mode.isGuestMode,
      isAdmin: isAdmin
    });
  },

  getSystemInfo: function() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          statusBarHeight: res.statusBarHeight
        });
      }
    });
  },

  updateTabBar: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
      this.getTabBar().updateTabBar();
    }
  },

  loadMedicines: function() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    DataManager.getMedicines().then(res => {
      wx.hideLoading();
      let medicines = res.data;
      
      // 根据搜索关键词过滤药品
      const keyword = this.data.searchKeyword.trim();
      if (keyword) {
        medicines = medicines.filter(medicine => 
          medicine.name.toLowerCase().includes(keyword.toLowerCase()) ||
          medicine.manufacturer.toLowerCase().includes(keyword.toLowerCase()) ||
          medicine.category.toLowerCase().includes(keyword.toLowerCase())
        );
      }
      
      // 计算每个药品的临期程度并设置标签颜色
      const currentDate = new Date();
      medicines = medicines.map(medicine => {
        let statusColor = 'success'; // 默认正常
        let statusText = '正常';
        
        try {
          const expiryDate = new Date(medicine.expiryDate);
          const timeDiff = expiryDate - currentDate;
          const daysToExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry <= 0) {
            // 已过期
            statusColor = 'danger';
            statusText = '过期';
          } else if (daysToExpiry <= 7) {
            // 临期（7天内）- 深黄色
            statusColor = 'warning';
            statusText = '临期';
          } else if (daysToExpiry <= 90) {
          // 临期（90天内）- 浅黄色
          statusColor = 'default';
          statusText = '临期';
        }
        } catch (error) {
          console.error('计算药品状态失败:', error);
          // 如果计算失败，默认为正常
          statusColor = 'success';
          statusText = '正常';
        }
        
        return {
          ...medicine,
          statusColor,
          statusText
        };
      });
      
      this.setData({
        medicines: medicines,
        loading: false
      });
    }).catch(error => {
      wx.hideLoading();
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail
    });
    
    // 自动搜索
    this.loadMedicines();
  },

  onAddMedicine: function() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能添加药品',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showAddDialog: true,
      editingMedicine: null,
      formData: {
        name: '',
        manufacturer: '',
        specification: '',
        barcode: '',
        category: '抗生素',
        stock: 1,
        unit: '盒',
        expiryDate: '',
        dosage: ''
      }
    });
  },

  onEditMedicine: function(e) {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能编辑药品',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    const medicine = e.currentTarget.dataset.medicine;
    this.setData({
        editingMedicine: medicine,
        showAddDialog: true,
        formData: {
          name: medicine.name || '',
          manufacturer: medicine.manufacturer || '',
          specification: medicine.specification || '',
          barcode: medicine.barcode || '',
          category: medicine.category || '抗生素',
          stock: medicine.stock || 1,
          unit: medicine.unit || '盒',
          expiryDate: medicine.expiryDate || '',
          dosage: medicine.dosage || ''
        }
      });
  },

  onDeleteMedicine: function(e) {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能删除药品',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    const medicine = e.currentTarget.dataset.medicine;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${medicine.name}"吗？`,
      confirmText: '删除',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            await DataManager.deleteMedicine(medicine.id);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadMedicines();
          } catch (error) {
            console.error('删除药品失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onCategoryChange: function(e) {
    this.setData({
      'formData.category': e.detail
    });
  },

  onStockInput: function(e) {
    this.setData({
      'formData.stock': e.detail
    });
  },

  onUnitInput: function(e) {
    this.setData({
      'formData.unit': e.detail
    });
  },

  onExpiryDateSelect: function() {
    try {
      this.setData({ 
        showDatePicker: true,
        datePickerType: 'expiry'
      });
    } catch (error) {
      console.error('日期选择失败:', error);
      wx.showToast({ title: '日期选择失败', icon: 'none' });
    }
  },

  onDosageInput: function(e) {
    this.setData({
      'formData.dosage': e.detail
    });
  },

  onNameInput: function(e) {
    this.setData({
      'formData.name': e.detail
    });
  },

  showCategoryPicker: function() {
    wx.showActionSheet({
      itemList: this.data.categories.map(cat => cat.label),
      success: (res) => {
        const selectedCategory = this.data.categories[res.tapIndex];
        this.setData({
          'formData.category': selectedCategory.value
        });
      }
    });
  },

  onManufacturerInput: function(e) {
    this.setData({
      'formData.manufacturer': e.detail
    });
  },

  onSpecificationInput: function(e) {
    this.setData({
      'formData.specification': e.detail
    });
  },

  onSubmit: function() {
    const { name, manufacturer, specification, barcode, category, stock, unit, expiryDate, dosage } = this.data.formData;
    
    if (!name || !name.trim() || !expiryDate) {
      wx.showToast({
        title: '请输入药品名称和过期日期',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    const medicineData = {
      name: (name || '').trim(),
      manufacturer: (manufacturer || '').trim(),
      specification: (specification || '').trim(),
      barcode: (barcode || '').trim(),
      category: category || '其他',
      stock: parseInt(stock) || 0,
      unit: unit || '盒',
      expiryDate: expiryDate,
      dosage: (dosage || '').trim()
    };

    const promise = this.data.editingMedicine 
      ? DataManager.updateMedicine(this.data.editingMedicine.id, medicineData)
      : DataManager.addMedicine(medicineData);

    promise.then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      this.onCloseDialog();
      this.loadMedicines();
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    });
  },

  onCloseDialog: function() {
    this.setData({
      showAddDialog: false,
      editingMedicine: null,
      showDatePicker: false,
      formData: {
        name: '',
        manufacturer: '',
        specification: '',
        barcode: '',
        category: '抗生素',
        stock: 1,
        unit: '盒',
        expiryDate: '',
        dosage: ''
      }
    });
  },

  onPullDownRefresh: function() {
    this.loadMedicines();
    wx.stopPullDownRefresh();
  },

  // 日历选择
  onCalendarSelect: function(e) {
    const selectedDate = e.detail.value;
    this.setData({ 'formData.expiryDate': selectedDate });
  },

  // 日历选择确认
  onCalendarConfirm: function() {
    this.setData({ showDatePicker: false });
  },

  // 日期选择取消
  onDateCancel: function() {
    this.setData({ showDatePicker: false });
  },

  /**
   * 拍照搜索功能
   */
  onScanCode: function() {
    wx.showActionSheet({
      itemList: ['扫描二维码', '拍照识别', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 扫描二维码
          this.scanQRCode();
        } else if (res.tapIndex === 1) {
          // 拍照识别
          this.takePhoto();
        } else if (res.tapIndex === 2) {
          // 从相册选择
          this.chooseImage();
        }
      }
    });
  },

  /**
   * 拍照
   */
  takePhoto: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['camera'],
      success: (res) => {
        // 调用识别API
        this.recognizeImage(res.tempFilePaths[0]);
      },
      fail: (error) => {
        wx.showToast({ title: '拍照失败', icon: 'none' });
      }
    });
  },

  /**
   * 从相册选择图片
   */
  chooseImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: (res) => {
        // 调用识别API
        this.recognizeImage(res.tempFilePaths[0]);
      },
      fail: (error) => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  /**
   * 扫描二维码
   */
  scanQRCode: function() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: (res) => {
        console.log('二维码扫描结果:', res);
        
        // 处理扫描结果
        this.processQRCodeResult(res.result);
      },
      fail: (error) => {
        wx.showToast({
          title: '扫描失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 处理二维码扫描结果
   * @param {string} result - 扫描结果（条形码）
   */
  processQRCodeResult: function(result) {
    wx.showLoading({ title: '识别中...' });

    // 调用后端API识别条形码
    DataManager.recognizeBarcode(result).then(res => {
      wx.hideLoading();

      if (res.code === 0 && res.data) {
        // 识别成功，直接打开表单填充
        wx.showToast({
          title: '识别成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          this.setData({
            showAddDialog: true,
            editingMedicine: null,
            formData: {
              name: res.data.name || '',
              manufacturer: res.data.manufacturer || '',
              specification: res.data.specification || '',
              barcode: result,
              category: res.data.category || '其他',
              stock: 1,
              unit: '盒',
              startDate: '',
              endDate: '',
              daysToExpiry: res.data.daysToExpiry || 365,
              dosage: res.data.dosage || ''
            }
          });
        }, 500);
      } else {
        // 识别失败，询问是否手动输入
        wx.showModal({
          title: '提示',
          content: '识别库中暂无该药品，请手动输入',
          confirmText: '手动输入',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 打开表单，只填充条形码
              this.setData({
                showAddDialog: true,
                editingMedicine: null,
                formData: {
                  name: '',
                  manufacturer: '',
                  specification: '',
                  barcode: result,
                  category: '其他',
                  stock: 1,
                  unit: '盒',
                  expiryDate: '',
                  dosage: ''
                }
              });
            }
          }
        });
      }
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '识别失败',
        icon: 'none'
      });
    });
  },

  /**
   * 图片识别
   * @param {string} imagePath - 图片路径
   */
  recognizeImage: function(imagePath) {
    wx.showLoading({ title: '识别中...' });

    // 调用后端API识别图片
    DataManager.recognizeImage(imagePath).then(res => {
      wx.hideLoading();
      
      if (res.code === 0 && res.data) {
        // 识别成功，显示结果
        this.showRecognitionResult(res.data, '');
      } else {
        // 识别失败
        this.showRecognitionFailed();
      }
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '识别失败',
        icon: 'none'
      });
    });
  },

  /**
   * 显示识别结果
   * @param {object} result - 识别结果
   * @param {string} barcode - 条形码（可选）
   */
  showRecognitionResult: function(result, barcode = '') {
    
    if (!result) {
      this.showRecognitionFailed();
      return;
    }

    // 直接打开添加表单，自动填充识别到的信息
    wx.showToast({
      title: '识别成功',
      icon: 'success',
      duration: 1500
    });

    // 延迟一下再打开表单，让用户看到成功提示
    setTimeout(() => {
      this.setData({
        showAddDialog: true,
        editingMedicine: null,
        formData: {
          name: result.name || '',
          manufacturer: result.manufacturer || '',
          specification: result.specification || '',
          barcode: barcode,
          category: result.category || '其他',
          stock: 1,
          unit: '盒',
          expiryDate: result.expiryDate || '',
          dosage: result.dosage || ''
        }
      });
    }, 500);
  },

  /**
   * 显示识别失败提示
   */
  showRecognitionFailed: function() {
    wx.showModal({
      title: '识别失败',
      content: '未能识别药品信息，请手动输入',
      confirmText: '手动输入',
      cancelText: '重新识别',
      success: (res) => {
        if (res.confirm) {
          this.onAddMedicine();
        } else {
          this.onScanCode();
        }
      }
    });
  }
});