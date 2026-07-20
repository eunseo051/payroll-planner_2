// 인건비 시뮬레이터 계산 로직
// Level 1: 연봉 기준 단순 계산 (세전, 균등 12분할)
// Level 1.5: 호봉제 모드 — 직급×호봉으로 봉급표 조회, 자연인상 = 호봉승급분+봉급표인상분
// 나중에 급여명세서 항목이 확보되면 이 파일만 확장하면 됨

import { todayISO, calcTenure, getYear } from './tenure'

export type Employee = {
  id: number
  name: string
  dept: string
  position: string
  baseSalary: number // 현재연봉 (세전 총액) — 호봉제 모드에서는 봉급표에서 자동계산됨
  tenure: number // 근속연수 (직접입력값 — hireDate 있으면 그걸로 자동계산된 값이 우선됨)
  grade: string // 인사평가등급 (S/A/B/C/D)
  step?: number // 호봉 (호봉제 모드에서 사용, 없으면 1로 간주)
  hireDate?: string // 입사일 (YYYY-MM-DD) — 있으면 총근무기간 자동계산
  departmentAssignedDate?: string // 현재 부서 발령일 — 있으면 현부서 근무기간 자동계산
}

export type SalaryTableEntry = {
  position: string // 직급 (예: 5급, 사원 등 — Employee.position과 매칭)
  step: number // 호봉
  monthlyBase: number // 월 기본급
}

export type Params = {
  totalRate: number // 전체 인상률 한도 (예: 0.04)
  naturalRate: number // 자연인상률 (예: 0.03) — 호봉제 모드에서는 미사용
  weights: Record<string, number> // 등급별 배분 가중치
  promoTenure: number // 승진 최소 근속연수
  promoGrades: string[] // 승진 인정 등급
  assetCost: number // 1인당 연간 자산관리비
  overhead: number // 인건비 부가율 (4대보험 등)
  // 호봉제 모드
  useStepSystem: boolean // 켜면 연봉 직접입력 대신 직급×호봉 봉급표 조회 방식 사용
  salaryTable: SalaryTableEntry[] // 올해 기준 봉급표 (직접 입력/편집)
  tableRaiseRate: number // 연도별 봉급표 자체 인상률 (예: 0.02) — 정부/기관 임금인상률
  maxStepByPosition: Record<string, number> // 직급별 최대 호봉 (승급 상한)
  simulationBaseDate: string // 근무기간 계산의 공통 기준일 (YYYY-MM-DD, 기본값 오늘)
}

export type SalarySource = 'input' | 'table' | 'fallback-no-position' | 'fallback-no-step'

export type ComputedEmployee = Employee & {
  naturalRaise: number
  perfShare: number
  newSalary: number
  monthlyPay: number
  individualRate: number
  laborCost: number
  isPromo: boolean
  resolvedBaseSalary: number // 호봉제 모드일 때 봉급표에서 조회된 실제 기준연봉 (아니면 baseSalary와 동일)
  salarySource: SalarySource // 이 연봉이 어디서 나왔는지 — 화면에 경고 표시용
  hireYear: number | null // 입사연도 (hireDate에서 추출, 없으면 null)
  effectiveTenureYears: number // 승진판단 등에 쓰는 실제 근속연수 — hireDate 있으면 자동계산값, 없으면 직접입력 tenure
  totalTenureLabel: string // 총근무기간 "N년 N개월" (hireDate 있으면 자동계산, 없으면 tenure 값 기반 표시)
  deptTenureLabel: string // 현재 부서 근무기간 (departmentAssignedDate 없으면 "정보 미입력")
}

export const DEFAULT_PARAMS: Params = {
  totalRate: 0.04,
  naturalRate: 0.03,
  weights: { S: 2.0, A: 1.5, B: 1.0, C: 0.5, D: 0 },
  promoTenure: 4,
  promoGrades: ['S', 'A'],
  assetCost: 0,
  overhead: 0.1,
  useStepSystem: false,
  salaryTable: [],
  tableRaiseRate: 0.02,
  maxStepByPosition: {},
  simulationBaseDate: todayISO(),
}

// 봉급표에서 직급×호봉으로 월기본급 조회. 없으면 null.
function lookupMonthlyBase(table: SalaryTableEntry[], position: string, step: number): number | null {
  const entry = table.find((r) => r.position === position && r.step === step)
  return entry ? entry.monthlyBase : null
}

// 호봉제 모드에서 개인의 "올해 연봉"과 "내년(자연인상 후) 연봉"을 봉급표 기준으로 계산
// 봉급표에 없으면 조용히 폴백하지 않고, 그 사실(source)을 같이 반환해서 화면에서 경고할 수 있게 함
function resolveStepSalary(
  e: Employee,
  params: Params,
): { current: number; nextYear: number; source: SalarySource } {
  if (!e.position) {
    return { current: e.baseSalary, nextYear: e.baseSalary * (1 + params.tableRaiseRate), source: 'fallback-no-position' }
  }

  const step = e.step ?? 1
  const maxStep = params.maxStepByPosition[e.position] ?? 99
  const nextStep = Math.min(step + 1, maxStep)

  const currentMonthly = lookupMonthlyBase(params.salaryTable, e.position, step)
  const nextMonthly = lookupMonthlyBase(params.salaryTable, e.position, nextStep)

  // 봉급표에 해당 직급/호봉이 없으면 업로드된 baseSalary로 폴백하되, 폴백했다는 사실을 표시함
  if (currentMonthly === null) {
    return {
      current: e.baseSalary,
      nextYear: e.baseSalary * (1 + params.tableRaiseRate),
      source: 'fallback-no-step',
    }
  }

  const current = currentMonthly * 12
  // 내년 봉급표 자체도 tableRaiseRate만큼 인상된다고 가정(진짜 연도별 표가 아니라 이번해 표+가정 인상률) + 호봉은 1단계 승급
  const nextYearMonthly = (nextMonthly ?? currentMonthly) * (1 + params.tableRaiseRate)
  const nextYear = nextYearMonthly * 12

  return { current, nextYear, source: 'table' }
}

