// Comment show/hide and reply logic (评论显示/隐藏与回复逻辑)

(function () {
    var toggleButton = document.getElementById('toggleCommentsButton');
    var container = document.getElementById('commentsContainer');

    if (toggleButton && container) {
        toggleButton.addEventListener('click', function () {
            if (container.style.display === 'none') {
                container.style.display = '';
            } else {
                container.style.display = 'none';
            }
        });
    }

    // Reply button: write parent comment identifier into the comment form (回复按钮：写入父评论标识符)
    document.addEventListener('click', function (e) {
        var target = e.target;
        if (!target.classList.contains('reply-button')) return;
        e.preventDefault();
        var parentId = target.getAttribute('data-parent-id');
        var form = document.querySelector('.comment-form');
        if (!form) return;
        var hidden = form.querySelector('input[name="parent_comment_id"]');
        if (hidden) {
            hidden.value = parentId;
        }
        var textarea = form.querySelector('textarea[name="content"]');
        if (textarea) {
            textarea.focus();
        }
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
})();

