'use client'

import { useRef, useState } from 'react'
import { Upload, FileDown, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useData } from '@/lib/store'
import { readExcelFile, parseEmployeeExcel, downloadSampleTemplate, loadSampleData } from '@/lib/excel'
import { fmtWon } from '@/lib/calc'
import { calcTenure } from '@/lib/tenure'

export default function DataPage() {
  const { employees, setEmployees, fileName, setFileName, clearAll, params } = useData()
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleLoadSample() {
    const rows = loadSampleData()
    setEmployees(rows)
    setFileName('샘플 데이터 (8명, 시연용)')
    setStatus({ type: 'ok', msg: `샘플 데이터 ${rows.length}명 불러옴 · 실제 데이터 업로드 전 화면 확인용` })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const json = await readExcelFile(file)
      const rows = parseEmployeeExcel(json)
      setEmployees(rows)
      setFileName(file.name)
      setStatus({ type: 'ok', msg: `${file.name} · ${rows.length}명 불러옴` })
    } catch (err) {
      setStatus({ type: 'error', msg: '파일을 읽지 못했어요. 샘플 양식을 참고해주세요.' })
      console.error(err)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">기초 데이터 업로드</CardTitle>
          <p className="text-xs text-muted-foreground">
            이름 · 부서 · 직급 · 현재연봉 · 근속연수 · 인사평가등급 컬럼을 포함한 엑셀 파일을 올려주세요.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5">
              <Upload className="size-4" />
              엑셀 파일 선택
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </label>
            <Button variant="outline" size="sm" onClick={handleLoadSample}>
              샘플 데이터로 바로 체험하기
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSampleTemplate}>
              <FileDown className="size-4" /> 샘플 양식 내려받기
            </Button>
            {employees.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={clearAll}>
                <Trash2 className="size-4" /> 전체 데이터 초기화
              </Button>
            )}
          </div>

          {status && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                status.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              }`}
            >
              {status.type === 'ok' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              {status.msg}
            </div>
          )}
        </CardContent>
      </Card>

      {employees.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">
              원본 데이터 ({employees.length}명) <span className="font-normal text-muted-foreground">· {fileName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>직급</TableHead>
                    <TableHead className="text-right">호봉</TableHead>
                    <TableHead>평가등급</TableHead>
                    <TableHead>입사일</TableHead>
                    <TableHead>총근무기간</TableHead>
                    <TableHead>현부서 근무기간</TableHead>
                    <TableHead className="text-right">근속(년, 직접입력)</TableHead>
                    <TableHead className="text-right">현재연봉</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.dept}</TableCell>
                      <TableCell>{e.position}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{e.step ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{e.grade}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {e.hireDate ?? '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {calcTenure(e.hireDate, params.simulationBaseDate).label}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {calcTenure(e.departmentAssignedDate, params.simulationBaseDate).label}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{e.tenure}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{fmtWon(e.baseSalary)}</TableCell>
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
