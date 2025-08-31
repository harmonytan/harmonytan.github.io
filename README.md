# Lil'Log - 个人学习笔记博客

一个现代化的静态博客网站，基于GitHub Pages部署。

## ✨ 特性

- 🎨 **深色主题设计** - 护眼的深色主题，支持主题切换
- 📱 **响应式布局** - 完美适配各种设备尺寸
- 🚀 **现代化UI** - 简洁美观的卡片式设计
- ⚡ **性能优化** - 轻量级静态网站，加载速度快
- 🔍 **搜索友好** - SEO优化，易于搜索引擎收录
- 📊 **阅读体验** - 清晰的排版和阅读时间估算

## 🛠️ 技术栈

- **HTML5** - 语义化标记
- **CSS3** - 现代化样式和动画
- **JavaScript ES6+** - 交互功能和用户体验
- **Font Awesome** - 图标库
- **GitHub Pages** - 免费托管服务

## 📁 项目结构

```
harmonytan.github.io/
├── index.html          # 主页
├── styles.css          # 样式文件
├── script.js           # 交互脚本
├── articles/           # 文章目录
├── .github/workflows/  # GitHub Actions配置
└── README.md           # 项目说明
```

## 🚀 快速开始

### 本地开发

1. 克隆项目
```bash
git clone https://github.com/harmonytan/harmonytan.github.io.git
cd harmonytan.github.io
```

2. 使用本地服务器预览
```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx http-server -p 8000
```

3. 在浏览器中访问 `http://localhost:8000`

### 部署到GitHub Pages

1. 推送代码到GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. 在GitHub仓库设置中启用GitHub Pages
   - 进入仓库设置 → Pages
   - Source选择 "Deploy from a branch"
   - Branch选择 "gh-pages"

3. GitHub Actions会自动构建和部署网站

## 📝 添加新文章

1. 在 `articles/` 目录下创建新的HTML文件
2. 在 `index.html` 中添加文章卡片
3. 推送代码，网站会自动更新

## 🎨 自定义主题

网站支持深色和浅色主题切换：

- 点击右上角的太阳/月亮图标切换主题
- 主题选择会保存在本地存储中

## 📱 响应式设计

- **桌面端** - 完整功能，最佳体验
- **平板端** - 适配中等屏幕
- **移动端** - 触摸友好，导航优化

## 🔧 配置选项

### 修改网站信息

编辑 `index.html` 中的以下内容：
- 博客标题
- 作者信息
- 社交媒体链接
- 欢迎信息

### 自定义样式

编辑 `styles.css` 中的CSS变量：
- 主题色彩
- 字体设置
- 布局参数

## 🌟 功能特性

- **导航系统** - 清晰的页面导航
- **文章卡片** - 美观的文章展示
- **社交链接** - 社交媒体集成
- **滚动进度** - 阅读进度指示器
- **平滑滚动** - 优雅的页面滚动
- **键盘快捷键** - 提升操作效率

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📞 联系方式

- GitHub: [@harmonytan](https://github.com/harmonytan)
- 博客: [harmonytan.github.io](https://harmonytan.github.io)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
