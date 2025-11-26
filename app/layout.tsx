import "./globals.css";
import Image from "next/image";
import { LeagueSelector } from "@/components/LeagueSelector";

export const metadata = {
  title: "Liga Panadić 2025/26",
  description: "Zimska liga Panadić 2025/26",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body className="min-h-screen bg-[#f7f1e6] flex flex-col">

        {/* HEADER */}
        <header className="w-full bg-[#0b5b2a] text-[#f7f1e6] shadow">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

            {/* LEFT: LOGO + NAZIV */}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Liga Panadić logo"
                width={36}
                height={36}
                className="rounded-full"
              />
              <span className="text-lg sm:text-xl font-semibold">
                Liga Panadić 2025/26
              </span>
            </div>

            {/* RIGHT: DROPDOWN */}
            <div>
              <LeagueSelector />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 w-full">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="w-full bg-[#0b5b2a] text-[#f7f1e6]">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

            <Image
              src="/logo.png"
              alt="Promar logo"
              width={28}
              height={28}
              className="rounded-full"
            />

            <a
              href="https://promar.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
            >
              © 2025 Promar.hr
            </a>
          </div>
        </footer>

      </body>
    </html>
  );
}
