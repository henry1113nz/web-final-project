/**
 * User profile routes: view, edit, delete account (用户资料路由：查看、编辑、删除账户)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const UserDAO = require('../dao/UserDAO');
const AvatarDAO = require('../dao/AvatarDAO');

// All /users routes require login (所有 /users 路由必须登录)
router.use(requireAuth);

/**
 * GET /users/profile - Profile page (个人资料页)
 */
router.get('/profile', async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const user = await UserDAO.findById(userId);
        const avatars = await AvatarDAO.findAll();

        res.render('users/profile', {
            title: 'Profile',
            user,
            avatars,
            error: null,
            success: null
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /users/profile - Update profile (更新资料)
 */
router.post('/profile', async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { username, real_name, date_of_birth, description, avatar_id } = req.body;

        const avatars = await AvatarDAO.findAll();

        // Basic validation (基本校验)
        if (!username || !username.trim()) {
            return res.render('users/profile', {
                title: 'Profile',
                user: { username, real_name, date_of_birth, description, avatar_id },
                avatars,
                error: 'Username is required',
                success: null
            });
        }
        if (!real_name || !real_name.trim()) {
            return res.render('users/profile', {
                title: 'Profile',
                user: { username, real_name, date_of_birth, description, avatar_id },
                avatars,
                error: 'Real name is required',
                success: null
            });
        }
        if (!date_of_birth) {
            return res.render('users/profile', {
                title: 'Profile',
                user: { username, real_name, date_of_birth, description, avatar_id },
                avatars,
                error: 'Date of birth is required',
                success: null
            });
        }

        // Check if username is used by another user (检查用户名是否被其他人占用)
        const existing = await UserDAO.findByUsername(username.trim());
        if (existing && existing.user_id !== userId) {
            return res.render('users/profile', {
                title: 'Profile',
                user: { username, real_name, date_of_birth, description, avatar_id },
                avatars,
                error: 'Username is already taken',
                success: null
            });
        }

        await UserDAO.update(userId, {
            username: username.trim(),
            real_name: real_name.trim(),
            date_of_birth,
            description: (description || '').trim(),
            avatar_id: avatar_id ? parseInt(avatar_id, 10) : 1
        });

        // Update username in session for navigation display (更新 session 中的 username)
        req.session.username = username.trim();

        const user = await UserDAO.findById(userId);

        res.render('users/profile', {
            title: 'Profile',
            user,
            avatars,
            error: null,
            success: 'Profile updated'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /users/delete - Delete account (删除账户)
 */
router.post('/delete', async (req, res, next) => {
    try {
        const userId = req.session.userId;
        await UserDAO.remove(userId);
        req.session.destroy(() => {
            res.redirect('/auth/register');
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

