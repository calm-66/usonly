// 声明 CSS 文件类型，允许 TypeScript 识别 CSS 导入
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

// 声明 leaflet CSS 类型
declare module 'leaflet/dist/leaflet.css' {
  const css: string
  export default css
}