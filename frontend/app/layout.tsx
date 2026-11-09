import type { Metadata, Viewport } from "next";
import { Newsreader, Public_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-newsreader" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public" });
const splineMono = Spline_Sans_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-spline-mono" });

export const metadata: Metadata = {
  title: "FigureCheck — the same image, twice?",
  description:
    "Report two panels of an open-access research figure as the same image, with a stake. GenLayer validators cut both panels out of the published figure, score them in code and look at them side by side; confirmed findings are paid.",
  manifest: "/site.webmanifest",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
};

export const viewport: Viewport = {
  themeColor: "#F7F4EC",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${publicSans.variable} ${splineMono.variable}`}>
      <body className="graph-paper">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
