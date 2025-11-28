import "./globals.css";
import Image from "next/image";

export const metadata = {
  title: "Malonogometna liga Panadić 2025/2026",
  description: "Zimska liga Panadić 2025/2026",
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
        <header className="w-full bg-[#0b5b2a] text-[#f7f1e6] shadow">
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
          <div className="w-full max-w-3xl px-4 py-6">
            {children}
          </div>
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
