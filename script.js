// 主题管理
let currentTheme = localStorage.getItem('theme') || 'light';

// 初始化主题
function initTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

// 切换主题
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

// 更新主题图标
function updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');

    if (currentTheme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// 页面导航管理
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            // 添加活动状态
            link.classList.add('active');
            const targetPage = link.getAttribute('data-page');
            document.getElementById(targetPage).classList.add('active');

            // 移动端关闭侧边栏
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
            }
        });
    });
}

// 移动端菜单切换
function initMobileMenu() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

// 博客文章数据
const blogPosts = [
    {
        id: 1,
        title: "Transformer架构的演进与优化",
        date: "2024-01-15",
        excerpt: "探讨Transformer架构从2017年提出至今的发展历程，以及最新的优化技术...",
        tags: ["深度学习", "Transformer", "NLP"],
        content: `
# Transformer架构的演进与优化

## 引言

Transformer架构自2017年由Google提出以来，已经彻底改变了自然语言处理领域。本文将深入探讨Transformer的发展历程和最新优化技术。

## 原始Transformer架构

### 核心组件

1. **多头自注意力机制**
   - 允许模型关注输入序列的不同部分
   - 并行计算，提高训练效率

2. **位置编码**
   - 为序列中的每个位置添加位置信息
   - 支持不同长度的输入序列

### 优势

- 并行化训练
- 长距离依赖建模
- 可扩展性强

## 最新优化技术

### 1. 稀疏注意力
- 减少计算复杂度
- 保持模型性能

### 2. 线性注意力
- 将二次复杂度降低到线性
- 适合长序列处理

### 3. 混合专家模型
- 动态路由机制
- 提高模型容量

## 未来发展方向

1. **效率优化**
2. **架构创新**
3. **多模态融合**

## 结论

Transformer架构仍在快速发展中，未来将出现更多创新技术。
        `,
        image: "🧠"
    },
    {
        id: 2,
        title: "大语言模型在医疗领域的应用",
        date: "2024-01-10",
        excerpt: "分析大语言模型如何改变医疗诊断、药物发现和患者护理的现状...",
        tags: ["医疗AI", "大语言模型", "应用"],
        content: `
# 大语言模型在医疗领域的应用

## 概述

大语言模型（LLM）在医疗领域的应用正在快速发展，为医疗行业带来了革命性的变化。

## 主要应用场景

### 1. 医疗诊断
- 症状分析
- 疾病预测
- 辅助诊断

### 2. 药物发现
- 分子设计
- 靶点识别
- 临床试验设计

### 3. 患者护理
- 个性化治疗方案
- 健康监测
- 患者教育

## 技术挑战

1. **数据隐私**
2. **模型可解释性**
3. **临床验证**

## 未来展望

医疗AI将成为医疗行业的重要组成部分。
        `,
        image: "🏥"
    },
    {
        id: 3,
        title: "多模态学习的最新进展",
        date: "2024-01-05",
        excerpt: "探索视觉、语言、音频等多模态数据的联合学习方法和应用...",
        tags: ["多模态", "计算机视觉", "NLP"],
        content: `
# 多模态学习的最新进展

## 什么是多模态学习

多模态学习是指同时处理多种类型数据（如文本、图像、音频、视频）的机器学习方法。

## 关键技术

### 1. 特征融合
- 早期融合
- 晚期融合
- 混合融合

### 2. 跨模态对齐
- 语义对齐
- 时序对齐
- 空间对齐

### 3. 预训练模型
- CLIP
- DALL-E
- GPT-4V

## 应用领域

1. **智能助手**
2. **内容生成**
3. **自动驾驶**

## 挑战与机遇

多模态学习为AI系统提供了更丰富的感知能力。
        `,
        image: "🔗"
    }
];

// 渲染博客文章
function renderBlogPosts() {
    const postsContainer = document.getElementById('posts-container');

    blogPosts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.innerHTML = `
            <div class="post-image">
                ${post.image}
            </div>
            <div class="post-content">
                <div class="post-date">${post.date}</div>
                <h3 class="post-title">${post.title}</h3>
                <p class="post-excerpt">${post.excerpt}</p>
                <div class="post-tags">
                    ${post.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')}
                </div>
                <button class="read-more-btn" onclick="openArticle(${post.id})">
                    阅读全文
                </button>
            </div>
        `;
        postsContainer.appendChild(postCard);
    });
}

// 打开文章模态框
function openArticle(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (!post) return;

    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-content');

    // 将Markdown转换为HTML（简单实现）
    const htmlContent = convertMarkdownToHtml(post.content);
    content.innerHTML = htmlContent;

    modal.style.display = 'block';
}

// 简单的Markdown转HTML函数
function convertMarkdownToHtml(markdown) {
    return markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[h|li|p])(.+)$/gim, '<p>$1</p>')
        .replace(/<p><\/p>/g, '')
        .replace(/<p><h/g, '<h')
        .replace(/<\/h[1-6]><\/p>/g, '</h$1>');
}



// 关闭模态框
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('article-modal').style.display = 'none';
});

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
    const modal = document.getElementById('article-modal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});



// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化主题
    initTheme();
    detectSystemTheme();
    watchSystemTheme();

    // 初始化导航
    initNavigation();

    // 初始化移动端菜单
    initMobileMenu();

    // 渲染博客文章
    renderBlogPosts();

    // 绑定事件
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.querySelector('.close').addEventListener('click', closeModal);

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('article-modal');
        if (e.target === modal) {
            closeModal();
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
        if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            toggleTheme();
        }
    });
});

// 系统主题检测
function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        if (!localStorage.getItem('theme')) {
            currentTheme = 'dark';
            initTheme();
        }
    }
}

// 监听系统主题变化
function watchSystemTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            currentTheme = e.matches ? 'dark' : 'light';
            initTheme();
        }
    });
}

// 平滑滚动到顶部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 添加返回顶部按钮
function addBackToTopButton() {
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTop.className = 'back-to-top';
    backToTop.onclick = scrollToTop;

    document.body.appendChild(backToTop);

    // 显示/隐藏按钮
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.style.display = 'block';
        } else {
            backToTop.style.display = 'none';
        }
    });
}

// 页面完全加载后添加返回顶部按钮
window.addEventListener('load', () => {
    addBackToTopButton();
});
