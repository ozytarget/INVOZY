import { ClientsList } from "@/components/clients/clients-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Clients</h1>
        <Button asChild>
          <Link href="/dashboard/clients/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>
      <ClientsList />
    </div>
  );
}
