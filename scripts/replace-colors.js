#!/usr/bin/env node

/**
 * 颜色替换脚本 (Color Replacement Script)
 * 
 * 用途：批量替换项目中的硬编码颜色值为新的配色方案
 * Usage: Batch replace hardcoded color values with new color scheme
 * 
 * 执行方式 (Usage):
 *   node scripts/replace-colors.js
 * 
 * 颜色映射说明 (Color Mapping):
 *   - 主按钮 (Primary Button): #db2777 → #EC4899
 *   - 主按钮 hover (Primary Button Hover): #be185d → #E11D74
 *   - 我的帖子卡片背景 (My Post Card Background): #fef2f2 → #FFF1F2
 *   - 打印按钮背景 (Print Button Background): #db2777 → #EC4899
 *   - 打印按钮 hover (Print Button Hover): #be185d → #E11D74
 */

const fs = require('fs');
const path = require('path');

// 颜色替换映射表 (Color Replacement Mapping)
// 键：原颜色 (Original Color)，值：新颜色 (New Color)
// 注意：只替换明确的按钮/激活状态颜色，不替换普通文字
const colorReplacements = [
  // Tailwind 类名替换 - 主按钮背景色 (Main Button Background)
  { old: 'bg-gray-800', new: 'bg-primary', desc: '主按钮背景 (Main Button Background)' },
  { old: 'bg-gray-900', new: 'bg-primary-hover', desc: '主按钮 hover 背景 (Main Button Hover Background)' },
  // HEX 颜色替换
  { old: '#db2777', new: '#EC4899', desc: '主按钮 HEX (Primary Button HEX)' },
  { old: '#be185d', new: '#E11D74', desc: '主按钮 hover HEX (Primary Button Hover HEX)' },
  { old: '#fef2f2', new: '#FFF1F2', desc: '我的帖子卡片背景 (My Post Card Background)' },
  // RGBA 颜色替换 (RGBA Color Replacements)
  { old: 'rgba(219, 39, 119, 0.4)', new: 'rgba(236, 72, 153, 0.4)', desc: '主按钮阴影 (Primary Button Shadow)' },
  { old: 'rgba(219, 39, 119, 0.5)', new: 'rgba(236, 72, 153, 0.5)', desc: '主按钮 hover 阴影 (Primary Button Hover Shadow)' },
  { old: 'rgba(219, 39, 119,', new: 'rgba(236, 72, 153,', desc: '主按钮 RGBA 通用 (Primary Button RGBA)' },
];

// 需要处理的文件扩展名 (File Extensions to Process)
const targetExtensions = ['.tsx', '.ts', '.js', '.jsx'];

// 需要处理的目录 (Directories to Process)
const targetDirs = ['src'];

/**
 * 递归遍历目录并替换颜色
 * Recursively traverse directories and replace colors
 */
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 和 .next 目录
      // Skip node_modules and .next directories
      if (file === 'node_modules' || file === '.next' || file === '.git') {
        continue;
      }
      processDirectory(filePath);
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (targetExtensions.includes(ext)) {
        processFile(filePath);
      }
    }
  }
}

/**
 * 转义正则表达式中的特殊字符
 * Escape special characters in regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 处理单个文件
 * Process a single file
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  let replacedCount = 0;
  
  for (const { old, new: newColor, desc } of colorReplacements) {
    // 转义特殊字符后创建正则表达式
    // Create regex after escaping special characters
    const escapedOld = escapeRegExp(old);
    const regex = new RegExp(escapedOld, 'gi');
    const matches = content.match(regex);
    
    if (matches) {
      content = content.replace(regex, newColor);
      replacedCount += matches.length;
    }
  }
  
  // 只有当内容发生变化时才写入文件
  // Only write to file if content has changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ 已更新: ${filePath}`);
    console.log(`  替换了 ${replacedCount} 处颜色值`);
  }
}

/**
 * 主函数
 * Main function
 */
function main() {
  console.log('========================================');
  console.log('  颜色替换脚本 (Color Replacement Script)');
  console.log('========================================');
  console.log('');
  console.log('颜色映射 (Color Mapping):');
  
  for (const { old, new: newColor, desc } of colorReplacements) {
    console.log(`  ${old} → ${newColor}  (${desc})`);
  }
  
  console.log('');
  console.log('开始处理文件... (Processing files...)');
  console.log('');
  
  let totalReplacements = 0;
  
  for (const dir of targetDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      const filesBefore = [];
      const countFiles = (d) => {
        const items = fs.readdirSync(d);
        for (const item of items) {
          const itemPath = path.join(d, item);
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory() && item !== 'node_modules' && item !== '.next') {
            countFiles(itemPath);
          } else if (stat.isFile() && targetExtensions.includes(path.extname(item))) {
            filesBefore.push(itemPath);
          }
        }
      };
      countFiles(dirPath);
      
      const contentBefore = filesBefore.map(f => fs.readFileSync(f, 'utf-8')).join('');
      
      processDirectory(dirPath);
      
      const contentAfter = filesBefore.map(f => fs.readFileSync(f, 'utf-8')).join('');
      
      // 计算总替换次数
      for (const { old } of colorReplacements) {
        const escapedOld = escapeRegExp(old);
        const beforeCount = (contentBefore.match(new RegExp(escapedOld, 'gi')) || []).length;
        const afterCount = (contentAfter.match(new RegExp(escapedOld, 'gi')) || []).length;
        totalReplacements += beforeCount - afterCount;
      }
    }
  }
  
  console.log('');
  console.log('========================================');
  console.log(`  替换完成！共替换了 ${totalReplacements} 处颜色值`);
  console.log('========================================');
}

main();