
"use client"

import * as React from "react"
import { FileText, User, Users, CreditCard, Settings, Search, Bell, Loader2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { UserNav } from "@/components/user-nav"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/firebase"
import { useDocuments } from "@/hooks/use-documents"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser();
  const { isLoading: isLoadingDocuments } = useDocuments();
  const router = useRouter();

  // Updated nav items based on the image
  const navItems = [
    { href: "/dashboard/estimates", icon: <FileText />, label: "Estimates" },
    { href: "/dashboard/invoices", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M11 15h4"/><path d="M11 11h4"/><path d="M11 7h4"/><path d="M7 11h0"/></svg>, label: "Invoices" },
    { href: "/dashboard/clients", icon: <User />, label: "Clients" },
    { href: "/dashboard/payments", icon: <CreditCard />, label: "Payments" },
    { href: "/dashboard/manage", icon: <Settings />, label: "Manage" },
  ]

  const getTitle = () => {
    // Handle dashboard root
    if (pathname === "/dashboard") return "Dashboard";

    // Handle create pages
    if (pathname.includes('/create')) {
        const type = pathname.split('/')[2]; // estimates or invoices
        return `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
    
    // Find matching nav item for other pages
    const currentNavItem = navItems.find(item => pathname.startsWith(item.href));
    if (currentNavItem) return currentNavItem.label;

    return "Dashboard";
  }

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isLoadingDocuments || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 px-4 sm:px-6" style={{ backgroundColor: 'hsl(var(--nav-background))', color: 'hsl(var(--nav-foreground))' }}>
        <h1 className="text-xl font-bold">
          {getTitle()}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-current hover:bg-white/10 hover:text-white">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-current hover:bg-white/10 hover:text-white">
            <Bell className="h-5 w-5" />
          </Button>
          <UserNav />
        </div>
      </header>
      <main className="flex-1 flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 pb-24">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t" style={{ backgroundColor: 'hsl(var(--nav-background))', color: 'hsl(var(--nav-foreground))' }}>
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
