import dynamic from "next/dynamic"

const STATIC_CATEGORIES = [
  "数据分析", "营销推广", "效率工具", "销售管理", "财务管理",
  "通信工具", "云端服务", "安全防护", "设计创意", "开发工具",
  "人力资源", "客户支持", "电子商务", "社交媒体", "内容管理",
  "教育培训", "医疗健康", "物联网", "区块链", "人工智能",
  "虚拟现实", "增强现实", "游戏开发", "移动应用", "办公自动化",
  "视频处理", "音频处理", "3D建模", "地理信息",
]

export function generateStaticParams() {
  return STATIC_CATEGORIES.map((c) => ({ category: encodeURIComponent(c) }))
}

const CategoryClient = dynamic(() => import("./client-page"), { ssr: false })

export default function CategoryPage() {
  return <CategoryClient />
}
