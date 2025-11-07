
'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase"
import { collection, doc, query, orderBy, writeBatch } from "firebase/firestore"
import type { Notification } from "@/lib/types"
import { formatDistanceToNow } from 'date-fns'
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function NotificationsSheet({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);

  const handleMarkAllAsRead = async () => {
    if (!user || !notifications || notifications.length === 0) return;

    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const batch = writeBatch(firestore);
    unreadNotifications.forEach(notification => {
      const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
      batch.update(notifRef, { isRead: true });
    });
    await batch.commit();
  }

  const handleNotificationClick = (notification: Notification) => {
    const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
    const batch = writeBatch(firestore);
    batch.update(notifRef, { isRead: true });
    batch.commit().then(() => {
      router.push(`/view/${notification.documentType.toLowerCase()}/${notification.documentId}`);
    });
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
