"use client"

import { FileText, FileSignature, LayoutDashboard, Settings, Users } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { UserNav } from "@/components/user-nav"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/dashboard/estimates", icon: <FileText />, label: "Estimates" },
    { href: "/dashboard/invoices", icon: <FileSignature />, label: "Invoices" },
    { href: "/dashboard/clients", icon: <Users />, label: "Clients" },
    { href: "/dashboard/settings", icon: <Settings />, label: "Settings" },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">
          {navItems.find(item => pathname.startsWith(item.href))?.label || "Dashboard"}
        </h1>
        <UserNav />
      </header>
      <main className="flex-1 flex-col gap-4 p-4 pb-24 sm:gap-6 sm:p-6 sm:pb-6">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card md:hidden">
        <div className="grid h-16 w-full grid-flow-col-dense justify-around">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 text-xs font-medium",
                pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
