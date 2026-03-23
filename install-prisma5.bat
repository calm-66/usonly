@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0usonly
npm install prisma@5 @prisma/client@5 --save-dev