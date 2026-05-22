import type React from "react"
import "./globals.css"
// 添加正确的设计系统CSS导入
import "./styles/design-system.css"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { FavoritesProvider } from "./context/favorites-context"
import { AuthProvider } from "./context/auth-context"
import { EncryptionProvider } from "./context/encryption-context"
import { integrations } from "./data/integrations"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "./components/error-handling/error-boundary"

export const metadata: Metadata = {
  title: "首页 - 言语云集成中心",
  description: "发现、连接并管理强大的集成应用，提升您的业务效率",
  generator: 'YYC³ Intelligent Center',
  icons: {
    icon: '/static/logo.svg'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ErrorBoundary>
            <AuthProvider>
              <EncryptionProvider>
                <FavoritesProvider integrations={integrations}>
                  {children}
                  <Toaster />
                </FavoritesProvider>
              </EncryptionProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}