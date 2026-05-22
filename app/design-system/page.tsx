import type { Metadata } from "next"
import { DesignSystem } from "@/app/components/ui/design-system"

export const metadata: Metadata = {
  title: "设计系统 - 言语云集成中心",
  description: "统一的UI设计系统，确保整个应用保持一致的视觉风格",
}

export default function DesignSystemPage() {
  return <DesignSystem />
}
