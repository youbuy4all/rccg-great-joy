"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
interface ThemeCtx { theme: Theme; isDark: boolean; toggle: () => void; setTheme: (t: Theme) => void; }
const ThemeContext = createContext<ThemeCtx>({ theme: "light", isDark: false, toggle: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => {
    const stored = localStorage.getItem("rccg-theme") as Theme | null;
    apply(stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }, []);
  const apply = (t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("rccg-theme", t);
  };
  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggle: () => apply(theme === "dark" ? "light" : "dark"), setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
