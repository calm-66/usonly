web应用开发遵循以下规则：
- 先确认当前是否在preview分支，如果不是，要提醒用户。
- 本地修改代码时要根据生产环境的标准去执行。部署在Vercel, 数据库使用的Neon.
- 修改完代码后，不执行本地测试。如果数据库的表需要迁移，生成手动neon sql脚本，由用户进行迁移。
- 自动修改推送到github，分别执行: `git add -A`，`git commit -m "..."` 和 `git push origin preview` 


