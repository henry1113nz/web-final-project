/**
 * Article routes (文章路由):
 * - Browse all articles and my articles with sorting (浏览全部文章和我的文章，支持排序)
 * - Create, edit, and delete articles (新建、编辑、删除文章)
 * - Article details (文章详情)
 * - Likes with one like per user per article (点赞，每人每文一次)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const ArticleDAO = require('../dao/ArticleDAO');
const LikeDAO = require('../dao/LikeDAO');
const CommentDAO = require('../dao/CommentDAO');

// Upload configuration (上传配置)
const uploadDir = process.env.UPLOAD_DIR || 'public/uploads';
const absoluteUploadDir = path.isAbsolute(uploadDir)
    ? uploadDir
    : path.join(__dirname, '..', uploadDir);

if (!fs.existsSync(absoluteUploadDir)) {
    fs.mkdirSync(absoluteUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, absoluteUploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    }
});

/**
 * Parse sort field and direction from query string (解析排序字段和方向)
 */
function parseSort(req) {
    const allowedSort = ['title', 'username', 'date'];
    const allowedOrder = ['asc', 'desc'];
    const sort = allowedSort.includes((req.query.sort || '').toLowerCase())
        ? req.query.sort.toLowerCase()
        : 'date';
    const order = allowedOrder.includes((req.query.order || '').toLowerCase())
        ? req.query.order.toLowerCase()
        : 'desc';
    return { sort, order };
}

/**
 * Decide response format (structured data or HTML) (决定响应格式)
 * Structured data uses JavaScript Object Notation (JSON) (结构化数据为 JSON)
 */
function wantsJson(req) {
    return req.query.format === 'json' || req.xhr;
}

/**
 * GET /articles - All articles list (所有文章列表)
 */
