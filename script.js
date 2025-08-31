// 导航栏交互
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// 关闭移动端菜单
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 导航栏滚动效果
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

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
    const blogContainer = document.getElementById('blog-container');

    blogPosts.forEach(post => {
        const blogCard = document.createElement('div');
        blogCard.className = 'blog-card';
        blogCard.innerHTML = `
            <div class="blog-image">
                ${post.image}
            </div>
            <div class="blog-content">
                <div class="blog-date">${post.date}</div>
                <h3 class="blog-title">${post.title}</h3>
                <p class="blog-excerpt">${post.excerpt}</p>
                <div class="blog-tags">
                    ${post.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
                </div>
                <button class="btn btn-primary" style="margin-top: 1rem; width: 100%;" onclick="openArticle(${post.id})">
                    阅读全文
                </button>
            </div>
        `;
        blogContainer.appendChild(blogCard);
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

// 添加PDF上传功能
function addPDFUpload() {
    const blogContainer = document.getElementById('blog-container');

    const uploadCard = document.createElement('div');
    uploadCard.className = 'blog-card';
    uploadCard.innerHTML = `
        <div class="blog-image">
            📄
        </div>
        <div class="blog-content">
            <h3 class="blog-title">上传PDF文章</h3>
            <p class="blog-excerpt">支持PDF格式的研究论文、技术报告等文档</p>
            <input type="file" id="pdf-upload" accept=".pdf" style="display: none;">
            <button class="btn btn-secondary" style="margin-top: 1rem; width: 100%;" onclick="document.getElementById('pdf-upload').click()">
                选择PDF文件
            </button>
            <div id="pdf-preview" style="margin-top: 1rem;"></div>
        </div>
    `;

    blogContainer.appendChild(uploadCard);

    // PDF文件上传处理
    document.getElementById('pdf-upload').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = function (e) {
                const pdfPreview = document.getElementById('pdf-preview');
                pdfPreview.innerHTML = `
                    <div style="background: #e0e7ff; padding: 1rem; border-radius: 8px; text-align: center;">
                        <p style="margin: 0; color: #2563eb; font-weight: 500;">
                            📎 ${file.name} 已选择
                        </p>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #6b7280;">
                            文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button class="btn btn-primary" style="margin-top: 0.5rem;" onclick="viewPDF('${e.target.result}')">
                            查看PDF
                        </button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    });
}

// 查看PDF
function viewPDF(pdfDataUrl) {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-content');

    content.innerHTML = `
        <h2>PDF文档查看器</h2>
        <iframe src="${pdfDataUrl}" width="100%" height="500px" style="border: none; border-radius: 8px;"></iframe>
        <div style="margin-top: 1rem;">
            <a href="${pdfDataUrl}" download class="btn btn-primary">下载PDF</a>
        </div>
    `;

    modal.style.display = 'block';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    renderBlogPosts();
    addPDFUpload();

    // 添加滚动动画
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // 观察所有卡片元素
    document.querySelectorAll('.research-card, .talk-card, .publication-item, .blog-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

// 添加打字机效果
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// 为英雄标题添加打字机效果
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        typeWriter(heroTitle, originalText, 150);
    }
});
