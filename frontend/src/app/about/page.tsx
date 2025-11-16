"use client";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };
  return (
    <div className="flex h-screen bg-yellow-100/30 bg-white dark:bg-slate-800 justify-center items-center p-6">
      <div className="w-full max-w-xl bg-white dark:bg-slate-700 shadow-xl rounded-2xl p-6 border dark:border-white">
        <h1 className="text-3xl font-bold text-center mb-4 dark:text-white">
          About This Chat App
        </h1>

        <p className="text-slate-700 dark:text-slate-300 mb-4 text-center">
          This app is a simple real‑time chat interface supporting:
        </p>

        <ul className="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
          <li>Private messaging</li>
          <li>Group chats</li>
          <li>AI-powered chat mode</li>
          <li>Username registration</li>
          <li>Light & dark mode support</li>
        </ul>

        <p className="mt-6 text-slate-700 dark:text-slate-300 text-center">
          Built with <span className="font-semibold">Next.js</span>,
          <span className="font-semibold"> React</span>, and
          <span className="font-semibold"> TailwindCSS</span>.
        </p>
        <button
          onClick={handleBack}
          className="
  mt-3
    px-5 py-2 w-full 
    bg-yellow-400 text-black
    rounded-xl shadow-md
    hover:scale-105 hover:shadow-xl
    active:bg-yellow-500
    transition-all duration-300
    border border-transparent hover:border-yellow-900
    dark:bg-amber-700 dark:text-white dark:hover:border-amber-50
  "
        >
          Back
        </button>
      </div>
    </div>
  );
}
