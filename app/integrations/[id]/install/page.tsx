import dynamic from "next/dynamic"

export function generateStaticParams() {
  return Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1) }))
}

const IntegrationInstallClient = dynamic(() => import("./client-page"), { ssr: false })

export default function IntegrationInstallPage() {
  return <IntegrationInstallClient />
}
