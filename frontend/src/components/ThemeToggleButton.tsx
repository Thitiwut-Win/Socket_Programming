"use client"
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export default function ThemeToggleButton({ className }: { className: string }) {

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), [])

    if (!mounted) return null;

    return (
        <div className={className}>
            <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="relative flex items-center w-18 h-9 rounded-full bg-gray-300 dark:bg-gray-700 
                transition-colors place-self-end"
            >
                <span
                    className={`absolute left-1 top-1 w-7 h-7 flex items-center justify-center rounded-full bg-white 
                        dark:bg-black transition-transform ${theme === "dark" ? "translate-x-9" : "translate-x-0"
                        }`}
                >
                    {theme === "dark" ? (
                        <MoonIcon className="w-5 h-5 text-cyan-500" />
                    ) : (
                        <SunIcon className="w-5 h-5 text-amber-500" />
                    )}
                </span>
            </button>
        </div>
    );
}