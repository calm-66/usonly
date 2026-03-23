@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0usonly
node node_modules/prisma/build/index.js migrate dev --name add_username_and_pair_request