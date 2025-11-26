import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Liga Panadić 2025/26",
  description: "Malonogometna liga Panadić 2025/26",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <body className="min-h-screen bg-[#f7f1e6] flex flex-col text-black">

        {/* HEADER */}
        <header className="w-full bg-[#0A5E2A] text-[#f7f1e6] shadow">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
            
            {/* LEFT TITLE */}
            <div className="flex items-center gap-3">
              <span className="text-lg sm:text-xl font-semibold">
                Liga Panadić 2025/26
              </span>
            </div>

            {/* RIGHT (temporary placeholder — dropdown ide u sljedećem koraku) */}
            <div className="text-sm opacity-80">
              Odaberi ligu…
            </div>

          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="w-full bg-[#0A5E2A] text-[#f7f1e6]">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">

            {/* LEFT LOGO */}
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Promar Logo"
                width={32}
                height={32}
              />
            </div>

            {/* RIGHT LINK */}
            <Link
              href="https://promar.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
            >
              © 2025 Promar.hr
            </Link>

          </div>
        </footer>

      </body>
    </html>
  );
}
