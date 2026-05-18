import { cookies } from 'next/headers'
import AdminHeader from '@/components/layout/AdminHeader'
import AdminSidebar from '@/components/layout/AdminSidebar'
import type { AdminEnv } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const env = (cookieStore.get('admin_env')?.value === 'staging' ? 'staging' : 'production') as AdminEnv

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AdminHeader defaultEnv={env} />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
