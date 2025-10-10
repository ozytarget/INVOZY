import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { MoveRight } from "lucide-react";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 md:px-6 flex items-center justify-between">
        <Logo />
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Login</Link>
        </Button>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Effortless Invoicing, Smarter Estimates
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Welcome to InvoiceAI Pro. Create professional estimates and invoices with AI-powered suggestions to optimize pricing, refine descriptions, and identify upsells.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/dashboard">
                      Get Started for Free
                      <MoveRight className="ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://picsum.photos/seed/hero/600/400"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="business finance"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="flex items-center justify-center p-4 text-sm text-muted-foreground">
        © {new Date().getFullYear()} InvoiceAI Pro. All rights reserved.
      </footer>
    </div>
  );
}
