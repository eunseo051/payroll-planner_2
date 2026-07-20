'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useData } from '@/lib/store'

const GRADES = ['S', 'A', 'B', 'C', 'D']

export default function EvaluationPage() {
  const { employees, setEmployees } = useData()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => e.name.toLowerCase().includes(q) || e.dept.toLowerCase().includes(q))
  }, [employees, search])

  function updateGrade(id: number, grade: string) {
    setEmployees(employees.map((e) => (e.id === id ? { ...e, grade } : e)))
  }

  const distribution = useMemo(() => {
    const d: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }
    employees.forEach((e) => {
      d[e.grade] = (d[e.grade] ?? 0) + 1
    })
    return d
  }, [employees])

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">평가할 직원 데이터가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">먼저 조직·기초데이터를 업로드해주세요.</p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {GRADES.map((g) => (
          <Card key={g}>
            <CardContent className="flex flex-col items-center justify-center gap-1 py-4">
              <span className="text-xs font-medium text-muted-foreground">{g}등급</span>
              <span className="text-xl font-bold tabular-nums">{distribution[g] ?? 0}명</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">인사·근무평가 등급</CardTitle>
          <Input
            placeholder="이름 · 부서 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[220px]"
          />
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead className="text-right">근속(년)</TableHead>
                  <TableHead className="w-[120px]">평가등급</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.dept}</TableCell>
                    <TableCell>{e.position}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{e.tenure}</TableCell>
                    <TableCell>
                      <Select value={e.grade} onValueChange={(v) => v && updateGrade(e.id, v)}>
                        <SelectTrigger className="h-8 w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}등급
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
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
