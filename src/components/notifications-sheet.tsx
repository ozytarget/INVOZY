

'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { Notification } from "@/lib/types"
import { formatDistanceToNow } from 'date-fns'
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

const NOTIFICATIONS_STORAGE_KEY = 'appNotifications';

export function NotificationsSheet({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const loadNotifications = () => {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Notification[]) : [];
      parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(parsed);
    };

    loadNotifications();
    window.addEventListener('storage', loadNotifications);

    return () => {
      window.removeEventListener('storage', loadNotifications);
    };
  }, []);

  const persistNotifications = (updated: Notification[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    setNotifications(updated);
  };

  const handleMarkAllAsRead = async () => {
    const updated = notifications.map(notification => ({ ...notification, isRead: true }));
    persistNotifications(updated);
  }

  const handleNotificationClick = (notification: Notification) => {
    const updated = notifications.map(item =>
      item.id === notification.id ? { ...item, isRead: true } : item
    );
    persistNotifications(updated);
    router.push(`/view/${notification.documentType.toLowerCase()}/${notification.documentId}?internal=true`);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                {notifications && notifications.length > 0 ? (
                    notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={cn(
                          "p-4 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                          !notification.isRead ? "bg-primary/10" : "bg-muted/20"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        <p className="font-medium">{notification.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.timestamp ? formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true }) : 'just now'}
                        </p>
                    </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                    <p>You have no notifications.</p>
                    </div>
                )}
                </div>
            </ScrollArea>
        </div>
         {notifications && notifications.some(n => !n.isRead) && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
