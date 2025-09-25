import './globals.css';

export const metadata = {
  title: 'Laptop Shop Backend',
  description: 'Backend for Laptop Shop',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}