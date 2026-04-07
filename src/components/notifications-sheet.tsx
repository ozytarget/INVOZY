

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
import { Eye, PenLine } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Switch } from "./ui/switch"
import { playAlertSound } from "@/lib/alert-sound"

const NOTIFICATIONS_STORAGE_KEY = 'appNotifications';
const NOTIFICATIONS_SOUND_KEY = 'notificationsSoundEnabled';

export function NotificationsSheet({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const lastTimestampRef = useRef<number>(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(NOTIFICATIONS_SOUND_KEY);
    const enabled = stored === 'true';
    setSoundEnabled(enabled);
    soundEnabledRef.current = enabled;
  }, []);

  const playNotificationSound = useCallback(() => {
    playAlertSound();
  }, []);

  const handleToggleSound = useCallback(async (checked: boolean) => {
    setSoundEnabled(checked);
    soundEnabledRef.current = checked;
    if (typeof window !== 'undefined') {
      localStorage.setItem(NOTIFICATIONS_SOUND_KEY, String(checked));
    }
    if (checked) {
      await playNotificationSound();
    }
  }, [playNotificationSound]);

  const updateNotificationsState = useCallback((items: Notification[]) => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setNotifications(sorted);

    const newestTimestamp = sorted[0]?.timestamp ? new Date(sorted[0].timestamp).getTime() : 0;
    if (initializedRef.current && soundEnabledRef.current && newestTimestamp > lastTimestampRef.current) {
      void playNotificationSound();
    }
    lastTimestampRef.current = newestTimestamp;
    initializedRef.current = true;
  }, [playNotificationSound]);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          updateNotificationsState(data.notifications);
          return;
        }
      }
    } catch {
      // fall back to localStorage
    }
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Notification[]) : [];
    updateNotificationsState(parsed);
  };

  // Load on mount and poll every 30s
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh immediately when sheet is opened
  useEffect(() => {
    if (open) loadNotifications();
  }, [open]);

  const persistNotifications = async (updated: Notification[]) => {
    setNotifications(updated);
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: updated }),
      });
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      }
    }
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <p className="text-sm font-medium">Sound alerts</p>
            <p className="text-xs text-muted-foreground">Play a sound when clients view or sign.</p>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={handleToggleSound} />
        </div>
        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                {notifications && notifications.length > 0 ? (
                    notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={cn(
                          "p-4 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 flex gap-3 items-start",
                          !notification.isRead ? "bg-primary/10" : "bg-muted/20"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        <div className="mt-0.5 shrink-0">
                          {notification.event === 'signed'
                            ? <PenLine className="h-4 w-4 text-green-500" />
                            : <Eye className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {notification.timestamp ? formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true }) : 'just now'}
                          </p>
                        </div>
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
