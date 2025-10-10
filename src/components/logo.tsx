import { PocketKnife } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="InvoiceAI Pro Home">
      <div className="bg-primary text-primary-foreground p-2 rounded-md">
        <PocketKnife className="h-6 w-6" />
      </div>
      <span className="text-xl font-bold font-headline">InvoiceAI Pro</span>
    </Link>
  );
}
