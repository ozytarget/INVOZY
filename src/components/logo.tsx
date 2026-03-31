import Link from "next/link";

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-1" aria-label="INVOZY Home">
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-blue-500">INV</span>
        <span className="text-foreground">OZY</span>
      </span>
    </Link>
  );
}
