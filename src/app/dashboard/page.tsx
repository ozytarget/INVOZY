'use client';

import { RecentDocumentsTable } from "@/components/dashboard/recent-documents-table";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/estimates/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Estimate
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        <StatsCards />
        <RecentDocumentsTable />
      </div>
    </div>
  );
}
