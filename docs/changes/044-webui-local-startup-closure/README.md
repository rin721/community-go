# 044 WebUI 本地启动闭环修复

状态：已完成。

## 范围

本变更修复 042 WebUI 首次真实启动暴露的两个阻塞：Chi 挂载通用 `http.Handler` 时没有改写 `URL.Path`，导致嵌套 `http.ServeMux` 永远匹配不到 manifest/Auth；Vite 只设置 `https: true` 却没有证书，导致 TLS 握手失败。用户随后把 HTTPS 临时改为 HTTP，但 `Secure` Session Cookie 在该模式下不能工作。

修复只闭合当前本地启动链，不实施 043 命名迁移，不改变 Auth、Session、权限或页面范围。

## 阅读顺序

1. [研究索引](research/README.md)
2. [需求](requirements.md)
3. [设计](design.md)
4. [任务](tasks.md)
