/**
 * 头像数据访问层
 * 使用预处理语句访问 avatars 表
 */

const db = require('../config/database');

/**
 * 获取所有预定义头像
 * @returns {Promise<Array>} 头像列表
 */
async function findAll() {
    const sql = 'SELECT avatar_id, avatar_name, avatar_path, description FROM avatars ORDER BY avatar_id';
    const rows = await db.query(sql, []);
    return rows || [];
}

/**
 * 根据 id 获取头像
 * @param {number} avatarId 头像 id
 * @returns {Promise<Object|null>}
 */
async function findById(avatarId) {
    const sql = 'SELECT avatar_id, avatar_name, avatar_path, description FROM avatars WHERE avatar_id = ?';
    const rows = await db.query(sql, [avatarId]);
    return rows && rows[0] ? rows[0] : null;
}

module.exports = {
    findAll,
    findById
};
