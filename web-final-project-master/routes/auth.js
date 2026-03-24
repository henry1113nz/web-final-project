/**
 * 认证相关路由：注册、登录、登出、用户名检查（AJAX）
 */

const express = require('express');
const router = express.Router();
const UserDAO = require('../dao/UserDAO');
const AvatarDAO = require('../dao/AvatarDAO');
const { hashPassword, verifyPassword } = require('../utils/password');

function redirectIfLoggedIn(req, res, next) {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    next();
}

router.get('/register', redirectIfLoggedIn, async (req, res, next) => {
    try {
        const avatars = await AvatarDAO.findAll();
        res.render('auth/register', { avatars, error: null, form: {} });
    } catch (err) {
        next(err);
    }
});

router.post('/register', redirectIfLoggedIn, async (req, res, next) => {
    try {
        const { username, password, passwordConfirm, real_name, date_of_birth, description, avatar_id } = req.body;
        const avatars = await AvatarDAO.findAll();

        if (!password || password !== passwordConfirm) {
            return res.render('auth/register', {
                avatars,
                error: '两次输入的密码不一致',
                form: { username, real_name, date_of_birth, description, avatar_id }
            });
        }
        if (!username || !username.trim()) {
            return res.render('auth/register', { avatars, error: '请填写用户名', form: { username, real_name, date_of_birth, description, avatar_id } });
        }
        if (!real_name || !real_name.trim()) {
            return res.render('auth/register', { avatars, error: '请填写真实姓名', form: { username, real_name, date_of_birth, description, avatar_id } });
        }
        if (!date_of_birth) {
            return res.render('auth/register', { avatars, error: '请选择出生日期', form: { username, real_name, date_of_birth, description, avatar_id } });
        }

        const existing = await UserDAO.findByUsername(username.trim());
        if (existing) {
            return res.render('auth/register', {
                avatars,
                error: '该用户名已被使用',
                form: { username, real_name, date_of_birth, description, avatar_id }
            });
        }

        const { hash, salt } = await hashPassword(password);
        await UserDAO.create({
            username: username.trim(),
            password_hash: hash,
            salt,
            real_name: real_name.trim(),
            date_of_birth,
            description: (description || '').trim(),
            avatar_id: avatar_id ? parseInt(avatar_id, 10) : 1
        });
        res.redirect('/auth/login');
    } catch (err) {
        next(err);
    }
});

router.get('/login', redirectIfLoggedIn, (req, res) => {
    res.render('auth/login', { error: null });
});

router.post('/login', redirectIfLoggedIn, async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.render('auth/login', { error: '请输入用户名和密码' });
        }
        const user = await UserDAO.findByUsername(username.trim());
        if (!user) {
            return res.render('auth/login', { error: '用户名或密码错误' });
        }
        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) {
            return res.render('auth/login', { error: '用户名或密码错误' });
        }
        req.session.userId = user.user_id;
        req.session.username = user.username;
        res.redirect('/');
    } catch (err) {
        next(err);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect(err ? '/' : '/auth/login');
    });
});

router.get('/check-username', async (req, res, next) => {
    try {
        const username = (req.query.username || '').trim();
        const user = username ? await UserDAO.findByUsername(username) : null;
        res.json({ taken: !!user });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
