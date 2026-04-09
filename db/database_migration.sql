-- ============================================
-- 家庭常备药品智能管理系统 - 完整数据库迁移脚本
-- 数据库名称: family_medicine_db
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
-- ============================================

-- 设置客户端字符集
SET NAMES utf8mb4;
SET CHARACTER_SET_CLIENT = utf8mb4;
SET CHARACTER_SET_CONNECTION = utf8mb4;
SET CHARACTER_SET_RESULTS = utf8mb4;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS family_medicine_db2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE family_medicine_db2;

-- ============================================
-- 1. 用户相关表
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信openid',
    phone VARCHAR(20) UNIQUE COMMENT '手机号',
    password VARCHAR(255) COMMENT '密码哈希',
    nickname VARCHAR(100) COMMENT '昵称',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_openid (openid),
    INDEX idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 2. 家庭相关表
-- ============================================

-- 家庭组表
CREATE TABLE IF NOT EXISTS families (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '家庭名称',
    creator_id BIGINT NOT NULL COMMENT '创建者ID',
    invite_code VARCHAR(20) UNIQUE COMMENT '邀请码',
    invite_code_expires_at DATETIME COMMENT '邀请码过期时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    INDEX idx_families_invite_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家庭组表';

-- 家庭成员角色表
CREATE TABLE IF NOT EXISTS family_user_roles (
    id BIGINT PRIMARY KEY,
    family_id BIGINT NOT NULL COMMENT '家庭ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role ENUM('admin', 'member') DEFAULT 'member' COMMENT '角色：管理员/成员',
    relationship VARCHAR(50) DEFAULT 'member' COMMENT '家庭关系',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_family_user (family_id, user_id),
    INDEX idx_family_user_roles_user (user_id),
    INDEX idx_family_user_roles_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家庭成员角色表';

-- 家庭关系规则表
CREATE TABLE IF NOT EXISTS family_relationship_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    relationship VARCHAR(50) NOT NULL UNIQUE COMMENT '关系名称',
    max_count INT DEFAULT NULL COMMENT '最大数量，NULL表示无限制',
    description VARCHAR(200) COMMENT '描述'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家庭关系规则表';

-- 家庭成员信息表
CREATE TABLE IF NOT EXISTS family_members (
    id BIGINT PRIMARY KEY,
    family_id BIGINT COMMENT '家庭ID',
    name VARCHAR(100) NOT NULL COMMENT '成员姓名',
    relationship VARCHAR(50) COMMENT '家庭关系',
    age INT COMMENT '年龄',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    INDEX idx_family_members_family_id (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家庭成员信息表';

-- ============================================
-- 3. 药品相关表
-- ============================================

-- 药品表
CREATE TABLE IF NOT EXISTS medicines (
    id BIGINT PRIMARY KEY,
    family_id BIGINT COMMENT '家庭ID',
    name VARCHAR(255) NOT NULL COMMENT '药品名称',
    manufacturer VARCHAR(255) COMMENT '生产厂家',
    specification VARCHAR(255) COMMENT '规格',
    category VARCHAR(100) COMMENT '分类',
    stock INT DEFAULT 0 COMMENT '库存数量',
    unit VARCHAR(50) COMMENT '单位',
    days_to_expiry INT COMMENT '距离过期天数',
    expiry_date DATE COMMENT '过期日期',
    dosage TEXT COMMENT '用法用量',
    status VARCHAR(20) DEFAULT 'normal' COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    INDEX idx_medicines_status (status),
    INDEX idx_medicines_family_id (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='药品表';

-- ============================================
-- 4. 用药计划相关表
-- ============================================

-- 用药计划表
CREATE TABLE IF NOT EXISTS plans (
    id BIGINT PRIMARY KEY,
    family_id BIGINT COMMENT '家庭ID',
    medicine_name VARCHAR(255) NOT NULL COMMENT '药品名称',
    member_name VARCHAR(100) NOT NULL COMMENT '成员姓名',
    frequency VARCHAR(50) COMMENT '频率',
    time_slots JSON COMMENT '时间段（JSON数组）',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
    start_date DATE COMMENT '开始日期',
    end_date DATE COMMENT '结束日期',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    INDEX idx_plans_status (status),
    INDEX idx_plans_family_id (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用药计划表';

-- 用药记录表
CREATE TABLE IF NOT EXISTS records (
    id BIGINT PRIMARY KEY,
    family_id BIGINT COMMENT '家庭ID',
    plan_id BIGINT COMMENT '计划ID',
    medicine_name VARCHAR(255) NOT NULL COMMENT '药品名称',
    member_name VARCHAR(100) NOT NULL COMMENT '成员姓名',
    time VARCHAR(10) COMMENT '时间',
    date DATE COMMENT '日期',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    INDEX idx_records_date (date),
    INDEX idx_records_status (status),
    INDEX idx_records_family_id (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用药记录表';

-- ============================================
-- 5. 通知相关表
-- ============================================

-- 用户订阅表
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    template_id VARCHAR(100) NOT NULL COMMENT '微信订阅消息模板ID',
    template_type VARCHAR(20) NOT NULL COMMENT '模板类型：expiry或medication',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '订阅时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_template_type (template_type),
    UNIQUE KEY unique_user_template (user_id, template_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户订阅表';

-- 用户通知设置表
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE COMMENT '用户ID',
    reminder_time INT DEFAULT 15 COMMENT '提前提醒时间(分钟)',
    expiry_warning_days INT DEFAULT 30 COMMENT '过期预警天数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户通知设置表';

-- ============================================
-- 6. 识别历史表
-- ============================================

-- 识别历史表
CREATE TABLE IF NOT EXISTS recognition_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    family_id BIGINT NOT NULL COMMENT '家庭ID',
    type ENUM('barcode', 'image') NOT NULL COMMENT '识别类型：条形码/图片',
    input_data TEXT COMMENT '输入数据（条形码或图片路径）',
    recognition_result JSON COMMENT '识别结果',
    is_added BOOLEAN DEFAULT FALSE COMMENT '是否已添加到药品库',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='识别历史表';

-- ============================================
-- 7. 数据同步相关表
-- ============================================

-- 数据变更日志表
CREATE TABLE IF NOT EXISTS data_change_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    family_id BIGINT NOT NULL COMMENT '家庭ID',
    table_name VARCHAR(50) NOT NULL COMMENT '表名',
    record_id BIGINT NOT NULL COMMENT '记录ID',
    action ENUM('create', 'update', 'delete') NOT NULL COMMENT '操作类型',
    user_id BIGINT COMMENT '操作用户ID',
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
    INDEX idx_family_changed (family_id, changed_at),
    INDEX idx_table_record (table_name, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据变更日志表';

-- ============================================
-- 8. 插入初始数据
-- ============================================

-- 插入家庭关系规则
INSERT INTO family_relationship_rules (relationship, max_count, description) VALUES
('self', 1, '本人（仅一个）'),
('spouse', 1, '配偶（仅一个）'),
('father', 1, '父亲（仅一个）'),
('mother', 1, '母亲（仅一个）'),
('son', NULL, '儿子（可多个）'),
('daughter', NULL, '女儿（可多个）'),
('grandfather_paternal', 1, '爷爷（仅一个）'),
('grandmother_paternal', 1, '奶奶（仅一个）'),
('grandfather_maternal', 1, '外公（仅一个）'),
('grandmother_maternal', 1, '外婆（仅一个）'),
('other', NULL, '其他（可多个）')
ON DUPLICATE KEY UPDATE relationship=relationship;

-- ============================================
-- 9. 创建触发器（用于数据同步）
-- ============================================

DELIMITER $$

-- medicines 表触发器
DROP TRIGGER IF EXISTS medicines_after_insert$$
CREATE TRIGGER medicines_after_insert
AFTER INSERT ON medicines
FOR EACH ROW
BEGIN
    IF NEW.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (NEW.family_id, 'medicines', NEW.id, 'create');
    END IF;
END$$

DROP TRIGGER IF EXISTS medicines_after_update$$
CREATE TRIGGER medicines_after_update
AFTER UPDATE ON medicines
FOR EACH ROW
BEGIN
    IF NEW.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (NEW.family_id, 'medicines', NEW.id, 'update');
    END IF;
END$$

DROP TRIGGER IF EXISTS medicines_after_delete$$
CREATE TRIGGER medicines_after_delete
AFTER DELETE ON medicines
FOR EACH ROW
BEGIN
    IF OLD.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (OLD.family_id, 'medicines', OLD.id, 'delete');
    END IF;
END$$

-- plans 表触发器
DROP TRIGGER IF EXISTS plans_after_insert$$
CREATE TRIGGER plans_after_insert
AFTER INSERT ON plans
FOR EACH ROW
BEGIN
    IF NEW.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (NEW.family_id, 'plans', NEW.id, 'create');
    END IF;
END$$

DROP TRIGGER IF EXISTS plans_after_update$$
CREATE TRIGGER plans_after_update
AFTER UPDATE ON plans
FOR EACH ROW
BEGIN
    IF NEW.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (NEW.family_id, 'plans', NEW.id, 'update');
    END IF;
END$$

DROP TRIGGER IF EXISTS plans_after_delete$$
CREATE TRIGGER plans_after_delete
AFTER DELETE ON plans
FOR EACH ROW
BEGIN
    IF OLD.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (OLD.family_id, 'plans', OLD.id, 'delete');
    END IF;
END$$

-- family_members 表触发器
DROP TRIGGER IF EXISTS family_members_after_insert$$
CREATE TRIGGER family_members_after_insert
AFTER INSERT ON family_members
FOR EACH ROW
BEGIN
    IF NEW.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (NEW.family_id, 'family_members', NEW.id, 'create');
    END IF;
END$$

DROP TRIGGER IF EXISTS family_members_after_update$$
CREATE TRIGGER family_members_after_update
AFTER UPDATE ON family_members
FOR EACH ROW
BEGIN
    IF NEW.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (NEW.family_id, 'family_members', NEW.id, 'update');
    END IF;
END$$

DROP TRIGGER IF EXISTS family_members_after_delete$$
CREATE TRIGGER family_members_after_delete
AFTER DELETE ON family_members
FOR EACH ROW
BEGIN
    IF OLD.family_id IS NOT NULL THEN
        INSERT INTO data_change_logs (family_id, table_name, record_id, action)
        VALUES (OLD.family_id, 'family_members', OLD.id, 'delete');
    END IF;
END$$

DELIMITER ;

-- ============================================
-- 10. 创建存储过程
-- ============================================

DELIMITER $$

-- 清理旧日志的存储过程（保留最近7天）
DROP PROCEDURE IF EXISTS clean_old_change_logs$$
CREATE PROCEDURE clean_old_change_logs()
BEGIN
    DELETE FROM data_change_logs 
    WHERE changed_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
END$$

DELIMITER ;

-- ============================================
-- 11. 创建定时事件
-- ============================================

-- 启用事件调度器
SET GLOBAL event_scheduler = ON;

-- 每天凌晨3点清理旧日志
DROP EVENT IF EXISTS clean_logs_daily;
CREATE EVENT clean_logs_daily
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '03:00:00')
DO CALL clean_old_change_logs();

-- ============================================
-- 12. 创建视图
-- ============================================

-- 家庭数据统计视图
CREATE OR REPLACE VIEW family_statistics AS
SELECT 
    f.id as family_id,
    f.name as family_name,
    COUNT(DISTINCT fur.user_id) as member_count,
    COUNT(DISTINCT m.id) as medicine_count,
    COUNT(DISTINCT p.id) as plan_count,
    COUNT(DISTINCT fm.id) as family_member_count
FROM families f
LEFT JOIN family_user_roles fur ON f.id = fur.family_id
LEFT JOIN medicines m ON f.id = m.family_id
LEFT JOIN plans p ON f.id = p.family_id
LEFT JOIN family_members fm ON f.id = fm.family_id
GROUP BY f.id, f.name;

-- ============================================
-- 完成提示
-- ============================================
SELECT '数据库迁移脚本执行完成！' as message;
SELECT '数据库名称: family_medicine_db' as info;
SELECT '共创建: 13个数据表, 6个触发器, 1个存储过程, 1个定时事件, 1个视图' as summary;

