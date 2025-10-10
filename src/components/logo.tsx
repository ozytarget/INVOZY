import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="invozzy Home">
      <span className="text-2xl font-bold font-headline italic">
        INVO<span className="text-primary">ZZY</span>
      </span>
    </Link>
  );
}
