import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "TrybeMarket Admin",
  description: "Admin dashboard for TrybeMarket",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
