@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0usonly

echo Generating Prisma Client...
node node_modules/prisma/build/index.js generate

echo Running database migration...
node node_modules/prisma/build/index.js migrate dev --name init

echo Seeding database...
node prisma/seed.js

echo Done!