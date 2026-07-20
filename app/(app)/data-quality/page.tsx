'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useData } from '@/lib/store'
import { useWorkforce } from '@/lib/workforce-store'
import { runDataQualityChecks, summarizeIssues, type IssueLevel } from '@/lib/data-quality'

const LEVEL_META: Record<IssueLevel, { label: string; icon: typeof AlertCircle; tone: string; badge: string }> = {
  error: {
    label: '오류',
    icon: AlertCircle,
    tone: 'text-red-600',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  },
  warning: {
    label: '경고',
    icon: AlertTriangle,
    tone: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  },
  info: {
    label: '참고',
    icon: Info,
    tone: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  },
}

export default function DataQualityPage() {
  const { employees } = useData()
  const { leaveRecords, workSchedules } = useWorkforce()
  const [levelFilter, setLevelFilter] = useState<'all' | IssueLevel>('all')

  const issues = useMemo(
    () => runDataQualityChecks(employees, leaveRecords, workSchedules),
    [employees, leaveRecords, workSchedules],
  )
  const summary = useMemo(() => summarizeIssues(issues), [issues])

  const filtered = useMemo(
    () => (levelFilter === 'all' ? issues : issues.filter((i) => i.level === levelFilter)),
    [issues, levelFilter],
  )

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">검사할 데이터가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">먼저 조직·기초데이터를 업로드해주세요.</p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
            <span className="text-xs font-medium text-muted-foreground">전체 이슈</span>
            <span className="text-2xl font-bold tabular-nums">{summary.total}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
            <span className="text-xs font-medium text-red-600">오류</span>
            <span className="text-2xl font-bold tabular-nums text-red-600">{summary.errors}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
            <span className="text-xs font-medium text-amber-600">경고</span>
            <span className="text-2xl font-bold tabular-nums text-amber-600">{summary.warnings}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
            <span className="text-xs font-medium text-blue-600">참고</span>
            <span className="text-2xl font-bold tabular-nums text-blue-600">{summary.infos}</span>
          </CardContent>
        </Card>
      </div>

      {summary.total === 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
            <p className="text-sm font-medium">발견된 데이터 품질 이슈가 없어요. 깨끗한 상태예요.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">이슈 목록 ({filtered.length}건)</CardTitle>
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter((v as 'all' | IssueLevel) ?? 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="전체 등급" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 등급</SelectItem>
              <SelectItem value="error">오류만</SelectItem>
              <SelectItem value="warning">경고만</SelectItem>
              <SelectItem value="info">참고만</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">등급</TableHead>
                  <TableHead className="w-[120px]">항목</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead className="w-[120px]">대상 직원</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      선택한 등급에 해당하는 이슈가 없어요.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((issue, i) => {
                  const meta = LEVEL_META[issue.level]
                  const Icon = meta.icon
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="secondary" className={meta.badge}>
                          <Icon className="size-3" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{issue.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{issue.message}</TableCell>
                      <TableCell className="text-sm">
                        {issue.employeeName ? (
                          <span className="whitespace-nowrap">
                            {issue.employeeName}
                            {issue.employeeId !== undefined && (
                              <span className="ml-1 text-xs text-muted-foreground">#{issue.employeeId}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {Object.keys(summary.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">항목별 집계</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(summary.byCategory).map(([cat, count]) => (
              <Badge key={cat} variant="outline">
                {cat} · {count}건
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
