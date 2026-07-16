import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f8] px-4 text-[#102532]">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold uppercase text-[#13a7a5]">Page not found</p>
        <h1 className="mt-3 text-3xl font-bold">This admin page is not available.</h1>
        <p className="mt-3 text-sm text-slate-500">Return to the operations console to continue managing branches, orders, and billing.</p>
        <Link className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#102532] px-4 text-sm font-semibold text-white" href="/">
          Back to console
        </Link>
      </div>
    </main>
  );
}
