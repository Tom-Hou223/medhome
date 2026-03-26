# mdehome

## 项目概述

本项目是一个基于微信小程序的家庭常备药品智能管理与过期提醒系统，整合了多个优秀项目的功能，实现了药品管理、用药计划、智能提醒、数据统计等核心功能。系统支持游客模式和登录模式，满足不同用户的需求，同时提供家庭协作管理功能，适合家庭成员共同使用。

## 技术栈

### 前端
- **微信小程序原生开发**：基础库 3.15.0，轻量级跨平台应用
- **JavaScript (ES6+)**：前端逻辑实现
- **WXML/WXSS**：页面结构和样式
- **wx.request**：网络请求
- **wx.uploadFile**：文件上传
- **wx.setStorageSync**：本地存储

### 后端
- **Node.js**：v22.11.0，服务器运行环境
- **Express.js**：4.x，Web框架
- **MySQL**：5.7+，关系型数据库
- **JWT (jsonwebtoken)**：8.x，身份认证
- **bcrypt**：5.x，密码加密
- **multer**：1.x，文件上传
- **cors**：2.x，跨域处理
- **mysql2**：3.x，数据库连接

## 项目结构

```
medhome/
├── miniprogram/              # 小程序前端
│   ├── pages/             # 页面目录
│   │   ├── index/         # 首页/日历
│   │   ├── medicine/      # 药品管理
│   │   ├── plan/          # 用药计划
│   │   ├── records/        # 用药记录
│   │   ├── family/         # 家庭管理
│   │   ├── profile/        # 个人中心
│   │   ├── login/          # 登录页面
│   │   └── statistics/     # 数据统计
│   ├── components/         # 自定义组件
│   │   ├── calendar/       # 日历组件
│   │   └── medicine-item/  # 药品项组件
│   ├── utils/              # 工具类
│   │   ├── dataManager.js  # 数据管理
│   │   ├── errorHandler.js # 错误处理
│   │   └── util.js         # 工具函数
│   ├── images/             # 图片资源
│   ├── styles/             # 样式文件
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── project.config.json
│   └── package.json
├── server/                  # 后端服务
│   ├── HomeMediRemind/      # 后端应用
│   │   ├── routes/         # 路由
│   │   │   ├── auth.js     # 认证路由
│   │   │   ├── medicine.js # 药品路由
│   │   │   ├── plan.js     # 计划路由
│   │   │   ├── records.js  # 记录路由
│   │   │   └── families.js # 家庭路由
│   │   ├── middleware/     # 中间件
│   │   │   ├── auth.js     # 认证中间件
│   │   │   └── permission.js # 权限中间件
│   │   ├── db/             # 数据库连接
│   │   ├── utils/           # 工具
│   │   ├── app.js           # 服务器入口
│   │   ├── db.js            # 数据库配置
│   │   ├── package.json     # 依赖配置
│   │   └── start-server.bat # 启动脚本
├── README.md               # 项目说明
├── fix-wxml-errors.ps1     # WXML错误修复脚本
└── fix-wxml-errors.py      # WXML错误修复脚本
```

## 功能特性

### 1. 用户管理
- ✅ 微信一键登录
- ✅ 手机号登录
- ✅ 昵称登录
- ✅ 个人信息编辑（昵称、手机号、头像）
- ✅ 头像上传功能
- ✅ 老年模式支持

### 2. 药品管理
- ✅ 手动录入药品信息
- ✅ 药品信息修改、删除
- ✅ 过期药品标记
- ✅ 药品详情查看
- ✅ 药品分类管理
- ✅ 库存管理

### 3. 用药计划管理
- ✅ 创建用药计划
- ✅ 计划编辑/删除
- ✅ 计划时间设置
- ✅ 计划状态管理（激活、已完成）
- ✅ 按成员分组显示

### 4. 用药记录管理
- ✅ 记录自动生成
- ✅ 状态更新（已完成、已错过、待完成）
- ✅ 记录查询
- ✅ 用药依从性统计

### 5. 家庭管理
- ✅ 家庭创建
- ✅ 家庭成员管理（添加、移除、修改角色）
- ✅ 邀请码加入家庭
- ✅ 角色权限控制（管理员/普通成员）

### 6. 日历展示
- ✅ 月度用药状态展示
- ✅ 状态颜色区分（已完成、待完成、已错过、无计划）
- ✅ 日期选择查看详情

### 7. 智能提醒
- ✅ 用药计划提醒
- ✅ 药品过期提醒
- ✅ 提醒方式自定义

### 8. 数据统计
- ✅ 药品库存统计
- ✅ 过期药品统计
- ✅ 用药完成率统计
- ✅ 可视化图表展示

### 9. 系统设置
- ✅ 提醒方式设置
- ✅ 分类规则管理
- ✅ 老年模式切换
- ✅ 关于我们/帮助/反馈

### 10. 其他功能
- ✅ 游客模式（无需登录使用基本功能）
- ✅ 数据本地缓存
- ✅ 数据云端同步
- ✅ 多设备访问

## 创新点

### 1. 双模式设计
- **游客模式**：无需登录即可使用基本功能，数据存储在本地
- **登录模式**：数据同步到云端，支持多设备访问
- **无缝切换**：登录后可将本地数据同步到云端

### 2. 智能用药提醒
- **自动生成记录**：根据用药计划自动生成用药记录
- **智能状态计算**：区分已完成、待完成、已错过状态
- **日历可视化**：直观展示月度用药情况

### 3. 家庭协作管理
- **多成员支持**：适合家庭成员共同使用
- **角色权限**：区分管理员和普通成员
- **邀请机制**：通过邀请码加入家庭

