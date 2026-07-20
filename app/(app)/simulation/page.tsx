'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calculator, FileDown, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useData } from '@/lib/store'
import { computeAll, fmtWon, fmtPct, ComputedEmployee } from '@/lib/calc'
import { exportResults } from '@/lib/excel'

type SortKey = keyof ComputedEmployee
type SortState = { key: SortKey | null; dir: 1 | -1 }

const GRADE_STYLES: Record<string, string> = {
  S: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  A: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  B: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  C: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  D: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
}

export default function SimulationPage() {
  const { employees, params } = useData()
  const computed = useMemo(() => computeAll(employees, params), [employees, params])

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [sort, setSort] = useState<SortState>({ key: null, dir: 1 })

  const depts = useMemo(() => [...new Set(employees.map((e) => e.dept))], [employees])

  const rows = useMemo(() => {
    let r = [...computed]
    const q = search.trim().toLowerCase()
    if (q) r = r.filter((e) => e.name.toLowerCase().includes(q) || e.dept.toLowerCase().includes(q))
    if (deptFilter !== 'all') r = r.filter((e) => e.dept === deptFilter)
    if (sort.key) {
      r.sort((a, b) => {
        const av = a[sort.key as SortKey]
        const bv = b[sort.key as SortKey]
        if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sort.dir
        return ((av as number) > (bv as number) ? 1 : (av as number) < (bv as number) ? -1 : 0) * sort.dir
      })
    }
    return r
  }, [computed, search, deptFilter, sort])

  function toggleSort(key: SortKey) {
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))
  }

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calculator className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">시뮬레이션할 데이터가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">먼저 조직·기초데이터를 업로드해주세요.</p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  const cols: { key: SortKey; label: string; num?: boolean }[] = [
    { key: 'name', label: '이름' },
    { key: 'dept', label: '부서' },
    { key: 'grade', label: '평가등급' },
    { key: 'step', label: '호봉', num: true },
    { key: 'totalTenureLabel', label: '총근무기간' },
    { key: 'tenure', label: '근속(년)', num: true },
    { key: 'baseSalary', label: '현재연봉', num: true },
    { key: 'individualRate', label: '인상률', num: true },
    { key: 'newSalary', label: '인상후 연환산연봉', num: true },
    { key: 'monthlyPay', label: '이번달 예상급여', num: true },
    { key: 'laborCost', label: '개인 인건비', num: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm font-semibold">직원별 상세 ({rows.length}명)</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="이름 · 부서 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[180px]"
            />
            <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="전체 부서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportResults(computed)}>
              <FileDown className="size-4" /> 엑셀로 내보내기
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map((c) => (
                    <TableHead
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={`cursor-pointer select-none whitespace-nowrap hover:text-foreground ${c.num ? 'text-right' : ''}`}
                    >
                      {c.label}
                      {sort.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {r.name}
                        {r.salarySource.startsWith('fallback') && (
                          <AlertTriangle
                            className="size-3.5 text-red-500"
                            aria-label="봉급표 미매칭 — 업로드 연봉 그대로 사용"
                          >
                            <title>
                              봉급표 미매칭 —{' '}
                              {r.salarySource === 'fallback-no-position' ? '직급 정보 없음' : '해당 호봉 정보 없음'}
                              , 업로드 연봉 그대로 사용
                            </title>
                          </AlertTriangle>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.dept}</TableCell>
                    <TableCell>
                      <Badge className={GRADE_STYLES[r.grade] ?? GRADE_STYLES.B} variant="secondary">
                        {r.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{r.step ?? '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.totalTenureLabel}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{r.tenure}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtWon(r.baseSalary)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-primary">
                      {fmtPct(r.individualRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtWon(r.newSalary)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtWon(r.monthlyPay)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtWon(r.laborCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
