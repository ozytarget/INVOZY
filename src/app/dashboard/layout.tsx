
"use client"

import * as React from "react"
import { FileText, User, Users, CreditCard, Settings, Search, Bell, Loader2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { UserNav } from "@/components/user-nav"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/supabase/provider"
import { SearchDialog } from "@/components/search-dialog"
import { NotificationsSheet } from "@/components/notifications-sheet"
import type { Notification } from "@/lib/types"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  
  // Notifications disabled for now - can be added later
  const unreadNotifications: Notification[] = [];

  const navItems = [
    { href: "/dashboard/estimates", icon: <FileText />, label: "Estimates" },
    { href: "/dashboard/invoices", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M11 15h4"/><path d="M11 11h4"/><path d="M11 7h4"/><path d="M7 11h0"/></svg>, label: "Invoices" },
    { href: "/dashboard/clients", icon: <User />, label: "Clients" },
    { href: "/dashboard/payments", icon: <CreditCard />, label: "Payments" },
    { href: "/dashboard/manage", icon: <Settings />, label: "Manage" },
  ]

  const getTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.includes('/create')) {
        const type = pathname.split('/')[2];
        return `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
    const currentNavItem = navItems.find(item => pathname.startsWith(item.href));
    if (currentNavItem) return currentNavItem.label;
    return "Dashboard";
  }

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 px-4 sm:px-6" style={{ backgroundColor: 'hsl(var(--nav-background))', color: 'hsl(var(--nav-foreground))' }}>
        <h1 className="text-xl font-bold">
          {getTitle()}
        </h1>
        <div className="flex items-center gap-2">
          <SearchDialog>
            <Button variant="ghost" size="icon" className="text-current hover:bg-white/10 hover:text-white">
              <Search className="h-5 w-5" />
            </Button>
          </SearchDialog>
          <NotificationsSheet>
            <Button variant="ghost" size="icon" className="relative text-current hover:bg-white/10 hover:text-white">
              <Bell className="h-5 w-5" />
              {unreadNotifications && unreadNotifications.length > 0 && (
                <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </NotificationsSheet>
          <UserNav />
        </div>
      </header>
      <main className="flex-1 flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 overflow-y-scroll">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t pb-safe" style={{ backgroundColor: 'hsl(var(--nav-background))', color: 'hsl(var(--nav-foreground))' }}>
        <div className="grid h-16 w-full grid-cols-5 items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 text-xs font-medium",
                pathname.startsWith(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {React.cloneElement(item.icon, { className: "h-6 w-6" })}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