### 4. 安全性设计
- **JWT认证**：安全的身份认证机制
- **密码加密**：bcrypt加密存储密码
- **权限控制**：确保用户只能访问自己家庭的数据

### 5. 性能优化
- **本地缓存**：减少API请求，提高响应速度
- **图片上传优化**：确保头像上传速度
- **数据分页**：避免一次性加载过多数据

## 安装与运行

### 前端安装
```bash
cd miniprogram
npm install
```

### 后端安装
```bash
cd server/HomeMediRemind
npm install
```

### 配置数据库
1. 创建MySQL数据库（数据库名：home_medi_remind）
2. 修改 `server/HomeMediRemind/db.js` 中的数据库配置（用户名、密码等）
3. 确保MySQL服务已启动

### 启动后端服务
方法1：使用批处理脚本
```bash
cd server/HomeMediRemind
start-server.bat
```

方法2：手动启动
```bash
cd server/HomeMediRemind
node app.js
```
服务将在 http://10.167.79.202:3001 启动

### 启动前端
1. 使用微信开发者工具打开miniprogram目录
2. 配置AppID
3. 点击编译按钮

## 开发说明

### 前端开发
- 数据管理统一使用DataManager模块
- 支持游客模式和登录模式切换
- 老年模式全局适配
- 所有网络请求通过DataManager处理

### 后端开发
- 采用RESTful API设计
- 使用JWT进行用户认证
- 支持MySQL数据库操作
- 中间件实现权限控制

## API文档

### 认证模块
- POST /api/auth/login - 微信登录
- POST /api/auth/login-by-phone - 手机号登录
- POST /api/auth/login-by-nickname - 昵称登录
- GET /api/auth/profile - 获取用户信息
- PUT /api/auth/profile - 更新用户信息
- POST /api/auth/upload-avatar - 上传头像

### 药品模块
- GET /api/medicine/list - 获取药品列表
- POST /api/medicine/add - 添加药品
- PUT /api/medicine/update/:id - 更新药品
- DELETE /api/medicine/delete/:id - 删除药品
- POST /api/medicine/recognize/barcode - 条形码识别
- POST /api/medicine/recognize/image - 图片识别

### 用药计划模块
- GET /api/plan/list - 获取用药计划列表
- POST /api/plan/create - 创建用药计划
- PUT /api/plan/update/:id - 更新用药计划
- DELETE /api/plan/delete/:id - 删除用药计划

### 用药记录模块
- GET /api/records - 获取用药记录列表
- POST /api/records/add - 添加用药记录
- POST /api/records/complete/:id - 标记记录为已完成
- POST /api/records/miss/:id - 标记记录为已错过

### 家庭模块
- GET /api/families/my - 获取我的家庭列表
- POST /api/families/create - 创建家庭
- POST /api/families/join - 加入家庭
- GET /api/families/:id - 获取家庭详情
- PUT /api/families/:id - 更新家庭信息
- DELETE /api/families/:id - 删除家庭
- POST /api/families/:id/invite - 生成邀请码
- PUT /api/families/:id/members/:userId/role - 修改成员角色
- DELETE /api/families/:id/members/:userId - 移除成员
- POST /api/families/:id/leave - 退出家庭

## 数据模型

### 用户表 (users)
- id：用户ID
- openid：微信OpenID
- phone：手机号
- nickname：昵称
- avatar_url：头像URL
- password：密码（加密）
- created_at：创建时间
- updated_at：更新时间

### 家庭表 (families)
- id：家庭ID
- name：家庭名称
- creator_id：创建者ID
- invite_code：邀请码
- created_at：创建时间
- updated_at：更新时间

### 家庭成员表 (family_user_roles)
- family_id：家庭ID
- user_id：用户ID
- role：角色（admin/member）
- joined_at：加入时间

### 药品表 (medicines)
- id：药品ID
- family_id：家庭ID
- name：药品名称
- manufacturer： manufacturer
- specification：规格
- category：分类
- stock：库存
- unit：单位
- expiry_date：过期日期
- dosage：用法用量
- created_at：创建时间

### 计划表 (plans)
- id：计划ID
- family_id：家庭ID
- medicine_id：药品ID
- member_id：成员ID
- frequency：频率
- time_slots：时间槽
- start_date：开始日期
- end_date：结束日期
- status：状态
- note：备注
- created_at：创建时间
- updated_at：更新时间

### 记录表 (records)
- id：记录ID
- family_id：家庭ID
- plan_id：计划ID
- medicine_id：药品ID
- member_id：成员ID
- date：日期
- time：时间
- status：状态
- supplement：补充说明
- created_at：创建时间
- updated_at：更新时间


## 注意事项

1. **缓存文件说明**：项目已清理所有缓存文件，包括 `miniprogram_npm` 目录和 `package-lock.json` 文件。接收方在使用前需运行 `npm install` 安装依赖。

2. **数据库配置**：默认数据库配置为本地 MySQL 服务，数据库名 `home_medi_remind`，用户名 `root`，密码 `1234`。请根据实际环境修改 `server/HomeMediRemind/db.js` 文件。

3. **后端服务**：后端服务默认端口为 3001，如需修改请编辑 `server/HomeMediRemind/app.js` 文件。

4. **前端配置**：使用微信开发者工具打开 `miniprogram` 目录时，请确保已配置正确的 AppID。

5. **构建说明**：在微信开发者工具中，需要执行 "构建 npm" 操作，以重新生成 `miniprogram_npm` 目录。

6. **API基础URL**：前端API基础URL已配置为 `http://10.167.79.202:3001/api`，请根据实际服务器IP地址修改 `miniprogram/utils/dataManager.js` 文件。

---

**药效记 - 您的家庭用药管理专家**
