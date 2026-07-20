// 입사일/부서발령일 기반 근무기간 자동계산 유틸
// "N년 N개월" 형식, 누락/잘못된 날짜/미래날짜를 안전하게 처리

export type TenureResult = {
  label: string // 화면 표시용: "6년 4개월" | "정보 미입력" | "날짜 오류"
  years: number | null
  months: number | null // 전체 개월수 (연차 계산 등에 재사용 가능)
}

function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d
}

export function calcTenure(dateStr: string | undefined, baseDateStr: string): TenureResult {
  const date = parseDateSafe(dateStr)
  const base = parseDateSafe(baseDateStr) ?? new Date()

  if (!dateStr) return { label: '정보 미입력', years: null, months: null }
  if (!date) return { label: '날짜 오류', years: null, months: null }
  if (date.getTime() > base.getTime()) return { label: '미래 날짜', years: null, months: null }

  let totalMonths =
    (base.getFullYear() - date.getFullYear()) * 12 + (base.getMonth() - date.getMonth())
  if (base.getDate() < date.getDate()) totalMonths -= 1
  totalMonths = Math.max(0, totalMonths)

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const label = years > 0 ? `${years}년 ${months}개월` : `${months}개월`

  return { label, years, months: totalMonths }
}

export function getYear(dateStr?: string): number | null {
  const d = parseDateSafe(dateStr)
  return d ? d.getFullYear() : null
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
