import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base-100 text-slate-100 selection:bg-primary selection:text-white">
      {children}
    </div>
  );
}
