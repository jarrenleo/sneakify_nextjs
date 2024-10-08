import { GeistSans } from "geist/font/sans";
import QueryProvider from "./_providers/QueryProvider";
import ThemeProvider from "./_providers/ThemeProvider";
import ContextProvider from "./_providers/ContextProvider";
import Navigation from "./_components/navigation/Navigation";
import "./globals.css";

export const metadata = {
  title: "Sneakify",
  description: "SNKRS/Nike Calendar App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className}`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ContextProvider>
              <main className="mx-auto max-w-7xl">
                <Navigation />
                {children}
              </main>
            </ContextProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
