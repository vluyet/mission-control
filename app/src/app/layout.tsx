import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { getMessages } from "@/lib/i18n/messages";
import { resolveRequestLocale } from "@/lib/i18n/server";
import "./globals.css";

const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const messages = getMessages(locale);

  return {
    title: messages.metadata.title,
    description: messages.metadata.description
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveRequestLocale();
  const messages = getMessages(locale);

  return (
    <html lang={locale}>
      <body className={`${body.variable} ${mono.variable}`} data-locale={locale} data-language={messages.common.localeName}>
        {children}
      </body>
    </html>
  );
}
