import { Suspense } from 'react';
import { AdminContent } from './AdminContent';
import { Header } from '@/components/Header';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        }
      >
        <AdminContent />
      </Suspense>
    </main>
  );
}
