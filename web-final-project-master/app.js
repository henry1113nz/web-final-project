// Load a .env file if one exists
require('dotenv').config();

const express = require("express");
const handlebars = require("express-handlebars");
const session = require("express-session");
const path = require("path");
const app = express();

// Listen port will be loaded from .env file, or use 3000
const port = process.env.EXPRESS_PORT || 3000;

// Setup Handlebars（注册 eq 辅助函数，用于模板中比较相等）
app.engine("handlebars", handlebars.create({
    defaultLayout: null,
    layoutsDir: path.join(__dirname, "views/layouts"), 
    helpers: { eq: (a, b) => a == b }
}).engine);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// 配置session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // 在生产环境使用HTTPS时设置为true
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
}));

// Set up to read POSTed form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json({}));

// 静态文件服务
app.use(express.static(path.join(__dirname, "public")));

// 引入中间件
const { optionalAuth } = require("./middleware/auth");
app.use(optionalAuth); // 为所有请求添加可选的认证检查

// 认证路由（注册、登录、登出、用户名检查）
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
// const articleRoutes = require('./routes/articles');
// const userRoutes = require('./routes/users');
// app.use('/articles', articleRoutes);
// app.use('/users', userRoutes);

// 根路径重定向
app.get("/", (req, res) => {
    res.redirect("/articles");
});

app.listen(port, function () {
    console.log(`Web final project listening on http://localhost:${port}/`);
});
