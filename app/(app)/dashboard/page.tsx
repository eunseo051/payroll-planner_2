'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Wallet, TrendingUp, PiggyBank, Award, Upload, Building2, AlertTriangle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useData } from '@/lib/store'
import { computeAll, summarize, summarizeByDept, fmtWon, fmtPct } from '@/lib/calc'

export default function DashboardPage() {
  const { employees, params } = useData()
  const computed = useMemo(() => computeAll(employees, params), [employees, params])
  const summary = useMemo(() => summarize(computed, params), [computed, params])
  const deptSummary = useMemo(() => summarizeByDept(computed), [computed])
  const chartData = useMemo(
    () =>
      deptSummary.map((d) => ({
        dept: d.dept,
        현재: Math.round(d.currentTotal / 10000), // 만원 단위 (그래프 가독성)
        인상후: Math.round(d.newTotal / 10000),
      })),
    [deptSummary],
  )

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">아직 업로드된 데이터가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            조직·기초데이터 메뉴에서 엑셀 파일을 먼저 업로드해주세요.
          </p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  const naturalPct = params.totalRate > 0 ? (params.naturalRate / params.totalRate) * 100 : 0
  const perfPct = 100 - naturalPct

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{employees.length}명 · 기초 데이터 기준 실시간 계산 결과</p>
      </div>

      {params.useStepSystem && summary.mismatchCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">봉급표 미매칭 {summary.mismatchCount}명</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
              직급 또는 호봉이 봉급표에 없어서 업로드된 연봉을 그대로 사용했어요(호봉제 계산 미적용). 조직·기초데이터
              또는 급여 시뮬레이션 페이지에서 어떤 직원인지 확인할 수 있어요.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">연환산 총 인건비</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{fmtWon(summary.totalLaborCost)}</div>
            <p className="mt-1 text-xs text-muted-foreground">인당 평균 {fmtWon(summary.perEmployeeCost)}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              인상 반영 후 연봉 기준 연환산 추정치 (승급·입퇴사 시점은 미반영)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전사 인상률</CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-primary">{fmtPct(summary.companyWideRate)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              총 인상액 ÷ 총 기존연봉 · 직원 평균 {fmtPct(summary.avgRate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">성과배분 재원</CardTitle>
            <PiggyBank className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{fmtWon(summary.perfPoolTotal)}</div>
            <p className="mt-1 text-xs text-muted-foreground">전체 재원의 {fmtPct(summary.perfRate)} 배분</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">승진 추정 대상</CardTitle>
            <Award className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-600">{summary.promoCount}명</div>
            <p className="mt-1 text-xs text-muted-foreground">근속·평가 기준 충족자</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">인상률 재원 배분 구조</CardTitle>
          <p className="text-xs text-muted-foreground">
            전체 인상률 한도 안에서 자연인상분과 성과배분분이 어떻게 나뉘는지 보여줘요.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex h-10 overflow-hidden rounded-lg border border-border">
            <div
              className="flex items-center justify-center bg-slate-500 text-xs font-bold text-white transition-all"
              style={{ width: `${naturalPct}%` }}
            >
              {fmtPct(params.naturalRate)}
            </div>
            <div
              className="flex items-center justify-center bg-primary text-xs font-bold text-primary-foreground transition-all"
              style={{ width: `${perfPct}%` }}
            >
              {fmtPct(summary.perfRate)}
            </div>
          </div>
          <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-500" /> 자연인상 ({fmtPct(params.naturalRate)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> 성과배분 ({fmtPct(summary.perfRate)})
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Building2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">부서별 인건비 비교</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {deptSummary.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">부서 데이터가 없어요.</p>
          ) : (
            <>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toLocaleString()}만`} width={64} />
                    <Tooltip
                      formatter={(value) => `${(Number(value ?? 0) * 10000).toLocaleString('ko-KR')}원`}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="현재" fill="var(--muted-foreground)" opacity={0.35} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="인상후" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>부서</TableHead>
                      <TableHead className="text-right">인원</TableHead>
                      <TableHead className="text-right">현재 총연봉</TableHead>
                      <TableHead className="text-right">인상 후 총연봉</TableHead>
                      <TableHead className="text-right">증가액</TableHead>
                      <TableHead className="text-right">증가율</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptSummary.map((d) => (
                      <TableRow key={d.dept}>
                        <TableCell className="font-medium">{d.dept}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{d.headcount}명</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{fmtWon(d.currentTotal)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{fmtWon(d.newTotal)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-primary">
                          +{fmtWon(d.increase)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-primary">
                          {fmtPct(d.increaseRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
