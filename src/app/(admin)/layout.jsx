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
        <div className="flex h-screen overflow-hidden">
          <SideNav />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
