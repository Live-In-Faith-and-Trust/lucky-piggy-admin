'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const menus = [
  { label: '대시보드', href: '/dashboard' },
  { label: '당첨자 관리', href: '/draws' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
      <nav className="p-3 space-y-0.5">
        {menus.map((menu) => (
          <Link
            key={menu.href}
            href={menu.href}
            className={cn(
              'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
              pathname === menu.href || pathname.startsWith(menu.href + '/')
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {menu.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
