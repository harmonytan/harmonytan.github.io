// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function () {

    // 滚动到顶部功能
    const scrollToTopBtn = document.querySelector('.scroll-to-top');

    scrollToTopBtn.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // 显示/隐藏滚动到顶部按钮
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.style.display = 'flex';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    });

    // 初始化时隐藏滚动到顶部按钮
    scrollToTopBtn.style.display = 'none';

    // 导航链接点击事件
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            // 移除所有active类
            navLinks.forEach(l => l.classList.remove('active'));

            // 添加active类到当前点击的链接
            this.classList.add('active');

            // 这里可以添加页面切换逻辑
            console.log('导航到:', this.textContent);
        });
    });

    // 博客文章卡片点击事件
    const postCards = document.querySelectorAll('.post-card');

    postCards.forEach(card => {
        card.addEventListener('click', function () {
            // 添加点击效果
            this.style.transform = 'scale(0.98)';

            setTimeout(() => {
                this.style.transform = '';
            }, 150);

            // 这里可以添加跳转到文章详情页的逻辑
            const title = this.querySelector('.post-title').textContent;
            console.log('查看文章:', title);
        });

        // 鼠标悬停效果
        card.addEventListener('mouseenter', function () {
            this.style.borderColor = '#4a90e2';
        });

        card.addEventListener('mouseleave', function () {
            this.style.borderColor = '#333';
        });
    });

    // 社交图标点击事件
    const socialIcons = document.querySelectorAll('.social-icon');

    socialIcons.forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();

            // 添加点击动画
            this.style.transform = 'scale(0.8) rotate(360deg)';

            setTimeout(() => {
                this.style.transform = '';
            }, 300);

            // 这里可以添加社交媒体链接跳转逻辑
            const platform = this.querySelector('i').className;
            console.log('点击社交平台:', platform);
        });
    });

    // 平滑滚动效果
    function smoothScroll(target, duration) {
        const targetPosition = target.getBoundingClientRect().top;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = ease(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }

        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }

        requestAnimationFrame(animation);
    }

    // 添加页面加载动画
    window.addEventListener('load', function () {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease-in';

        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 100);
    });

    // 键盘快捷键支持
    document.addEventListener('keydown', function (e) {
        // Ctrl/Cmd + K 打开搜索
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            console.log('打开搜索');
            // 这里可以添加搜索功能
        }

        // ESC 键关闭任何打开的模态框
        if (e.key === 'Escape') {
            console.log('关闭模态框');
            // 这里可以添加关闭模态框的逻辑
        }
    });

    // 添加滚动进度指示器
    function updateScrollProgress() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.offsetHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;

        // 创建进度条样式
        if (!document.querySelector('.scroll-progress')) {
            const progressBar = document.createElement('div');
            progressBar.className = 'scroll-progress';
            progressBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 0%;
                height: 3px;
                background: linear-gradient(90deg, #4a90e2, #7b68ee);
                z-index: 1000;
                transition: width 0.1s ease;
            `;
            document.body.appendChild(progressBar);
        }

        const progressBar = document.querySelector('.scroll-progress');
        progressBar.style.width = scrollPercent + '%';
    }

    window.addEventListener('scroll', updateScrollProgress);

    // 初始化滚动进度
    updateScrollProgress();

    // 添加主题切换功能（可选）
    const themeToggle = document.querySelector('.fa-sun');

    themeToggle.addEventListener('click', function () {
        const body = document.body;
        const isDark = body.classList.contains('light-theme');

        if (isDark) {
            body.classList.remove('light-theme');
            this.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.add('light-theme');
            this.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        }
    });

    // 检查本地存储的主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('.fa-sun').className = 'fas fa-moon';
    }

    console.log('博客网站初始化完成！');
});
