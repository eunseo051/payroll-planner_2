import {
  LayoutDashboard,
  Database,
  ClipboardList,
  SlidersHorizontal,
  Calculator,
  TrendingUp,
  ShieldCheck,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '조직·기초데이터', href: '/data', icon: Database },
  { label: '인사·근무평가', href: '/evaluation', icon: ClipboardList },
  { label: '인상률·배분 설정', href: '/rates', icon: SlidersHorizontal },
  { label: '급여 시뮬레이션', href: '/simulation', icon: Calculator },
  { label: '승진 추정', href: '/promotion', icon: TrendingUp },
  { label: '데이터 품질 센터', href: '/data-quality', icon: ShieldCheck },
  { label: '휴가·유연근무', href: '/workforce', icon: CalendarClock },
]
