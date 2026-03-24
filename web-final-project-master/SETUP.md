# Project Setup Guide (项目设置说明)

## Prerequisites (前置要求)

- Node.js (LTS recommended, 14+ is acceptable) (推荐 LTS，14 或更高)
- MySQL or MariaDB server (MySQL 或 MariaDB 数据库)
- npm package manager (npm 包管理器)

## Installation Steps (安装步骤)

### 1. Install dependencies (安装依赖包)

Run in the project root directory (在项目根目录运行):

```bash
npm install
```

This installs dependencies such as (会安装以下依赖):
- express - Web framework (Web 框架)
- express-handlebars - Template engine (模板引擎)
- express-session - Session management (会话管理)
- mariadb - Database driver (数据库驱动)
- dotenv - Environment variables (环境变量管理)
- bcrypt - Password hashing (密码哈希)
- multer - File uploads (文件上传)

### 2. Configure environment variables (配置环境变量)

Copy `.env.sample` to `.env` (复制 `.env.sample` 为 `.env`):

```bash
cp .env.sample .env
```

Edit `.env` and fill in your database settings (编辑 `.env`，填写数据库连接信息):

```
EXPRESS_PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_DATABASE=blog_system
SESSION_SECRET=your_secret_key_here_change_in_production
UPLOAD_DIR=public/uploads
MAX_FILE_SIZE=5242880
```

**Important:** Do not commit `.env` to Git (不要提交 `.env` 到 Git 仓库).

### 3. Initialize the database (初始化数据库)

1. Ensure the MySQL/MariaDB service is running (确保数据库服务正在运行)
2. Execute the SQL script `db-init.sql` using a database client (使用数据库客户端执行 `db-init.sql`)

Command line example (命令行示例):
```bash
mysql -u root -p < db-init.sql
```

This script creates (该脚本会创建):
- All required tables (所有必要表：users, articles, comments, likes, avatars)
- Predefined avatar data (预定义头像数据)

### 4. Prepare avatar images (准备头像图片)

Place 8 avatar images in `public/images/avatars/` with names (放置 8 个头像图片):
- avatar1.png
- avatar2.png
- avatar3.png
- avatar4.png
- avatar5.png
- avatar6.png
- avatar7.png
- avatar8.png

### 5. Start the application (启动应用)

```bash
node app.js
```

The app runs on http://localhost:3000 (应用启动在该地址，端口可在 `.env` 配置).

## Project Structure (项目结构)

```
web-final-project/
├── config/          # Configuration (配置文件)
├── dao/            # Data Access Objects (数据访问对象层)
├── routes/         # Routes (路由)
├── middleware/     # Middleware (中间件)
├── utils/          # Utilities (工具函数)
├── public/         # Static assets (静态资源)
│   ├── css/
│   ├── js/
│   ├── images/
│   │   └── avatars/
│   └── uploads/
├── views/          # Handlebars views (模板)
│   ├── auth/
│   ├── articles/
│   └── users/
├── app.js          # App entry (入口文件)
├── db-init.sql     # Database schema (数据库初始化脚本)
└── package.json    # Dependencies (依赖配置)
```

## Development Notes (开发注意事项)

1. Use prepared statements for all database queries (所有数据库操作必须使用预处理语句)
2. Store passwords as hashes, never plain text (密码必须哈希存储)
3. Use sessions for login state (使用 session 维护登录状态)
4. Uploaded files go to `public/uploads` (上传文件存放目录)
5. Use the Data Access Object pattern (使用数据访问对象模式)

## Troubleshooting (故障排除)

### Database connection fails (数据库连接失败)
- Check `.env` settings (检查 `.env` 配置)
- Ensure database service is running (确认数据库服务运行)
- Verify database user permissions (确认用户权限)

### Port is in use (端口被占用)
- Change `EXPRESS_PORT` in `.env` (修改 `.env` 中端口)

### Module not found (模块未找到)
- Reinstall dependencies: `npm install` (重新安装依赖)
