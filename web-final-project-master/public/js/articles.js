// Front-end logic for article list and likes (文章列表与点赞前端逻辑)

(function () {
    // Sort buttons: use fetch to update list without full page reload (排序按钮：使用 fetch 更新列表，避免整页刷新)
    var sortButtons = document.querySelectorAll('.sort-button');
    var articleList = document.getElementById('articleList');
    var likesStoragePrefix = 'likesCount:';
    var likedStoragePrefix = 'liked:';

    function saveLikeState(articleId, likesCount) {
        try {
            if (articleId) {
                if (likesCount !== undefined && likesCount !== null) {
                    localStorage.setItem(likesStoragePrefix + articleId, String(likesCount));
                }
                localStorage.setItem(likedStoragePrefix + articleId, '1');
            }
        } catch (e) {
            /* Ignore storage errors */
        }
    }

    function applyStoredLikeState() {
        if (!articleList) return;
        var items = articleList.querySelectorAll('.article-item');
        items.forEach(function (item) {
            var articleId = item.getAttribute('data-article-id');
            if (!articleId) return;
            try {
                var storedCount = localStorage.getItem(likesStoragePrefix + articleId);
                if (storedCount !== null) {
                    var countElement = item.querySelector('.likes-count');
                    if (countElement) countElement.textContent = storedCount;
                }
                var liked = localStorage.getItem(likedStoragePrefix + articleId);
                if (liked === '1') {
                    var button = item.querySelector('.like-button');
                    if (button) {
                        button.textContent = '👍 Liked';
                        button.disabled = true;
                        button.dataset.liked = '1';
                        button.title = 'You have already liked this article';
                    }
                }
            } catch (e) {
                /* Ignore storage errors */
            }
        });
    }

    function renderArticles(data) {
        if (!articleList || !data || !Array.isArray(data.articles)) return;
        var logoutLink = document.querySelector('a[href="/auth/logout"]');
        var userLoggedIn = !!logoutLink; // Simple check (简单判断)
        articleList.innerHTML = '';
        if (data.articles.length === 0) {
            articleList.innerHTML = '<li>No articles yet.</li>';
            return;
        }

        data.articles.forEach(function (a) {
            var li = document.createElement('li');
            li.className = 'article-item';
            li.setAttribute('data-article-id', a.article_id);
            li.innerHTML =
                '<h2><a href=\"/articles/' + a.article_id + '\">' + a.title + '</a></h2>' +
                '<p class=\"meta meta-with-avatar\">' +
                '<img class=\"avatar-small\" src=\"' + (a.avatar_path || '/images/avatars/avatar1.png') + '\" alt=\"' + a.username + ' avatar\">' +
                '<span>Author: ' + a.username + ' | Published: ' + a.created_at + '</span>' +
                '</p>' +
                '<p class=\"likes\">' +
                '<button class=\"like-button\" data-article-id=\"' + a.article_id + '\" ' + (userLoggedIn ? '' : 'disabled title=\"Login required to like\"') + '>👍 Like</button> ' +
                '<span class=\"likes-count\">' + (a.likes_count || 0) + '</span> Likes' +
                '</p>';
            articleList.appendChild(li);
        });
        applyStoredLikeState();
    }

    function buildUrlWithSort(url, sort, order, json) {
        var u = new URL(url, window.location.origin);
        u.searchParams.set('sort', sort);
        u.searchParams.set('order', order);
        if (json) {
            u.searchParams.set('format', 'json');
        } else {
            u.searchParams.delete('format');
        }
        return u.toString();
    }

    sortButtons.forEach(function (button) {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            if (!articleList) return;
            var sort = button.getAttribute('data-sort');
            var order = button.getAttribute('data-order') || 'desc';
            // Toggle ascending or descending order (切换升序或降序)
            order = order === 'asc' ? 'desc' : 'asc';
            button.setAttribute('data-order', order);

            var jsonUrl = buildUrlWithSort(window.location.pathname, sort, order, true);
            var pageUrl = buildUrlWithSort(window.location.pathname, sort, order, false);
            fetch(jsonUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(function (r) {
                    if (r.redirected && r.url && r.url.indexOf('/auth/login') !== -1) {
                        window.location.href = '/auth/login';
                        return null;
                    }
                    var contentType = r.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) {
                        window.location.href = pageUrl;
                        return null;
                    }
                    return r.json();
                })
                .then(function (data) {
                    if (data) renderArticles(data);
                })
                .catch(function () {
                    window.location.href = pageUrl;
                });
        });
    });

    // Like button handler for list and detail pages (点赞按钮，列表页和详情页共用)
    function handleLike(articleId, likesCountElement, button) {
        if (button && button.dataset.liked === '1') return;
        if (!likesCountElement && button && button.parentElement) {
            likesCountElement = button.parentElement.querySelector('.likes-count');
        }
        var previousCount = likesCountElement ? parseInt(likesCountElement.textContent || '0', 10) : null;
        if (likesCountElement && !isNaN(previousCount)) {
            likesCountElement.textContent = previousCount + 1;
        }
        if (button) {
            button.textContent = '👍 Liked';
            button.disabled = true;
            button.dataset.liked = '1';
            button.title = 'You have already liked this article';
        }
        fetch('/articles/' + articleId + '/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        })
            .then(function (r) {
                if (r.redirected && r.url && r.url.indexOf('/auth/login') !== -1) {
                    window.location.href = '/auth/login';
                    return null;
                }
                var contentType = r.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) return null;
                return r.json();
            })
            .then(function (data) {
                if (data && data.ok === false) {
                    if (likesCountElement && previousCount !== null && !isNaN(previousCount)) {
                        likesCountElement.textContent = previousCount;
                    }
                    if (button) {
                        button.textContent = '👍 Like';
                        button.disabled = false;
                        button.dataset.liked = '0';
                        button.title = '';
                    }
                    return;
                }
                if (likesCountElement && data && data.likesCount !== undefined) {
                    var parsedCount = parseInt(data.likesCount, 10);
                    if (!isNaN(parsedCount)) {
                        likesCountElement.textContent = parsedCount;
                        saveLikeState(articleId, parsedCount);
                    }
                }
            })
            .catch(function () { /* Ignore errors (忽略错误) */ });
    }

    // Like button in list view (列表页中的点赞按钮)
    if (articleList) {
        articleList.addEventListener('click', function (e) {
            var target = e.target;
            if (!target.classList.contains('like-button')) return;
            e.preventDefault();
            if (target.disabled) return;
            var li = target.closest('.article-item');
            if (!li) return;
            var articleId = target.getAttribute('data-article-id') || li.getAttribute('data-article-id');
            var likesCountElement = li.querySelector('.likes-count');
            handleLike(articleId, likesCountElement, target);
        });
        applyStoredLikeState();
    }

    // Like button in detail view (详情页点赞按钮)
    var detailLikeButton = document.getElementById('likeButton');
    if (detailLikeButton && !detailLikeButton.disabled) {
        detailLikeButton.addEventListener('click', function (e) {
            e.preventDefault();
            var articleId = detailLikeButton.getAttribute('data-article-id');
            var likesCountElement = document.getElementById('likesCount');
            handleLike(articleId, likesCountElement, detailLikeButton);
        });
    }

    window.addEventListener('pageshow', function () {
        applyStoredLikeState();
    });
})();

