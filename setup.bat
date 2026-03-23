@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0
npx -y create-next-app@latest usonly --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm