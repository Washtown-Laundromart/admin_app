import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4 text-[#0b4ea2]">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold uppercase text-[#df1f2d]">Page not found</p>
        <h1 className="mt-3 text-3xl font-bold">This admin page is not available.</h1>
        <p className="mt-3 text-sm text-slate-500">Return to the operations console to continue managing branches, orders, and billing.</p>
        <Link className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#0b4ea2] px-4 text-sm font-semibold text-white" href="/">
          Back to console
        </Link>
      </div>
    </main>
  );
}
