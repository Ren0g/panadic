import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Malonogometna liga Panadić 2025/2026",
  description: "Zimska liga Panadić 2025/2026",

  // OVO JE BITNO: manifest se zove manifest.json i živi u /public
  manifest: "/manifest.json",

  themeColor: "#0b5b2a",

  icons: {
    // favicon / tab ikona
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS ikona za dodavanje na Home Screen
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <body className="min-h-screen bg-[#f7f1e6] flex flex-col">
        {/* HEADER */}
        <header className="w-full bg-[#0b5b2a] text-[#f7f1e6] shadow cursor-default">
          <div className="w-full text-center py-4 leading-tight">
            {/* RED 1 */}
            <div className="text-xl sm:text-2xl font-semibold">
              Malonogometna liga Panadić
            </div>

            {/* RED 2 */}
            <div className="text-sm sm:text-base opacity-90">
              Sezona 2025/2026
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 w-full flex justify-center">
          <div className="w-full max-w-3xl px-4 py-6">{children}</div>
        </main>

        {/* FOOTER */}
        <footer className="w-full bg-[#0b5b2a] text-[#f7f1e6] py-4">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/logo.png"
              alt="Promar logo"
              width={26}
              height={26}
              className="rounded-full"
            />
            <a
              href="https://promar.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline cursor-pointer"
            >
              © 2025 Promar.hr
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
