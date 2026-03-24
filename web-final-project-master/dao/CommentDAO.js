/**
 * Comment data access layer (评论数据访问层)
 * Supports two-level nesting (支持两层嵌套)
 */

const db = require('../config/database');

/**
 * Get all comments for an article (includes username) (查询文章评论，含用户名)
 */
async function findByArticle(articleId) {
    const sql = `
        SELECT c.comment_id,
               c.article_id,
               c.user_id,
               c.parent_comment_id,
               c.content,
               c.created_at,
               u.username,
               av.avatar_path AS avatar_path
        FROM comments c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN avatars av ON u.avatar_id = av.avatar_id
        WHERE c.article_id = ?
        ORDER BY c.created_at ASC
    `;
    const rows = await db.query(sql, [articleId]);
    return (rows || []).map(normalizeCommentAvatar);
}

/**
 * Get comment by id (根据 id 查询评论)
 */
async function findById(commentId) {
    const sql = `
        SELECT c.comment_id,
               c.article_id,
               c.user_id,
               c.parent_comment_id,
               c.content,
               c.created_at
        FROM comments c
        WHERE c.comment_id = ?
    `;
    const rows = await db.query(sql, [commentId]);
    return rows && rows[0] ? rows[0] : null;
}

/**
 * Get comment depth (0=top,1=reply,2=reply of reply) (获取评论深度)
 */
async function getDepth(commentId) {
    const sql = `
        SELECT c.comment_id,
               c.parent_comment_id,
               p.parent_comment_id AS grand_parent_id
        FROM comments c
        LEFT JOIN comments p ON c.parent_comment_id = p.comment_id
        WHERE c.comment_id = ?
    `;
    const rows = await db.query(sql, [commentId]);
    if (!rows || !rows[0]) return null;
    const row = rows[0];
    if (!row.parent_comment_id) return 0;
    if (!row.grand_parent_id) return 1;
    return 2;
}

/**
 * Create comment (创建评论)
 */
async function create({ article_id, user_id, parent_comment_id, content }) {
    const sql = `
        INSERT INTO comments (article_id, user_id, parent_comment_id, content)
        VALUES (?, ?, ?, ?)
    `;
    return await db.query(sql, [
        article_id,
        user_id,
        parent_comment_id || null,
        content
    ]);
}

/**
 * Delete comment (foreign keys cascade delete children) (删除评论，级联删除子评论)
 */
async function remove(commentId) {
    const sql = 'DELETE FROM comments WHERE comment_id = ?';
    return await db.query(sql, [commentId]);
}

module.exports = {
    findByArticle,
    findById,
    getDepth,
    create,
    remove
};

function normalizeCommentAvatar(row) {
    if (!row) return null;
    let avatarPath = row.avatar_path;
    if (!avatarPath || typeof avatarPath !== 'string') {
        avatarPath = '/images/avatars/avatar1.png';
    } else if (!avatarPath.startsWith('/')) {
        avatarPath = `/${avatarPath}`;
    }
    return { ...row, avatar_path: avatarPath };
}

