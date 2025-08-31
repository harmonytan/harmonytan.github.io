# Harmony Tan - AI Research 个人主页

一个极简风格的AI研究个人主页，采用侧边栏导航和分页布局，支持黑白主题切换。

## ✨ 功能特性

- 🎨 **极简设计**: 清爽的侧边栏布局，专注于内容展示
- 🌓 **主题切换**: 支持亮色/暗色主题，自动跟随系统设置
- 📱 **响应式设计**: 完美适配桌面端和移动端
- 📝 **分页布局**: 首页、文章、链接三个独立页面
- 📄 **Markdown支持**: 支持Markdown格式的文章内容
- 🚀 **平滑动画**: 优雅的页面切换和悬停效果
- 🔧 **现代化技术**: 使用CSS变量和现代JavaScript特性

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
├── index.html          # 主页面（侧边栏 + 分页布局）
├── styles.css          # 极简风格CSS样式
├── script.js           # 分页导航和主题切换功能
├── articles/           # Markdown文章目录
│   └── transformer-evolution.md
└── README.md           # 项目说明
```

## 🎨 设计特点

### 侧边栏导航
- **首页**: 个人介绍、研究领域、统计数据
- **Post**: 研究文章和技术分享
- **Link**: 有用的资源和链接

### 主题系统
- **亮色主题**: 清爽的白色背景，适合白天使用
- **暗色主题**: 护眼的深色背景，适合夜间使用
- **自动检测**: 跟随系统主题设置自动切换
- **手动切换**: 点击侧边栏底部的主题按钮

### 响应式布局
- **桌面端**: 固定侧边栏 + 主内容区域
- **移动端**: 可折叠侧边栏 + 全屏内容

## 📝 添加新文章

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

## 🎨 自定义样式

### 修改颜色主题
在 `styles.css` 中修改CSS变量：

```css
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-sidebar: #f1f3f4;
    --text-primary: #1a1a1a;
    --accent-color: #1a73e8;
}
```

### 修改字体
在 `index.html` 中更换Google Fonts链接：

```html
<link href="https://fonts.googleapis.com/css2?family=你的字体&display=swap" rel="stylesheet">
```

## 📱 响应式断点

- **桌面端**: > 768px（固定侧边栏）
- **移动端**: ≤ 768px（可折叠侧边栏）

## 🔧 技术栈

- **HTML5**: 语义化标签和现代HTML特性
- **CSS3**: CSS变量、Flexbox、Grid、动画
- **JavaScript ES6+**: 模块化、事件处理、DOM操作
- **Font Awesome**: 图标库
- **Google Fonts**: 字体库

## 📚 内容管理

### 首页内容
在 `index.html` 中修改首页的三个卡片：

```html
<div class="intro-card">
    <!-- 个人介绍 -->
</div>

<div class="research-card">
    <!-- 研究领域 -->
</div>

<div class="stats-card">
    <!-- 统计数据 -->
</div>
```

### 文章管理
在 `script.js` 中修改 `blogPosts` 数组来管理文章。

### 链接管理
在 `index.html` 中修改链接页面的内容：

```html
<div class="link-category">
    <h3>分类标题</h3>
    <div class="link-list">
        <a href="#" class="link-item">
            <i class="fas fa-external-link-alt"></i>
            <span>链接名称</span>
        </a>
    </div>
</div>
```

## 🌐 部署到GitHub Pages

1. 将代码推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 选择主分支作为源
4. 访问 `https://你的用户名.github.io/仓库名`

## ⌨️ 键盘快捷键

- **Esc**: 关闭模态框
- **Ctrl/Cmd + T**: 切换主题

## 🔮 未来计划

- [ ] 添加搜索功能
- [ ] 支持评论系统
- [ ] 添加访问统计
- [ ] 支持多语言
- [ ] 添加文章分类
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
