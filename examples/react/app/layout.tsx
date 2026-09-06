import type {Metadata} from "next";
import Link from "next/link";
import {Geist, Geist_Mono} from "next/font/google";
import {configureContainer} from '../../../src';
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Reactive State — React example",
    description: "RxJS-based reactive queries with a keyed singleton container",
};

configureContainer({
    debug: true,
    baseDisposalDelay: 10_000,
    hotDisposalDelay: 30_000,
    veryHotDisposalDelay: 60_000,
    maxEntries: 50,
    hotThreshold: 7,
    veryHotThreshold: 15,
});

export default function RootLayout({children}: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="min-h-full flex flex-col">
        <div className="app-shell">
            <header className="site-header">
                <Link className="brand" href="/">Home</Link>
                <nav aria-label="Example pages">
                    <Link href="/pages/currencies">Currencies</Link>
                    <Link href="/pages/markets">Markets</Link>
                </nav>
            </header>
            {children}
        </div>
        </body>
        </html>
    );
}
