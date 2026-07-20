'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RotateCcw, Plus, Trash2 } from 'lucide-react'
import { useData } from '@/lib/store'
import { fmtPct, fmtWon, SalaryTableEntry } from '@/lib/calc'

export default function RatesPage() {
  const { params, updateParams, resetParams } = useData()
  const perfRate = Math.max(0, params.totalRate - params.naturalRate)

  function addSalaryRow() {
    const next: SalaryTableEntry = { position: '', step: 1, monthlyBase: 0 }
    updateParams({ salaryTable: [...params.salaryTable, next] })
  }

  function updateSalaryRow(index: number, patch: Partial<SalaryTableEntry>) {
    const table = params.salaryTable.map((row, i) => (i === index ? { ...row, ...patch } : row))
    updateParams({ salaryTable: table })
  }

  function removeSalaryRow(index: number) {
    updateParams({ salaryTable: params.salaryTable.filter((_, i) => i !== index) })
  }

  const positions = [...new Set(params.salaryTable.map((r) => r.position).filter(Boolean))]

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold">호봉제 모드</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              켜면 연봉을 직접 입력하는 대신, 직급×호봉으로 아래 봉급표를 조회해서 연봉을 계산해요. 자연인상은
              &ldquo;호봉승급분 + 봉급표 자체 인상분&rdquo;으로 자동 계산됩니다.
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={params.useStepSystem}
              onChange={(e) => updateParams({ useStepSystem: e.target.checked })}
              className="size-4 accent-primary"
            />
            <span className="text-sm font-medium">{params.useStepSystem ? '사용 중' : '미사용'}</span>
          </label>
        </CardHeader>

        {params.useStepSystem && (
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>봉급표 인상률 가정치 (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={params.tableRaiseRate * 100}
                  onChange={(e) => updateParams({ tableRaiseRate: (parseFloat(e.target.value) || 0) / 100 })}
                />
                <p className="text-xs text-muted-foreground">
                  아래 봉급표는 <b>올해 기준 1개 표</b>예요. 내년도 표를 따로 안 받았으니, 이 인상률만큼 표 전체가
                  오른다고 가정해서 계산해요. 실제 내년도 봉급표를 받으면 이 가정치 방식 대신 별도 연도별 표
                  구조로 바꿀 수 있어요.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              아래 봉급표는 예시 구조일 뿐, 실제 숫자가 채워져 있지 않아요. 기관에서 받은 실제 봉급표 값을 직접
              입력해주세요. 직원의 &ldquo;직급&rdquo; 컬럼 값과 여기 &ldquo;직급&rdquo; 값이 정확히 일치해야
              조회가 됩니다.
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>직급</TableHead>
                    <TableHead className="text-right">호봉</TableHead>
                    <TableHead className="text-right">월 기본급 (원)</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {params.salaryTable.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        아직 봉급표가 비어있어요. &ldquo;행 추가&rdquo;로 시작하세요.
                      </TableCell>
                    </TableRow>
                  )}
                  {params.salaryTable.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          className="h-8 w-24"
                          value={row.position}
                          placeholder="예: 5급"
                          onChange={(e) => updateSalaryRow(i, { position: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="h-8 w-20 text-right"
                          type="number"
                          value={row.step}
                          onChange={(e) => updateSalaryRow(i, { step: parseInt(e.target.value) || 1 })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="h-8 w-32 text-right"
                          type="number"
                          step="10000"
                          value={row.monthlyBase}
                          onChange={(e) => updateSalaryRow(i, { monthlyBase: parseFloat(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeSalaryRow(i)}
                          aria-label="행 삭제"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" className="w-fit" onClick={addSalaryRow}>
              <Plus className="size-4" /> 행 추가
            </Button>

            <div className="flex flex-col gap-2">
              <Label>직급별 최대 호봉 (승급 상한, 콤마로 구분: 직급:호봉)</Label>
              <Input
                placeholder="예: 5급:20, 6급:15, 4급:23"
                defaultValue={Object.entries(params.maxStepByPosition)
                  .map(([p, s]) => `${p}:${s}`)
                  .join(', ')}
                onBlur={(e) => {
                  const map: Record<string, number> = {}
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach((pair) => {
                      const [p, s] = pair.split(':').map((x) => x.trim())
                      if (p && s) map[p] = parseInt(s) || 99
                    })
                  updateParams({ maxStepByPosition: map })
                }}
              />
              <p className="text-xs text-muted-foreground">
                지정 안 한 직급은 상한 없이(사실상 99호봉까지) 계속 승급하는 것으로 처리돼요.
                {positions.length > 0 && <> 현재 봉급표에 있는 직급: {positions.join(', ')}</>}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold">인상률 파라미터</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              전체 인상률 한도에서 자연인상률을 뺀 나머지가 성과배분 재원으로 계산돼요.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetParams}>
            <RotateCcw className="size-4" /> 기본값으로
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>전체 인상률 한도 (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={params.totalRate * 100}
              onChange={(e) => updateParams({ totalRate: (parseFloat(e.target.value) || 0) / 100 })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>
              자연인상률 (호봉승급 등, %){' '}
              {params.useStepSystem && (
                <span className="font-normal text-amber-600">— 호봉제 모드 사용 중이라 이 값은 무시돼요</span>
              )}
            </Label>
            <Input
              type="number"
              step="0.1"
              value={params.naturalRate * 100}
              disabled={params.useStepSystem}
              onChange={(e) => updateParams({ naturalRate: (parseFloat(e.target.value) || 0) / 100 })}
            />
          </div>

          <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm">
            성과배분 재원 = <b className="font-mono">{fmtPct(params.totalRate)}</b> − <b className="font-mono">{fmtPct(params.naturalRate)}</b> ={' '}
            <b className="font-mono text-primary">{fmtPct(perfRate)}</b>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">평가등급별 배분 가중치</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            성과배분 재원을 등급별 가중치 비례로 나눠요. 값이 클수록 더 많이 배분됩니다.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(['S', 'A', 'B', 'C', 'D'] as const).map((g) => (
            <div key={g} className="flex flex-col gap-2">
              <Label>{g}등급</Label>
              <Input
                type="number"
                step="0.1"
                value={params.weights[g]}
                onChange={(e) =>
                  updateParams({ weights: { ...params.weights, [g]: parseFloat(e.target.value) || 0 } })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">승진 추정 기준</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>시뮬레이션 기준일</Label>
            <Input
              type="date"
              value={params.simulationBaseDate}
              onChange={(e) => updateParams({ simulationBaseDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              입사일·부서발령일 기반 근무기간 계산의 기준 시점이에요. 미래 날짜로 바꾸면 그 시점 기준 근속으로
              시뮬레이션할 수 있어요.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>최소 근속연수</Label>
            <Input
              type="number"
              value={params.promoTenure}
              onChange={(e) => updateParams({ promoTenure: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>인정 평가등급 (콤마로 구분, 예: S,A)</Label>
            <Input
              value={params.promoGrades.join(',')}
              onChange={(e) =>
                updateParams({
                  promoGrades: e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">부가 비용</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>1인당 자산관리비 (연, 원)</Label>
            <Input
              type="number"
              step="10000"
              value={params.assetCost}
              onChange={(e) => updateParams({ assetCost: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">{fmtWon(params.assetCost)}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>인건비 부가율 (4대보험 등, %)</Label>
            <Input
              type="number"
              step="0.5"
              value={params.overhead * 100}
              onChange={(e) => updateParams({ overhead: (parseFloat(e.target.value) || 0) / 100 })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
