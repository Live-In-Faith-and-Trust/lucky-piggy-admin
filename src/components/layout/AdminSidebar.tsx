'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, Trophy, ToggleLeft, Megaphone, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type SubMenuItem = { label: string; href: string }
type MenuItem = { label: string; href: string; icon: LucideIcon; children?: SubMenuItem[] }

const menus: MenuItem[] = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '당첨자 관리', href: '/draws', icon: Trophy },
  { label: 'Feature Flags', href: '/feature-flags', icon: ToggleLeft },
  {
    label: '공지사항',
    href: '/banner',
    icon: Megaphone,
    children: [
      { label: '홈 공지 배너 관리', href: '/banner' },
      { label: '공지사항 컨텐츠 관리', href: '/notices' },
    ],
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto flex flex-col">
      {/* 브랜드 로고 영역 */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="relative h-8 w-8 flex-shrink-0">
          <Image src="/logo.png" alt="Lucky Piggy" width={32} height={32} className="rounded-md object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground leading-tight tracking-tight">당첨돼지</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Admin Console</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-2 space-y-0.5 pt-3">
        {menus.map((menu) => {
          const childActive = menu.children?.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + '/'),
          ) ?? false
          const isActive = pathname === menu.href || pathname.startsWith(menu.href + '/') || childActive
          return (
            <div key={menu.href}>
              <Link
                href={menu.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium',
                )}
              >
                <menu.icon className="w-4 h-4 flex-shrink-0" />
                <span className="tracking-tight">{menu.label}</span>
              </Link>
              {menu.children && menu.children.map((child) => {
                const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/')
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg pl-9 pr-3 py-1.5 text-xs transition-colors mt-0.5',
                      isChildActive
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium',
                    )}
                  >
                    <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                    <span className="tracking-tight">{child.label}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* 하단 버전 */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground tracking-tight">v0.1.0 · internal only</p>
      </div>
    </aside>
  )
}