router.get('/', async (req, res, next) => {
    try {
        const { sort, order } = parseSort(req);
        const articles = await ArticleDAO.findAllWithAuthorAndLikes(sort, order);

        if (wantsJson(req)) {
            return res.json({ articles, sort, order });
        }

        res.render('articles/list', {
            title: 'All Articles',
            articles,
            sort,
            order,
            user: req.user || null,
            showMyLink: !!req.user
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /articles/my - My articles list (我的文章列表，需登录)
 */
router.get('/my', requireAuth, async (req, res, next) => {
    try {
        const { sort, order } = parseSort(req);
        const userId = req.session.userId;
        const articles = await ArticleDAO.findByUser(userId, sort, order);

        if (wantsJson(req)) {
            return res.json({ articles, sort, order });
        }

        res.render('articles/list', {
            title: 'My Articles',
            articles,
            sort,
            order,
            user: req.user || null,
            isMyList: true,
            showAllLink: true
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /articles/new - Create article form (新建文章表单，需登录)
 */
router.get('/new', requireAuth, (req, res) => {
    res.render('articles/form', {
        title: 'Create Article',
        mode: 'create',
        article: {},
        error: null
    });
});

/**
 * POST /articles/new - Create article (创建文章)
 */
router.post('/new', requireAuth, upload.single('image'), async (req, res, next) => {
    try {
        const { title, content } = req.body;

        if (!title || !title.trim()) {
            return res.render('articles/form', {
                title: 'Create Article',
                mode: 'create',
                article: { title, content },
                error: 'Title is required'
            });
        }
        if (!content || !content.trim()) {
            return res.render('articles/form', {
                title: 'Create Article',
                mode: 'create',
                article: { title, content },
                error: 'Content is required'
            });
        }

        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        await ArticleDAO.create({
            user_id: req.session.userId,
            title: title.trim(),
            content: content.trim(),
            image_path: imagePath
        });

        res.redirect('/articles/my');
    } catch (err) {
        next(err);
    }
});

/**
 * Middleware: load article and check existence (加载文章并检查是否存在)
 */
async function loadArticle(req, res, next) {
    try {
        const articleId = parseInt(req.params.id, 10);
        if (Number.isNaN(articleId)) {
            return res.status(404).send('Article not found');
        }
        const article = await ArticleDAO.findByIdWithAuthor(articleId);
        if (!article) {
            return res.status(404).send('Article not found');
        }
        req.article = article;
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * GET /articles/:id - Article detail (文章详情)
 */
router.get('/:id', loadArticle, async (req, res, next) => {
    try {
        const article = req.article;
        let hasLiked = false;
        if (req.user) {
            hasLiked = await LikeDAO.hasLiked(req.user.userId, article.article_id);
        }

        // Build two-level comment tree (构建两层嵌套评论树)
        const commentRows = await CommentDAO.findByArticle(article.article_id);
        const commentsById = {};
        const topLevel = [];

        commentRows.forEach((c) => {
            commentsById[c.comment_id] = {
                ...c,
                children: []
            };
        });

        commentRows.forEach((c) => {
            if (!c.parent_comment_id) {
                topLevel.push(commentsById[c.comment_id]);
            } else if (commentsById[c.parent_comment_id]) {
                commentsById[c.parent_comment_id].children.push(commentsById[c.comment_id]);
            }
        });

        // Limit to two levels (only allow reply depth < 2) (限制为两层嵌套)
        function markDepthAndPermissions(list, depth = 0) {
            list.forEach((c) => {
                c.depth = depth;
                c.canReply = depth < 2;
                c.canDelete = !!(req.user && (req.user.userId === c.user_id || req.user.userId === article.user_id));
                if (c.children && c.children.length) {
                    markDepthAndPermissions(c.children, depth + 1);
                }
            });
        }
        markDepthAndPermissions(topLevel, 0);

        res.render('articles/detail', {
            title: article.title,
            article,
            user: req.user || null,
            hasLiked,
            comments: topLevel
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /articles/:id/edit - Edit article form (编辑文章表单，需作者本人)
 */
router.get('/:id/edit', requireAuth, loadArticle, async (req, res, next) => {
    try {
        const article = req.article;
        const isOwner = await ArticleDAO.isOwner(article.article_id, req.session.userId);
        if (!isOwner) {
            return res.status(403).send('You do not have permission to edit this article');
        }

        res.render('articles/form', {
            title: 'Edit Article',
            mode: 'edit',
            article,
            error: null
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /articles/:id/edit - Save article changes (保存文章修改)
 */
router.post('/:id/edit', requireAuth, upload.single('image'), loadArticle, async (req, res, next) => {
    try {
        const article = req.article;
        const isOwner = await ArticleDAO.isOwner(article.article_id, req.session.userId);
        if (!isOwner) {
            return res.status(403).send('You do not have permission to edit this article');
        }

        const { title, content } = req.body;
        if (!title || !title.trim()) {
            return res.render('articles/form', {
                title: 'Edit Article',
                mode: 'edit',
                article: { ...article, title, content },
                error: 'Title is required'
            });
        }
        if (!content || !content.trim()) {
            return res.render('articles/form', {
                title: 'Edit Article',
                mode: 'edit',
                article: { ...article, title, content },
                error: 'Content is required'
            });
        }

        let imagePath = article.image_path || null;
        if (req.body.remove_image === '1') {
            imagePath = null;
        }
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        }

        await ArticleDAO.update(article.article_id, {
            title: title.trim(),
            content: content.trim(),
            image_path: imagePath
        });

        res.redirect(`/articles/${article.article_id}`);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /articles/:id/delete - Delete article (删除文章，需作者本人)
 */
router.post('/:id/delete', requireAuth, loadArticle, async (req, res, next) => {
    try {
        const article = req.article;
        const isOwner = await ArticleDAO.isOwner(article.article_id, req.session.userId);
        if (!isOwner) {
            return res.status(403).send('You do not have permission to delete this article');
        }

        await ArticleDAO.remove(article.article_id);
        res.redirect('/articles/my');
    } catch (err) {
        next(err);
    }
});

/**
 * POST /articles/:id/like - Like (one like per user per article) (点赞，每人每文一次)
 */
router.post('/:id/like', requireAuth, async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.id, 10);
        if (Number.isNaN(articleId)) {
            return res.status(400).json({ ok: false, message: 'Invalid article identifier' });
        }

        const userId = req.session.userId;
        const already = await LikeDAO.hasLiked(userId, articleId);
        if (already) {
            const count = await LikeDAO.countForArticle(articleId);
            return res.json({ ok: true, liked: true, likesCount: count });
        }

        await LikeDAO.addLike(userId, articleId);
        const count = await LikeDAO.countForArticle(articleId);
        res.json({ ok: true, liked: true, likesCount: count });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /articles/:id/comments - Create comment (supports reply) (新建评论，支持回复)
 */
router.post('/:id/comments', requireAuth, async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.id, 10);
        if (Number.isNaN(articleId)) {
            return res.status(400).send('Invalid article identifier');
        }
        const { content, parent_comment_id } = req.body;
        if (!content || !content.trim()) {
            return res.redirect(`/articles/${articleId}`);
        }

        let parentId = parent_comment_id ? parseInt(parent_comment_id, 10) : null;
        if (Number.isNaN(parentId)) parentId = null;

        // If this is a reply, enforce depth limit (最多两层嵌套)
        if (parentId) {
            const depth = await CommentDAO.getDepth(parentId);
            if (depth === null) {
                return res.status(400).send('Parent comment not found');
            }
            if (depth >= 2) {
                return res.status(400).send('Only two levels of replies are allowed');
            }
        }

        await CommentDAO.create({
            article_id: articleId,
            user_id: req.session.userId,
            parent_comment_id: parentId,
            content: content.trim()
        });

        res.redirect(`/articles/${articleId}#comments`);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /articles/:id/comments/:commentId/delete - Delete comment (删除评论)
 */
router.post('/:id/comments/:commentId/delete', requireAuth, async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.id, 10);
        const commentId = parseInt(req.params.commentId, 10);
        if (Number.isNaN(articleId) || Number.isNaN(commentId)) {
            return res.status(400).send('Invalid identifier');
        }

        const comment = await CommentDAO.findById(commentId);
        if (!comment) {
            return res.status(404).send('Comment not found');
        }

        const article = await ArticleDAO.findByIdWithAuthor(articleId);
        if (!article) {
            return res.status(404).send('Article not found');
        }

        const canDelete = req.session.userId === comment.user_id || req.session.userId === article.user_id;
        if (!canDelete) {
            return res.status(403).send('You do not have permission to delete this comment');
        }

        await CommentDAO.remove(commentId);
        res.redirect(`/articles/${articleId}#comments`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;

