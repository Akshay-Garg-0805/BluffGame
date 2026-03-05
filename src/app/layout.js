import "./globals.css";
import AuthProvider from "@/components/AuthProvider/AuthProvider";

export const metadata = {
  title: "Bluff - Online Multiplayer Card Game",
  description: "Play the classic card game Bluff with friends online. Create a room, invite friends, and bluff your way to victory!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
