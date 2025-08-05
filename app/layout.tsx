import { Merriweather } from "next/font/google";
import "./globals.css";

const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = {
  title: "Chatbot",
  description: "A simple chatbot built with Next.js and Tailwind CSS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${merriweather.className} min-h-screen flex flex-col bg-gray-50`}>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}