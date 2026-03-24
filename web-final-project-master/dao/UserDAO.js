/**
 * 用户数据访问层
 * 所有 SQL 均使用预处理语句，防止注入
 */

const db = require('../config/database');

/**
 * 根据用户名查找用户（用于登录、AJAX 检查用户名是否占用）
 * @param {string} username 用户名
 * @returns {Promise<Object|null>} 用户对象或 null
 */
async function findByUsername(username) {
    const sql = 'SELECT user_id, username, password_hash, salt, real_name, date_of_birth, description, avatar_id, created_at FROM users WHERE username = ?';
    const rows = await db.query(sql, [username]);
    return rows && rows[0] ? rows[0] : null;
}

/**
 * 根据 user_id 查找用户（不包含密码，用于资料页展示）
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
async function findById(userId) {
    const sql = 'SELECT user_id, username, real_name, date_of_birth, description, avatar_id, created_at FROM users WHERE user_id = ?';
    const rows = await db.query(sql, [userId]);
    return rows && rows[0] ? rows[0] : null;
}

/**
 * 创建用户
 * @param {Object} user { username, password_hash, salt, real_name, date_of_birth, description, avatar_id }
 * @returns {Promise} 插入结果，可含 insertId
 */
async function create(user) {
    const sql = `INSERT INTO users (username, password_hash, salt, real_name, date_of_birth, description, avatar_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    return await db.query(sql, [
        user.username,
        user.password_hash,
        user.salt || '',
        user.real_name,
        user.date_of_birth,
        user.description || '',
        user.avatar_id || 1
    ]);
}

/**
 * 更新用户信息（含用户名）
 * @param {number} userId
 * @param {Object} data { username, real_name, date_of_birth, description, avatar_id }
 * @returns {Promise}
 */
async function update(userId, data) {
    const sql = `UPDATE users SET username = ?, real_name = ?, date_of_birth = ?, description = ?, avatar_id = ?
                 WHERE user_id = ?`;
    return await db.query(sql, [
        data.username,
        data.real_name,
        data.date_of_birth,
        data.description || '',
        data.avatar_id || 1,
        userId
    ]);
}

/**
 * 更新密码
 * @param {number} userId
 * @param {string} passwordHash
 * @param {string} salt
 * @returns {Promise}
 */
async function updatePassword(userId, passwordHash, salt) {
    const sql = 'UPDATE users SET password_hash = ?, salt = ? WHERE user_id = ?';
    return await db.query(sql, [passwordHash, salt || '', userId]);
}

/**
 * 删除用户（级联删除文章、评论等由数据库外键处理）
 * @param {number} userId
 * @returns {Promise}
 */
async function remove(userId) {
    const sql = 'DELETE FROM users WHERE user_id = ?';
    return await db.query(sql, [userId]);
}

module.exports = {
    findByUsername,
    findById,
    create,
    update,
    updatePassword,
    remove
};
