import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Zimska liga Panadić",
  description: "Pioniri i Mlađi pioniri — NK Ban Jelačić",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body className="min-h-screen bg-[#f8f2e8] flex flex-col">

        {/* HEADER */}
        <header className="w-full bg-[#0A5E2A] text-white">
          <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">

            {/* LOGO LEFT */}
            <div className="flex items-center gap-2">
              <Image
                src="/logo_ban.png"
                alt="NK Ban Jelačić Logo"
                width={40}
                height={40}
                className="rounded"
              />
              <span className="text-lg font-semibold">NK Ban Jelačić</span>
            </div>

            {/* TABS RIGHT */}
            <nav className="flex gap-3 text-sm font-medium">
              <Link
                href="/pioniri"
                className="px-3 py-1 bg-white text-[#0A5E2A] rounded shadow hover:bg-gray-200 transition"
              >
                Pioniri
              </Link>
              <Link
                href="/mladji"
                className="px-3 py-1 bg-white text-[#0A5E2A] rounded shadow hover:bg-gray-200 transition"
              >
                Mlađi pioniri
              </Link>
            </nav>

          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="py-4 text-center text-xs text-gray-500">
  © 2025{" "}
  <a
    href="https://promar.hr"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-gray-700 transition"
  >
    promar.hr
  </a>
</footer>
      </body>
    </html>
  );
}