export function computeAll(employees: Employee[], params: Params): ComputedEmployee[] {
  // 호봉제 모드면 봉급표 기준으로 기준연봉을 먼저 다시 계산
  const resolved = employees.map((e) => {
    if (!params.useStepSystem) {
      return {
        emp: e,
        resolvedBaseSalary: e.baseSalary,
        stepNaturalRaise: e.baseSalary * params.naturalRate,
        salarySource: 'input' as SalarySource,
      }
    }
    const { current, nextYear, source } = resolveStepSalary(e, params)
    return { emp: e, resolvedBaseSalary: current, stepNaturalRaise: nextYear - current, salarySource: source }
  })

  const perfRate = Math.max(0, params.totalRate - params.naturalRate)
  const totalBase = resolved.reduce((s, r) => s + r.resolvedBaseSalary, 0)
  const perfPoolTotal = totalBase * perfRate
  const totalWeight = resolved.reduce(
    (s, r) => s + (params.weights[r.emp.grade] ?? params.weights['B'] ?? 1),
    0
  )

  return resolved.map(({ emp: e, resolvedBaseSalary, stepNaturalRaise, salarySource }) => {
    const weight = params.weights[e.grade] ?? params.weights['B'] ?? 1
    const naturalRaise = params.useStepSystem ? stepNaturalRaise : resolvedBaseSalary * params.naturalRate
    const perfShare = totalWeight > 0 ? perfPoolTotal * (weight / totalWeight) : 0
    const newSalary = resolvedBaseSalary + naturalRaise + perfShare
    const monthlyPay = newSalary / 12
    const individualRate = resolvedBaseSalary > 0 ? (naturalRaise + perfShare) / resolvedBaseSalary : 0
    const laborCost = newSalary * (1 + params.overhead) + params.assetCost

    // 근무기간: 입사일 있으면 그걸로 자동계산한 값을 우선 사용, 없으면 기존 직접입력 tenure 사용
    const total = calcTenure(e.hireDate, params.simulationBaseDate)
    const effectiveTenureYears = total.years ?? e.tenure
    const isPromo = effectiveTenureYears >= params.promoTenure && params.promoGrades.includes(e.grade)

    const hireYear = getYear(e.hireDate)
    const totalTenureLabel = e.hireDate ? total.label : e.tenure > 0 ? `${e.tenure}년 (직접입력)` : '정보 미입력'
    const deptTenureLabel = calcTenure(e.departmentAssignedDate, params.simulationBaseDate).label

    return {
      ...e,
      baseSalary: resolvedBaseSalary, // 표시용: 호봉제 모드에선 봉급표 조회값으로 갱신
      resolvedBaseSalary,
      salarySource,
      naturalRaise,
      perfShare,
      newSalary,
      monthlyPay,
      individualRate,
      laborCost,
      isPromo,
      hireYear,
      effectiveTenureYears,
      totalTenureLabel,
      deptTenureLabel,
    }
  })
}

export function summarize(computed: ComputedEmployee[], params: Params) {
  const perfRate = Math.max(0, params.totalRate - params.naturalRate)
  const totalBase = computed.reduce((s, e) => s + e.baseSalary, 0)
  const totalRaise = computed.reduce((s, e) => s + e.naturalRaise + e.perfShare, 0)
  const totalLaborCost = computed.reduce((s, e) => s + e.laborCost, 0)
  // 전사 인상률: 총 인상액 ÷ 총 기존연봉 (예산 관점 — 설정한 totalRate에 가장 가깝게 수렴하는 값)
  const companyWideRate = totalBase > 0 ? totalRaise / totalBase : 0
  // 직원 평균 인상률: 개인별 인상률의 단순평균 (등급별 배분 방식에 따라 전사 인상률과 달라질 수 있음)
  const avgRate = computed.length
    ? computed.reduce((s, e) => s + e.individualRate, 0) / computed.length
    : 0
  const perfPoolTotal = totalBase * perfRate
  const promoCount = computed.filter((e) => e.isPromo).length
  const mismatchCount = computed.filter((e) => e.salarySource.startsWith('fallback')).length

  return {
    totalLaborCost,
    avgRate,
    companyWideRate,
    perfPoolTotal,
    perfRate,
    promoCount,
    mismatchCount,
    perEmployeeCost: computed.length ? totalLaborCost / computed.length : 0,
  }
}

export type DeptSummary = {
  dept: string
  headcount: number
  currentTotal: number
  newTotal: number
  increase: number
  increaseRate: number
}

export function summarizeByDept(computed: ComputedEmployee[]): DeptSummary[] {
  const map = new Map<string, ComputedEmployee[]>()
  computed.forEach((e) => {
    const list = map.get(e.dept) ?? []
    list.push(e)
    map.set(e.dept, list)
  })

  return Array.from(map.entries())
    .map(([dept, rows]) => {
      const currentTotal = rows.reduce((s, e) => s + e.baseSalary, 0)
      const newTotal = rows.reduce((s, e) => s + e.newSalary, 0)
      const increase = newTotal - currentTotal
      return {
        dept,
        headcount: rows.length,
        currentTotal,
        newTotal,
        increase,
        increaseRate: currentTotal > 0 ? increase / currentTotal : 0,
      }
    })
    .sort((a, b) => b.currentTotal - a.currentTotal)
}

export const fmtWon = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원'
export const fmtPct = (n: number) => (n * 100).toFixed(1) + '%'
