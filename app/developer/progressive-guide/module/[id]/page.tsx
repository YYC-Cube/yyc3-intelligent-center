import dynamic from "next/dynamic"

const MODULE_IDS = [
  "component-basics", "state-management", "routing", "api-integration",
  "data-fetching", "styling", "testing", "deployment", "performance", "security",
]

export function generateStaticParams() {
  return MODULE_IDS.map((id) => ({ id }))
}

const ModuleDetailClient = dynamic(() => import("./client-page"), { ssr: false })

export default function ModuleDetailPage() {
  return <ModuleDetailClient />
}
