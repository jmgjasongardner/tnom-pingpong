'use client';

import Image from 'next/image';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        <Image
          src="/technomics-logo.png"
          alt="Technomics"
          width={180}
          height={45}
          priority
        />
        <div className="h-8 w-px bg-gray-300" />
        <h1 className="text-xl font-semibold text-gray-800">
          Ping Pong Tournament
        </h1>
      </div>
    </header>
  );
}
