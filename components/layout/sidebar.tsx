'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calculator } from 'lucide-react'
import { NAV } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { useData } from '@/lib/store'

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { fileName } = useData()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Calculator className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">인건비 시뮬레이터</p>
          <p className="text-[11px] text-muted-foreground">인상률·배분 계획</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Data status footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">기초 데이터</p>
          <p className="truncate text-xs font-medium text-sidebar-foreground">
            {fileName || '업로드된 파일 없음'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
      <div className="sticky top-0 h-svh">
        <SidebarContent />
      </div>
    </aside>
  )
}
