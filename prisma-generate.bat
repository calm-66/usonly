@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0usonly
node node_modules/prisma/build/index.js generate