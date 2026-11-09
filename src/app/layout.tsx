import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "COLLECTIQ", template: "%s · COLLECTIQ" },
  description: "Do the work. Let your agent get you paid. Autonomous AI collections for freelancers, powered by PayPal.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        {/* Dark is the brand's native theme; users can switch in Settings → Appearance. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="bottom-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
