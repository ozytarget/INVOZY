"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "lucide-react";

type UserSettings = {
    contractorName: string;
    companyEmail: string;
    userAvatar: string;
}

export function UserNav() {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem("companySettings");
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            {settings?.userAvatar && <AvatarImage src={settings.userAvatar} alt="User avatar" />}
            <AvatarFallback>
                {settings?.contractorName ? settings.contractorName.charAt(0).toUpperCase() : <User />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{settings?.contractorName || "Contractor"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {settings?.companyEmail || "contractor@example.com"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
           <DropdownMenuItem asChild>
                <Link href="/dashboard/manage">Settings</Link>
            </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">Log out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
