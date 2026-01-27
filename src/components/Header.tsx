'use client';

import Image from 'next/image';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full mx-auto px-6 py-4 flex items-center gap-4">
        <Image
          src="/technomics-logo.png"
          alt="Technomics"
          width={160}
          height={40}
          priority
        />
        <div className="h-8 w-px bg-gray-300" />
        <h1 className="text-xl font-bold text-teal-700">
          March Madness Ping Pong Tournament
        </h1>
      </div>
    </header>
  );
}
