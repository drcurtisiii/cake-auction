import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-[#F0F4F9] to-white">
      <div className="text-center max-w-lg">
        <div className="text-6xl mb-6">🎂</div>
        <h1 className="text-5xl font-bold text-[#1B3C6D] mb-4">
          Cake Auction
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          School fundraiser — bid on delicious cakes to support student trips!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#E8602C] text-white font-semibold rounded-lg hover:bg-[#C74E1F] transition-colors"
          >
            Admin Login
          </Link>
        </div>
        <p className="mt-8 text-sm text-gray-400">
          Auction links will be shared by your organizer
        </p>
      </div>
    </main>
  );
}
