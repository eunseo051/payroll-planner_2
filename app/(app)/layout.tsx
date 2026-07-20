import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { Info } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 md:px-6">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            현재 계산 기준(전체·자연 인상률, 등급별 배분, 승진 기준)은 <b>확정되지 않은 가정값</b>이며, 데이터는
            가상 데이터입니다. 모든 급여·인건비 수치는 승급·입퇴사 시점을 반영한 <b>실제 연간 지출액이 아니라
            연환산 추정치</b>예요. 실제 기준과 데이터를 확인하는 대로 계산식만 교체할 수 있도록 구성되어 있어요.
          </p>
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
