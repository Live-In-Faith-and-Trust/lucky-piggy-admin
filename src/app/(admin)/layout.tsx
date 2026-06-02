import { cookies } from 'next/headers'
import AdminHeader from '@/components/layout/AdminHeader'
import AdminSidebar from '@/components/layout/AdminSidebar'
import type { AdminEnv } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const cookieEnv = cookieStore.get('admin_env')?.value
  const env: AdminEnv = cookieEnv === 'staging' ? 'staging' : cookieEnv === 'local' ? 'local' : 'production'

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
