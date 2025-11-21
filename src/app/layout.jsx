import "./globals.css";
import Header from "../components/Header";
import SideNav from "../components/SideNav";

export const metadata = {
  title: "TrybeMarket Admin",
  description: "Admin dashboard for TrybeMarket",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Header />
      <SideNav />
      <body>{children}</body>
    </html>
  );
}
