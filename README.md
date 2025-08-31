# Harmony Tan - AI Research 个人主页

一个现代化的AI研究个人主页，支持Markdown文章展示、PDF文件上传和响应式设计。

## ✨ 功能特性

- 🎨 **现代化设计**: 采用渐变色彩和卡片式布局
- 📱 **响应式设计**: 完美适配桌面端和移动端
- 📝 **Markdown支持**: 支持Markdown格式的文章内容
- 📄 **PDF支持**: 可上传和查看PDF文档
- 🧠 **AI动画**: 神经网络动画效果
- 🚀 **平滑滚动**: 优雅的页面导航体验
- 📊 **研究展示**: 研究领域、演讲、论文等模块

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/harmonytan/harmonytan.github.io.git
cd harmonytan.github.io
```

### 2. 本地预览
直接在浏览器中打开 `index.html` 文件，或者使用本地服务器：

```bash
# 使用Python
python -m http.server 8000

# 使用Node.js
npx serve .

# 使用PHP
php -S localhost:8000
```

然后在浏览器中访问 `http://localhost:8000`

## 📁 项目结构

```
harmonytan.github.io/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # JavaScript功能
├── articles/           # Markdown文章目录
│   └── transformer-evolution.md
└── README.md           # 项目说明
```

## 📝 添加新文章

### 方法1: 通过JavaScript数组添加
在 `script.js` 文件中的 `blogPosts` 数组添加新文章：

```javascript
{
    id: 4,
    title: "文章标题",
    date: "2024-01-20",
    excerpt: "文章摘要...",
    tags: ["标签1", "标签2"],
    content: `
# 文章内容

## 章节标题

文章正文内容...
    `,
    image: "🔬"
}
```

### 方法2: 创建Markdown文件
在 `articles/` 目录下创建 `.md` 文件，然后修改JavaScript代码来读取这些文件。

## 🎨 自定义样式

### 修改颜色主题
在 `styles.css` 中修改CSS变量：

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #7c3aed;
    --accent-color: #60a5fa;
}
```

### 修改字体
在 `index.html` 中更换Google Fonts链接：

```html
<link href="https://fonts.googleapis.com/css2?family=你的字体&display=swap" rel="stylesheet">
```

## 📱 响应式断点

- **桌面端**: > 768px
- **平板端**: 768px - 480px
- **移动端**: < 480px

## 🔧 技术栈

- **HTML5**: 语义化标签和现代HTML特性
- **CSS3**: Flexbox、Grid、动画、渐变
- **JavaScript ES6+**: 模块化、异步处理、DOM操作
- **Font Awesome**: 图标库
- **Google Fonts**: 字体库

## 📚 内容管理

### 研究领域
在 `index.html` 中修改研究领域卡片：

```html
<div class="research-card">
    <div class="research-icon">
        <i class="fas fa-robot"></i>
    </div>
    <h3>你的研究领域</h3>
    <p>研究描述...</p>
</div>
```

### 演讲记录
在 `index.html` 中修改演讲卡片：

```html
<div class="talk-card">
    <div class="talk-date">2024</div>
    <h3>演讲标题</h3>
    <p>演讲描述...</p>
    <div class="talk-links">
        <a href="#" class="talk-link"><i class="fas fa-video"></i> 视频</a>
        <a href="#" class="talk-link"><i class="fas fa-file-pdf"></i> 幻灯片</a>
    </div>
</div>
```

### 论文发表
在 `index.html` 中修改论文条目：

```html
<div class="publication-item">
    <div class="publication-year">2024</div>
    <div class="publication-content">
        <h3>论文标题</h3>
        <p class="publication-authors">作者列表</p>
        <p class="publication-venue">发表会议/期刊</p>
        <div class="publication-links">
            <a href="#" class="publication-link"><i class="fas fa-external-link-alt"></i> 论文</a>
            <a href="#" class="publication-link"><i class="fas fa-file-pdf"></i> PDF</a>
            <a href="#" class="publication-link"><i class="fab fa-github"></i> 代码</a>
        </div>
    </div>
</div>
```

## 🌐 部署到GitHub Pages

1. 将代码推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 选择主分支作为源
4. 访问 `https://你的用户名.github.io/仓库名`

## 🔮 未来计划

- [ ] 添加搜索功能
- [ ] 支持评论系统
- [ ] 添加访问统计
- [ ] 支持多语言
- [ ] 添加暗色主题
- [ ] 集成CMS系统

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📞 联系方式

- 邮箱: harmony.tan@example.com
- GitHub: [@harmonytan](https://github.com/harmonytan)
- LinkedIn: [harmonytan](https://linkedin.com/in/harmonytan)

---

*如果这个项目对你有帮助，请给个⭐️支持一下！*
