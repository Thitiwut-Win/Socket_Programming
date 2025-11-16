import Link from "next/link";


export default function IndexPage() {
return (
<div className="flex h-screen bg-yellow-100/30 bg-white dark:bg-slate-800 justify-center items-center p-6">
<div className="w-full max-w-md bg-white dark:bg-slate-700 shadow-xl rounded-2xl p-6 border dark:border-white">
<h1 className="text-3xl font-bold text-center mb-4 dark:text-white">Welcome to Chat App</h1>
<p className="text-center mb-6 text-slate-700 dark:text-slate-300">
Select an option to continue
</p>


<div className="flex flex-col gap-3">
<Link href="/chat" className="w-full">
<button
className="w-full p-3 bg-yellow-400 rounded-xl shadow-md text-black hover:scale-105 hover:shadow-xl active:bg-yellow-500 duration-300 dark:bg-amber-700 dark:text-white"
>
Enter Chat
</button>
</Link>


<Link href="/about" className="w-full">
<button
className="w-full p-3 bg-blue-300 rounded-xl shadow-md text-black hover:scale-105 hover:shadow-xl active:bg-blue-400 duration-300 dark:bg-sky-600 dark:text-white"
>
About This App
</button>
</Link>
</div>
</div>
</div>
);
}