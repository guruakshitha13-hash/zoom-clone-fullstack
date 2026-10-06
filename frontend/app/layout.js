import "./globals.css";

export const metadata = {
  title: "ZoomClone — Video Meetings",
  description: "A Zoom-inspired meeting app built with Next.js, FastAPI and SQLite.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
