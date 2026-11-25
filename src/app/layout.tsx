import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "INDAPO",
  description: "Sistema interno de administración de INDAPO.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-BO">
      <body>{children}</body>
    </html>
  );
}
