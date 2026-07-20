'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useData } from '@/lib/store'
import { computeAll, fmtWon } from '@/lib/calc'

export default function PromotionPage() {
  const { employees, params } = useData()
  const computed = useMemo(() => computeAll(employees, params), [employees, params])
  const promoted = useMemo(() => computed.filter((e) => e.isPromo), [computed])
  const notYet = useMemo(
    () =>
      computed
        .filter((e) => !e.isPromo)
        .filter((e) => params.promoGrades.includes(e.grade) || e.effectiveTenureYears >= params.promoTenure - 1)
        .sort((a, b) => b.effectiveTenureYears - a.effectiveTenureYears)
        .slice(0, 10),
    [computed, params],
  )

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TrendingUp className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">승진 대상을 추정할 데이터가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">먼저 조직·기초데이터를 업로드해주세요.</p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">현재 기준</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            근속연수 <b className="font-mono text-foreground">{params.promoTenure}년 이상</b> +
            평가등급 <b className="font-mono text-foreground">{params.promoGrades.join(', ')}</b> 동시 충족자를
            추정합니다. 기준은 인상률·배분 설정 메뉴에서 조정할 수 있어요.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Award className="size-4 text-amber-600" />
          <CardTitle className="text-sm font-semibold">승진 추정 대상 ({promoted.length}명)</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>현 직급</TableHead>
                  <TableHead>평가등급</TableHead>
                  <TableHead>근무기간</TableHead>
                  <TableHead className="text-right">인상 후 연봉</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      현재 기준을 충족하는 직원이 없어요.
                    </TableCell>
                  </TableRow>
                )}
                {promoted.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.dept}</TableCell>
                    <TableCell>{e.position}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.grade}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{e.totalTenureLabel}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtWon(e.newSalary)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {notYet.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">근접 후보 (참고용, 근속 순 상위 10명)</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              기준을 아직 충족하지 못했지만 근속연수가 임박했거나 인정 등급을 받은 직원이에요.
            </p>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>평가등급</TableHead>
                    <TableHead>근무기간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notYet.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.dept}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.grade}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{e.totalTenureLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
