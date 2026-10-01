import React from "react";

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#020617] text-white select-none">
      {children}
    </div>
  );
}
