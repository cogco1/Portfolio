# Kaiwen Liu — 作品集网站 / Portfolio Website

一个自包含的静态网站（纯白事务所风、中英双语），无需任何环境，双击 `index.html` 即可查看。
A self-contained static site (white studio style, bilingual). Just double-click `index.html`.

## 结构 / Structure
```
portfolio_site/
├─ index.html              首页（4 分类）/ Home (4 categories)
├─ about.html              关于 / 简历 / About / CV
├─ styles.css              全站样式 / Global styles
├─ site.js                 灯箱脚本 / Lightbox
├─ Kaiwen_Liu_CV.pdf       可下载简历 / Downloadable CV
├─ covers/                    首页缩略图 cover-*.jpg / Home thumbnails
├─ images/                 项目大图 / Project images
└─ projects/               14 个项目页 / 14 project pages
```

## 发布到 GitHub Pages（免费、可得公开网址，黏给别人）
Publish on GitHub Pages — free public URL you can paste to anyone.

1. 注册并登录 https://github.com → 右上角 **New repository** 新建仓库。
   - 仓库名建议 `portfolio`（或 `你的用户名.github.io`，后者网址更短）。
   - 选 **Public**，不要勾 README，创建。
2. 在仓库页点 **Add file → Upload files**，把 **`portfolio_site` 文件夹里的全部内容**（注意：是里面的 `index.html` 等，不要把外层文件夹一起拖）拖进去上传，**Commit changes**。
3. 仓库 **Settings → Pages**：
   - Source 选 **Deploy from a branch**；Branch 选 **main**、文件夹 **/(root)**；Save。
4. 等 1–3 分钟，页面顶部会显示网址：
   - `https://你的用户名.github.io/portfolio/` （或 `https://你的用户名.github.io/`）
   把这个网址黏给任何人即可打开。

> 之后要更新：改完文件，在仓库 **Upload files** 重新上传覆盖，或用 GitHub Desktop 推送。

### 备选 / Alternative — Netlify Drop（最快）
打开 https://app.netlify.com/drop → 把整个 `portfolio_site` 文件夹拖进去 → 几秒得到网址。

## 换图 / Replace images
- 项目大图放进 `images/`；首页缩略图放进 `covers/`（命名 `cover-项目.jpg`，4:3 最佳）。
- 详情页把 `<img src="../images/xxx.png">` 换成你的文件名即可；点击图片会全屏放大（灯箱）。

## 注意 / Notes
- **Line+ 项目**：按合作合同，其成果知识产权归 line+ 所有。相关页面（`line-collaboration.html`、`line-internship.html`）及素材已通过 `.gitignore` 从本仓库排除，待获得书面同意后再补上。
- 中文使用系统字体（PingFang / 微软雅黑）渲染，无需额外安装。
- 当前图片总量约 110MB；如需进一步加速，可把 `images/` 里的大图转成 JPG 再压一轮。

## 版权 / License
见 [LICENSE.md](LICENSE.md)：作品内容版权所有，模板代码可署名后自用于非商业作品集。
See [LICENSE.md](LICENSE.md): content is all-rights-reserved; template code may be reused for personal, non-commercial portfolios with attribution.
