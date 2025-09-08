'use client';

import Link from 'next/link';

export default function TopBar() {
  return (
    <div className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl p-3 flex items-center justify-between">
        <div className="font-semibold text-slate-900">Inspection Reports</div>
        <Link
          href="/home"
          className="rounded-md border px-3 py-1.5 text-slate-900 hover:bg-gray-50"
        >
          Home
        </Link>
      </div>
    </div>
  );
}