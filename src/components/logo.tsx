import Link from "next/link";
import Image from "next/image";

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label="INVOZY Home">
      <Image
        src="/icons/icon-192x192.png"
        alt="INVOZY"
        width={32}
        height={32}
        className="h-8 w-8 rounded-md object-contain"
        priority
      />
      <span className="text-lg font-bold tracking-wide">INVOZY</span>
    </Link>
  );
}
