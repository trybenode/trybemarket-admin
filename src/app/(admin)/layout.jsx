import Header from "../../components/Header";
import SideNav from "../../components/SideNav";

export const metadata = {
  title: "TrybeMarket Admin",
  description: "Admin dashboard for TrybeMarket",
};

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Header />

        <div className="flex">
          <SideNav />

          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
