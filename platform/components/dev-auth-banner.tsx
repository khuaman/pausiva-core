"use client";

import { useAuth } from "@/contexts/AuthContext";

export function DevAuthBanner() {
  const { user } = useAuth();
  const bypassEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  if (!bypassEnabled || !user) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-yellow-500 text-yellow-950 px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
      <span className="text-lg">⚠️</span>
      <div>
        <div className="font-bold">DEV MODE: Auth Bypass Active</div>
        <div className="text-xs opacity-90">
          Logged in as: {user.name} ({user.role})
        </div>
      </div>
    </div>
  );
}

