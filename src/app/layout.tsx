import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Parikshit Abuj | Portfolio", template: "%s | Parikshit Abuj" },
  description: "Experience, selected projects, and skills. Explore my work and download my latest resume.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
