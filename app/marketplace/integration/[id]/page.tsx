import dynamic from "next/dynamic"

export function generateStaticParams() {
  return Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1) }))
}

const IntegrationDetailClient = dynamic(() => import("./client-page"), { ssr: false })

export default function IntegrationDetailPage() {
  return <IntegrationDetailClient />
}
