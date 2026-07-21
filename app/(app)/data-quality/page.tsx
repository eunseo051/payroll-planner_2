'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Database, CalendarDays, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useData } from '@/lib/store'
import { useWorkforce } from '@/lib/workforce-store'
import {
  validateAllData,
  SEVERITY_LABEL,
  SOURCE_LABEL,
  SEVERITY_RANK,
  type ValidationIssue,
  type Severity,
  type IssueSource,
} from '@/lib/data-validation'

const SEVERITY_BADGE: Record<Severity, string> = {
  error: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  review: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
}

const SOURCE_BADGE: Record<IssueSource, string> = {
  employee: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  leave: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  'work-schedule': 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  system: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
}

export default function DataQualityPage() {
  const { employees, params } = useData()
  const { leaveBalances, leaveRecords, workSchedules } = useWorkforce()

  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [nameQuery, setNameQuery] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.dept).filter(Boolean))).sort(),
    [employees],
  )
  const positions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.position).filter(Boolean))).sort(),
    [employees],
  )

  const allIssues = useMemo(
    () => validateAllData(employees, params, leaveBalances, leaveRecords, workSchedules),
    [employees, params, leaveBalances, leaveRecords, workSchedules],
  )

  // 직원별 최고 심각도
  const empSeverity = useMemo(() => {
    const map = new Map<number, Severity>()
    allIssues.forEach((iss) => {
      if (iss.employeeId === undefined) return
      const cur = map.get(iss.employeeId)
      if (!cur || SEVERITY_RANK[iss.severity] > SEVERITY_RANK[cur]) {
        map.set(iss.employeeId, iss.severity)
      }
    })
    return map
  }, [allIssues])

  const summary = useMemo(() => {
    let errorCount = 0
    let warningCount = 0
    let reviewCount = 0
    let normalCount = 0
    employees.forEach((e) => {
      const sev = empSeverity.get(e.id)
      if (sev === 'error') errorCount++
      else if (sev === 'warning') warningCount++
      else if (sev === 'review') reviewCount++
      else normalCount++
    })
    return {
      total: employees.length,
      normal: normalCount,
      error: errorCount,
      warning: warningCount,
      review: reviewCount,
    }
  }, [employees, empSeverity])

  const issueCounts = useMemo(() => {
    let error = 0
    let warning = 0
    let review = 0
    allIssues.forEach((iss) => {
      if (iss.severity === 'error') error++
      else if (iss.severity === 'warning') warning++
      else review++
    })
    return { error, warning, review, total: allIssues.length }
  }, [allIssues])

  const filteredIssues = useMemo(() => {
    return allIssues.filter((iss) => {
      if (severityFilter !== 'all' && iss.severity !== severityFilter) return false
      if (sourceFilter !== 'all' && iss.source !== sourceFilter) return false
      if (deptFilter !== 'all' && iss.department !== deptFilter) return false
      if (positionFilter !== 'all' && iss.position !== positionFilter) return false
      if (nameQuery && iss.employeeName && !iss.employeeName.toLowerCase().includes(nameQuery.toLowerCase())) return false
      return true
    })
  }, [allIssues, severityFilter, sourceFilter, deptFilter, positionFilter, nameQuery])

  const selectedIssue = useMemo(
    () => allIssues.find((i) => i.id === selectedIssueId) ?? null,
    [allIssues, selectedIssueId],
  )

  // 빈 상태: 직원 없음
  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">등록된 직원이 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            데이터 품질 검사를 하려면 먼저 직원 기초데이터가 필요해요.
          </p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="전체 직원" value={`${summary.total}명`} />
        <SummaryCard label="정상 직원" value={`${summary.normal}명`} />
        <SummaryCard
          label="오류 직원"
          value={`${summary.error}명`}
          accent={summary.error > 0 ? 'error' : undefined}
        />
        <SummaryCard
          label="경고 직원"
          value={`${summary.warning}명`}
          accent={summary.warning > 0 ? 'warning' : undefined}
        />
        <SummaryCard
          label="확인 필요 직원"
          value={`${summary.review}명`}
          accent={summary.review > 0 ? 'review' : undefined}
        />
      </div>

      {/* 이슈 건수 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
          <span className="font-medium">전체 이슈: {issueCounts.total}건</span>
          <span className="text-red-600">오류 {issueCounts.error}건</span>
          <span className="text-amber-600">경고 {issueCounts.warning}건</span>
          <span className="text-blue-600">확인 필요 {issueCounts.review}건</span>
        </CardContent>
      </Card>

      {/* 이슈 없음 */}
      {allIssues.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 text-emerald-500" />
            현재 기준에서 발견된 데이터 오류가 없습니다.
          </CardContent>
        </Card>
      )}

      {allIssues.length > 0 && (
        <>
          {/* 필터 */}
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 py-4">
              <FilterField label="수준">
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter((v as string) ?? 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="error">오류</SelectItem>
                    <SelectItem value="warning">경고</SelectItem>
                    <SelectItem value="review">확인 필요</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="출처">
                <Select value={sourceFilter} onValueChange={(v) => setSourceFilter((v as string) ?? 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="employee">직원</SelectItem>
                    <SelectItem value="leave">휴가</SelectItem>
                    <SelectItem value="work-schedule">유연근무</SelectItem>
                    <SelectItem value="system">시스템</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="부서">
                <Select value={deptFilter} onValueChange={(v) => setDeptFilter((v as string) ?? 'all')}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="전체 부서" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 부서</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="직급">
                <Select value={positionFilter} onValueChange={(v) => setPositionFilter((v as string) ?? 'all')}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="전체 직급" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 직급</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="직원 검색">
                <Input
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="이름 입력"
                  className="w-[160px]"
                />
              </FilterField>
            </CardContent>
          </Card>

          {/* 이슈 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                검사 결과 ({filteredIssues.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>수준</TableHead>
                      <TableHead>출처</TableHead>
                      <TableHead>직원</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>직급</TableHead>
                      <TableHead>검사 항목</TableHead>
                      <TableHead>현재 값</TableHead>
                      <TableHead>문제 내용</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          조건에 맞는 이슈가 없어요.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredIssues.map((iss) => (
                      <TableRow
                        key={iss.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedIssueId(iss.id)}
                      >
                        <TableCell>
                          <Badge variant="secondary" className={SEVERITY_BADGE[iss.severity]}>
                            {SEVERITY_LABEL[iss.severity]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={SOURCE_BADGE[iss.source]}>
                            {SOURCE_LABEL[iss.source]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {iss.employeeName ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">{iss.department ?? '—'}</TableCell>
                        <TableCell className="text-sm">{iss.position ?? '—'}</TableCell>
                        <TableCell className="text-sm">{iss.code}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground" title={iss.currentValue}>
                          {iss.currentValue || '—'}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm" title={iss.message}>
                          {iss.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 상세 Sheet */}
      <Sheet open={selectedIssueId !== null} onOpenChange={(o) => !o && setSelectedIssueId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>이슈 상세</SheetTitle>
            <SheetDescription>선택한 데이터 품질 이슈의 상세 내용이에요.</SheetDescription>
          </SheetHeader>
          {selectedIssue && (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className={SEVERITY_BADGE[selectedIssue.severity]}>
                  {SEVERITY_LABEL[selectedIssue.severity]}
                </Badge>
                <Badge variant="secondary" className={SOURCE_BADGE[selectedIssue.source]}>
                  {SOURCE_LABEL[selectedIssue.source]}
                </Badge>
              </div>

              <DetailRow label="이슈 코드" value={selectedIssue.code} />
              <DetailRow label="검사 항목" value={selectedIssue.field} />
              <DetailRow label="현재 값" value={selectedIssue.currentValue || '없음'} />

              {selectedIssue.employeeId !== undefined && (
                <>
                  <DetailRow label="직원 ID" value={String(selectedIssue.employeeId)} />
                  <DetailRow label="직원명" value={selectedIssue.employeeName ?? '—'} />
                  <DetailRow label="부서" value={selectedIssue.department ?? '—'} />
                  <DetailRow label="직급" value={selectedIssue.position ?? '—'} />
                </>
              )}

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">문제 내용</p>
                <p className="mt-1 text-sm">{selectedIssue.message}</p>
              </div>

              <div className="mt-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">이동하기</p>
                {selectedIssue.source === 'employee' || selectedIssue.source === 'system' ? (
                  <Button variant="outline" size="sm" render={<Link href="/data" />}>
                    <Database className="size-4" /> 기초데이터로 이동 <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" render={<Link href="/workforce" />}>
                    <CalendarDays className="size-4" /> 근무·휴가로 이동 <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: Severity
}) {
  const accentClass = accent
    ? SEVERITY_BADGE[accent]
    : ''
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold tabular-nums ${accent ? accentClass : ''}`}>
          {value}
        </span>
      </CardContent>
    </Card>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}
