@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0..
npx prisma migrate dev --name init
