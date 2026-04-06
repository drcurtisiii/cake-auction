import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">Admin</span>
          <Link
            href="/"
            className="text-sm font-medium text-[#1B3C6D] transition-colors hover:text-[#E8602C]"
          >
            Return to Main Page
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
