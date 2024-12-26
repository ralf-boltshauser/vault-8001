"use client";

import { AdminControls } from "@/components/admin/AdminControls";

export default function AdminPage() {
  // useEffect(() => {
  //   if (!isAdmin) {
  //     router.push("/");
  //   }
  // }, [isAdmin, router]);

  // if (!isAdmin) {
  //   return null;
  // }

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <AdminControls />
    </main>
  );
}
