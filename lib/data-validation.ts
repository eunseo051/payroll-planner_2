// 데이터 품질 검사 — 순수 함수, 입력을 변경하지 않음
// 급여 계산(lib/calc.ts)을 복제/수정하지 않고 기존 로직을 재사용

import { Employee, Params } from './calc'
import { calcTenure } from './tenure'
import {
  LeaveBalance,
  LeaveRecord,
  WorkSchedule,
  LEAVE_TYPES,
  LEAVE_STATUSES,
  WORK_PATTERNS,
} from './workforce-types'

export type Severity = 'error' | 'warning' | 'review'
export type IssueSource = 'employee' | 'leave' | 'work-schedule' | 'system'

export type ValidationIssue = {
  id: string
  code: string
  severity: Severity
  source: IssueSource
  field: string
  currentValue: string
  message: string
  employeeId?: number
  employeeName?: string
  department?: string
  position?: string
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  error: '오류',
  warning: '경고',
  review: '확인 필요',
}

export const SOURCE_LABEL: Record<IssueSource, string> = {
  employee: '직원',
  leave: '휴가',
  'work-schedule': '유연근무',
  system: '시스템',
}

export const SEVERITY_RANK: Record<Severity, number> = {
  error: 3,
  warning: 2,
  review: 1,
}

const VALID_GRADES = new Set(['S', 'A', 'B', 'C', 'D'])
const LEAVE_TYPE_SET = new Set(LEAVE_TYPES)
const LEAVE_STATUS_SET = new Set(LEAVE_STATUSES)
const WORK_PATTERN_SET = new Set(WORK_PATTERNS)

// ── 날짜 헬퍼 (엄격한 로컬 YYYY-MM-DD 검증) ────────────────────────────
function isValidISODate(s: string | undefined): boolean {
  if (!s) return false
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const d = parseInt(m[3], 10)
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, mo - 1, d)
  return (
    dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
  )
}

function parseStrict(s: string | undefined): Date | null {
  if (!isValidISODate(s)) return null
  const [y, m, d] = s!.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function normalizeName(s: string): string {
  return s.replace(/\s+/g, '').trim()
}

function normalizeDept(s: string): string {
  return s.replace(/\s+/g, '').trim()
}

// ── 메인 진입점 ──────────────────────────────────────────────────────
export function validateAllData(
  employees: Employee[],
  params: Params,
  leaveBalances: LeaveBalance[],
  leaveRecords: LeaveRecord[],
  workSchedules: WorkSchedule[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  let seq = 0
  const push = (issue: Omit<ValidationIssue, 'id'>) => {
    issues.push({ ...issue, id: `issue-${String(seq).padStart(5, '0')}` })
    seq += 1
  }

  validateEmployees(employees, params, push)
  validateLeave(employees, leaveBalances, leaveRecords, push)
  validateWorkSchedules(employees, leaveRecords, workSchedules, push)

  // 정렬: severity > 직원명 > 코드 (안정 정렬을 위해 먼저 키로 정렬)
  issues.sort((a, b) => {
    const sr = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
    if (sr !== 0) return sr
    const nameA = a.employeeName ?? '~~'
    const nameB = b.employeeName ?? '~~'
    if (nameA !== nameB) return nameA.localeCompare(nameB, 'ko')
    return a.code.localeCompare(b.code)
  })

  // 정렬 후 id 재할당 (결정적)
  return issues.map((iss, i) => ({ ...iss, id: `issue-${String(i).padStart(5, '0')}` }))
}

// ── 직원 검사 ──────────────────────────────────────────────────────
type PushFn = (issue: Omit<ValidationIssue, 'id'>) => void

function empInfo(e: Employee) {
  return {
    employeeId: e.id,
    employeeName: e.name || undefined,
    department: e.dept || undefined,
    position: e.position || undefined,
  }
}

function validateEmployees(
  employees: Employee[],
  params: Params,
  push: PushFn,
): void {
  const empIds = new Map<number, number>() // id -> count
  const nameDateMap = new Map<string, number>() // normalized name + hireDate -> count
  const deptNormMap = new Map<string, string[]>() // normalized dept -> original depts

  employees.forEach((e) => {
    const idCount = (empIds.get(e.id) ?? 0) + 1
    empIds.set(e.id, idCount)
    if (e.hireDate && isValidISODate(e.hireDate)) {
      const key = `${normalizeName(e.name)}|${e.hireDate}`
      nameDateMap.set(key, (nameDateMap.get(key) ?? 0) + 1)
    }
    if (e.dept) {
      const norm = normalizeDept(e.dept)
      if (!deptNormMap.has(norm)) deptNormMap.set(norm, [])
      deptNormMap.get(norm)!.push(e.dept)
    }
  })

  const simBaseValid = isValidISODate(params.simulationBaseDate)
  const simBaseDate = parseStrict(params.simulationBaseDate)

  // 시스템 검사: 기준일
  if (!params.simulationBaseDate) {
    push({
      code: 'SYS_BASE_DATE_MISSING',
      severity: 'review',
      source: 'system',
      field: 'simulationBaseDate',
      currentValue: String(params.simulationBaseDate ?? ''),
      message: '시뮬레이션 기준일이 설정되어 있지 않아요. 근속연수 자동계산에 오류가 발생할 수 있어요.',
    })
  } else if (!simBaseValid) {
    push({
      code: 'SYS_BASE_DATE_INVALID',
      severity: 'review',
      source: 'system',
      field: 'simulationBaseDate',
      currentValue: params.simulationBaseDate,
      message: '시뮬레이션 기준일이 올바른 날짜 형식(YYYY-MM-DD)이 아니에요.',
    })
  }

  // 시스템 검사: 봉급표 비어있음 (호봉제 모드일 때만)
  if (params.useStepSystem && params.salaryTable.length === 0) {
    push({
      code: 'SYS_SALARY_TABLE_EMPTY',
      severity: 'review',
      source: 'system',
      field: 'salaryTable',
      currentValue: '0건',
      message: '호봉제 모드가 활성화되어 있지만 봉급표가 비어있어요. 직원별 연봉을 조회할 수 없어요.',
    })
  }

  employees.forEach((e) => {
    const info = empInfo(e)

    // 중복 ID
    if ((empIds.get(e.id) ?? 0) > 1) {
      push({
        code: 'EMP_DUP_ID',
        severity: 'error',
        source: 'employee',
        field: 'id',
        currentValue: String(e.id),
        message: `직원 ID "${e.id}"가 중복되어 있어요.`,
        ...info,
      })
    }

    // 이름 누락
    if (!e.name || !e.name.trim()) {
      push({
        code: 'EMP_NAME_MISSING',
        severity: 'error',
        source: 'employee',
        field: 'name',
        currentValue: String(e.name ?? ''),
        message: '직원 이름이 입력되지 않았어요.',
        ...info,
      })
    }

    // 부서 누락
    if (!e.dept || !e.dept.trim()) {
      push({
        code: 'EMP_DEPT_MISSING',
        severity: 'error',
        source: 'employee',
        field: 'dept',
        currentValue: String(e.dept ?? ''),
        message: '부서가 입력되지 않았어요.',
        ...info,
      })
    }

    // 직급 누락
    if (!e.position || !e.position.trim()) {
      push({
        code: 'EMP_POSITION_MISSING',
        severity: 'error',
        source: 'employee',
        field: 'position',
        currentValue: String(e.position ?? ''),
        message: '직급이 입력되지 않았어요.',
        ...info,
      })
    }

    // 연봉
    if (!isFiniteNum(e.baseSalary) || e.baseSalary <= 0) {
      push({
        code: 'EMP_SALARY_INVALID',
        severity: 'error',
        source: 'employee',
        field: 'baseSalary',
        currentValue: String(e.baseSalary),
        message: '연봉이 0 이하이거나 올바른 숫자가 아니에요.',
        ...info,
      })
    }

    // 근속연수
    if (!isFiniteNum(e.tenure) || e.tenure < 0) {
      push({
        code: 'EMP_TENURE_INVALID',
        severity: 'error',
        source: 'employee',
        field: 'tenure',
        currentValue: String(e.tenure),
        message: '근속연수가 음수이거나 올바른 숫자가 아니에요.',
        ...info,
      })
    }

    // 평가등급
    if (!VALID_GRADES.has(e.grade)) {
      push({
        code: 'EMP_GRADE_INVALID',
        severity: 'error',
        source: 'employee',
        field: 'grade',
        currentValue: String(e.grade),
        message: `인사평가등급 "${e.grade}"이(가) S/A/B/C/D 중 하나가 아니에요.`,
        ...info,
      })
    }

    // 호봉
    if (e.step !== undefined && (!Number.isInteger(e.step) || e.step <= 0)) {
      push({
        code: 'EMP_STEP_INVALID',
        severity: 'error',
        source: 'employee',
        field: 'step',
        currentValue: String(e.step),
        message: '호봉은 양의 정수여야 해요.',
        ...info,
      })
    }

    // 입사일
    const hireValid = isValidISODate(e.hireDate)
    if (e.hireDate && !hireValid) {
      push({
        code: 'EMP_HIRE_DATE_INVALID',
        severity: 'error',
        source: 'employee',
        field: 'hireDate',
        currentValue: e.hireDate,
        message: '입사일이 올바른 날짜(YYYY-MM-DD)가 아니에요.',
        ...info,
      })
    } else if (!e.hireDate) {
      push({
        code: 'EMP_HIRE_DATE_MISSING',
        severity: 'review',
        source: 'employee',
        field: 'hireDate',
        currentValue: '',
        message: '입사일이 입력되지 않았어요. 근속연수 자동계산이 불가능해요.',
        ...info,
      })
    }

    // 부서 발령일
    const deptAssignValid = isValidISODate(e.departmentAssignedDate)
    if (e.departmentAssignedDate && !deptAssignValid) {
      push({
        code: 'EMP_DEPT_DATE_INVALID',
        severity: 'error',
        source: 'employee',
        field: 'departmentAssignedDate',
        currentValue: e.departmentAssignedDate,
        message: '부서 발령일이 올바른 날짜(YYYY-MM-DD)가 아니에요.',
        ...info,
      })
    } else if (!e.departmentAssignedDate) {
      push({
        code: 'EMP_DEPT_DATE_MISSING',
        severity: 'review',
        source: 'employee',
        field: 'departmentAssignedDate',
        currentValue: '',
        message: '부서 발령일이 입력되지 않았어요. 현부서 근무기간 자동계산이 불가능해요.',
        ...info,
      })
    }

    // 입사일 > 기준일
    const hireDate = parseStrict(e.hireDate)
    if (hireValid && simBaseValid && hireDate && simBaseDate && hireDate.getTime() > simBaseDate.getTime()) {
      push({
        code: 'EMP_HIRE_AFTER_BASE',
        severity: 'error',
        source: 'employee',
        field: 'hireDate',
        currentValue: `${e.hireDate} (기준일: ${params.simulationBaseDate})`,
        message: `입사일(${e.hireDate})이 시뮬레이션 기준일(${params.simulationBaseDate})보다 이후예요.`,
        ...info,
      })
    }

    // 발령일 < 입사일
    const deptDate = parseStrict(e.departmentAssignedDate)
    if (hireValid && deptAssignValid && hireDate && deptDate && deptDate.getTime() < hireDate.getTime()) {
      push({
        code: 'EMP_DEPT_BEFORE_HIRE',
        severity: 'error',
        source: 'employee',
        field: 'departmentAssignedDate',
        currentValue: `${e.departmentAssignedDate} (입사일: ${e.hireDate})`,
        message: `부서 발령일(${e.departmentAssignedDate})이 입사일(${e.hireDate})보다 이전이에요.`,
        ...info,
      })
    }

    // 호봉제 모드: 직급×호봉 봉급표 불일치
    if (params.useStepSystem && e.position && e.step !== undefined) {
      const step = e.step
      const found = params.salaryTable.find((r) => r.position === e.position && r.step === step)
      if (!found) {
        push({
          code: 'EMP_SALARY_TABLE_MISMATCH',
          severity: 'warning',
          source: 'employee',
          field: 'step',
          currentValue: `${e.position} / ${e.step}호봉`,
          message: `호봉제 모드에서 "${e.position} / ${e.step}호봉"에 해당하는 봉급표 항목을 찾을 수 없어요.`,
          ...info,
        })
      }

      // 최대 호봉 초과
      const maxStep = params.maxStepByPosition[e.position]
      if (maxStep !== undefined && step > maxStep) {
        push({
          code: 'EMP_STEP_EXCEEDS_MAX',
          severity: 'warning',
          source: 'employee',
          field: 'step',
          currentValue: `${e.step} (최대: ${maxStep})`,
          message: `현재 호봉(${e.step})이 "${e.position}"의 최대 호봉(${maxStep})을 초과해요.`,
          ...info,
        })
      }
    }

    // 호봉 누락 (호봉제 모드)
    if (params.useStepSystem && e.step === undefined) {
      push({
        code: 'EMP_STEP_MISSING',
        severity: 'review',
        source: 'employee',
        field: 'step',
        currentValue: '',
        message: '호봉제 모드가 활성화되어 있지만 호봉이 입력되지 않았어요.',
        ...info,
      })
    }

    // 입사일 기반 근속연수와 입력 근속연수 차이
    if (hireValid && simBaseValid && hireDate && simBaseDate) {
      const computed = calcTenure(e.hireDate, params.simulationBaseDate)
      if (computed.years !== null && isFiniteNum(e.tenure)) {
        if (Math.abs(computed.years - e.tenure) >= 1) {
          push({
            code: 'EMP_TENURE_MISMATCH',
            severity: 'warning',
            source: 'employee',
            field: 'tenure',
            currentValue: `입력: ${e.tenure}년 / 계산: ${computed.years}년`,
            message: `입력된 근속연수(${e.tenure}년)와 입사일 기반 계산값(${computed.years}년)이 1년 이상 차이나요.`,
            ...info,
          })
        }
      }
    }

    // 동일 정규화 이름 + 입사일 중복
    if (e.hireDate && hireValid) {
      const key = `${normalizeName(e.name)}|${e.hireDate}`
      if ((nameDateMap.get(key) ?? 0) > 1) {
        push({
          code: 'EMP_NAME_DATE_DUP',
          severity: 'warning',
          source: 'employee',
          field: 'name',
          currentValue: `${e.name} / ${e.hireDate}`,
          message: `같은 이름과 입사일을 가진 직원이 여러 명이에요. 중복 등록일 수 있어요.`,
          ...info,
        })
      }
    }

    // 부서명 공백 차이
    if (e.dept) {
      const norm = normalizeDept(e.dept)
      const variants = deptNormMap.get(norm) ?? []
      const uniqueOriginals = new Set(variants)
      if (uniqueOriginals.size > 1) {
        push({
          code: 'EMP_DEPT_WHITESPACE',
          severity: 'warning',
          source: 'employee',
          field: 'dept',
          currentValue: Array.from(uniqueOriginals).join(' / '),
          message: `공백만 다른 부서명이 섞여 있어요: ${Array.from(uniqueOriginals).join(', ')}. 부서명을 통일해 주세요.`,
          ...info,
        })
      }
    }
  })
}

// ── 휴가 검사 ──────────────────────────────────────────────────────
function validateLeave(
  employees: Employee[],
  leaveBalances: LeaveBalance[],
  leaveRecords: LeaveRecord[],
  push: PushFn,
): void {
  const empMap = new Map<number, Employee>()
  employees.forEach((e) => empMap.set(e.id, e))

  // 잔고 검사
  leaveBalances.forEach((b) => {
    const emp = empMap.get(b.employeeId)
    const info = emp
      ? empInfo(emp)
      : { employeeId: b.employeeId }
    if (!emp) {
      push({
        code: 'LV_BALANCE_ORPHAN',
        severity: 'error',
        source: 'leave',
        field: 'employeeId',
        currentValue: String(b.employeeId),
        message: `휴가 잔고가 존재하지 않는 직원(ID: ${b.employeeId})을 참조하고 있어요.`,
        ...info,
      })
    }
    if (!isFiniteNum(b.grantedDays) || b.grantedDays < 0) {
      push({
        code: 'LV_BALANCE_INVALID',
        severity: 'error',
        source: 'leave',
        field: 'grantedDays',
        currentValue: String(b.grantedDays),
        message: '부여일수가 음수이거나 올바른 숫자가 아니에요.',
        ...info,
      })
    }
  })

  // 기록 검사
  const approvedByEmpYear = new Map<string, LeaveRecord[]>() // empId|year -> records

  leaveRecords.forEach((r) => {
    const emp = empMap.get(r.employeeId)
    const info = emp ? empInfo(emp) : { employeeId: r.employeeId }

    if (!emp) {
      push({
        code: 'LV_RECORD_ORPHAN',
        severity: 'error',
        source: 'leave',
        field: 'employeeId',
        currentValue: String(r.employeeId),
        message: `휴가 기록이 존재하지 않는 직원(ID: ${r.employeeId})을 참조하고 있어요.`,
        ...info,
      })
    }

    // 부여일수 검사는 위에서 함

    // 날짜 검증
    const startValid = isValidISODate(r.startDate)
    const endValid = isValidISODate(r.endDate)
    if (!startValid) {
      push({
        code: 'LV_START_DATE_INVALID',
        severity: 'error',
        source: 'leave',
        field: 'startDate',
        currentValue: r.startDate,
        message: '휴가 시작일이 올바른 날짜(YYYY-MM-DD)가 아니에요.',
        ...info,
      })
    }
    if (!endValid) {
      push({
        code: 'LV_END_DATE_INVALID',
        severity: 'error',
        source: 'leave',
        field: 'endDate',
        currentValue: r.endDate,
        message: '휴가 종료일이 올바른 날짜(YYYY-MM-DD)가 아니에요.',
        ...info,
      })
    }
    if (startValid && endValid && r.endDate < r.startDate) {
      push({
        code: 'LV_END_BEFORE_START',
        severity: 'error',
        source: 'leave',
        field: 'endDate',
        currentValue: `${r.startDate} ~ ${r.endDate}`,
        message: '휴가 종료일이 시작일보다 이전이에요.',
        ...info,
      })
    }

    // 일수
    if (!isFiniteNum(r.days) || r.days <= 0) {
      push({
        code: 'LV_DAYS_INVALID',
        severity: 'error',
        source: 'leave',
        field: 'days',
        currentValue: String(r.days),
        message: '휴가 일수가 0 이하이거나 올바른 숫자가 아니에요.',
        ...info,
      })
    } else if (r.days % 0.5 !== 0) {
      push({
        code: 'LV_DAYS_NOT_HALF',
        severity: 'error',
        source: 'leave',
        field: 'days',
        currentValue: String(r.days),
        message: '휴가 일수는 0.5일 단위여야 해요.',
        ...info,
      })
    }

    // 유형/상태
    if (!LEAVE_TYPE_SET.has(r.type)) {
      push({
        code: 'LV_TYPE_UNSUPPORTED',
        severity: 'error',
        source: 'leave',
        field: 'type',
        currentValue: String(r.type),
        message: `지원하지 않는 휴가 유형("${r.type}")이에요.`,
        ...info,
      })
    }
    if (!LEAVE_STATUS_SET.has(r.status)) {
      push({
        code: 'LV_STATUS_UNSUPPORTED',
        severity: 'error',
        source: 'leave',
        field: 'status',
        currentValue: String(r.status),
        message: `지원하지 않는 휴가 상태("${r.status}")예요.`,
        ...info,
      })
    }

    // 반차 일수
    if ((r.type === 'AM Half-day' || r.type === 'PM Half-day') && r.days !== 0.5) {
      push({
        code: 'LV_HALFDAY_DAYS',
        severity: 'warning',
        source: 'leave',
        field: 'days',
        currentValue: String(r.days),
        message: '오전/오후반차는 0.5일이어야 해요.',
        ...info,
      })
    }

    // 승인된 휴가 누적 (연도별 그룹)
    if (r.status === 'Approved' && startValid) {
      const year = r.startDate.slice(0, 4)
      const key = `${r.employeeId}|${year}`
      if (!approvedByEmpYear.has(key)) approvedByEmpYear.set(key, [])
      approvedByEmpYear.get(key)!.push(r)
    }
  })

  // 승인된 휴가 기간 겹침
  approvedByEmpYear.forEach((records, key) => {
    const [empIdStr] = key.split('|')
    const empId = parseInt(empIdStr, 10)
    const emp = empMap.get(empId)
    const info = emp ? empInfo(emp) : { employeeId: empId }
    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = records[i]
        const b = records[j]
        if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
          push({
            code: 'LV_OVERLAP',
            severity: 'warning',
            source: 'leave',
            field: 'startDate',
            currentValue: `${a.startDate}~${a.endDate} / ${b.startDate}~${b.endDate}`,
            message: '승인된 휴가 기간이 겹쳐요.',
            ...info,
          })
        }
      }
    }
  })

  // 승인된 휴가 사용일수 > 부여일수
  const usedByEmpYear = new Map<string, number>()
  approvedByEmpYear.forEach((records, key) => {
    usedByEmpYear.set(key, records.reduce((s, r) => s + r.days, 0))
  })
  usedByEmpYear.forEach((used, key) => {
    const [empIdStr, yearStr] = key.split('|')
    const empId = parseInt(empIdStr, 10)
    const year = parseInt(yearStr, 10)
    const emp = empMap.get(empId)
    const info = emp ? empInfo(emp) : { employeeId: empId }
    const balance = leaveBalances.find((b) => b.employeeId === empId && b.year === year)
    if (balance && used > balance.grantedDays) {
      push({
        code: 'LV_EXCEEDS_BALANCE',
        severity: 'warning',
        source: 'leave',
        field: 'days',
        currentValue: `사용: ${used}일 / 부여: ${balance.grantedDays}일`,
        message: `승인된 휴가 사용일수(${used}일)가 부여일수(${balance.grantedDays}일)를 초과해요.`,
        ...info,
      })
    }
  })

  // 기록은 있지만 잔고 없음
  leaveRecords.forEach((r) => {
    if (!isValidISODate(r.startDate)) return
    const year = parseInt(r.startDate.slice(0, 4), 10)
    const hasBalance = leaveBalances.some((b) => b.employeeId === r.employeeId && b.year === year)
    if (!hasBalance) {
      const emp = empMap.get(r.employeeId)
      const info = emp ? empInfo(emp) : { employeeId: r.employeeId }
      push({
        code: 'LV_NO_BALANCE',
        severity: 'review',
        source: 'leave',
        field: 'grantedDays',
        currentValue: `${year}년 잔고 없음`,
        message: `${year}년 휴가 기록이 있지만 부여 잔고가 설정되어 있지 않아요.`,
        ...info,
      })
    }
  })
}

// ── 유연근무 검사 ──────────────────────────────────────────────────
function validateWorkSchedules(
  employees: Employee[],
  leaveRecords: LeaveRecord[],
  workSchedules: WorkSchedule[],
  push: PushFn,
): void {
  const empMap = new Map<number, Employee>()
  employees.forEach((e) => empMap.set(e.id, e))

  // 중복 (같은 직원+날짜)
  const seen = new Map<string, number>() // empId|date -> count
  workSchedules.forEach((s) => {
    const key = `${s.employeeId}|${s.date}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  })

  // 승인된 휴가 기간
  const approvedLeave = leaveRecords.filter(
    (r) => r.status === 'Approved' && isValidISODate(r.startDate) && isValidISODate(r.endDate),
  )

  workSchedules.forEach((s) => {
    const emp = empMap.get(s.employeeId)
    const info = emp ? empInfo(emp) : { employeeId: s.employeeId }

    if (!emp) {
      push({
        code: 'WS_ORPHAN',
        severity: 'error',
        source: 'work-schedule',
        field: 'employeeId',
        currentValue: String(s.employeeId),
        message: `근무 스케줄이 존재하지 않는 직원(ID: ${s.employeeId})을 참조하고 있어요.`,
        ...info,
      })
    }

    if (!isValidISODate(s.date)) {
      push({
        code: 'WS_DATE_INVALID',
        severity: 'error',
        source: 'work-schedule',
        field: 'date',
        currentValue: s.date,
        message: '근무 날짜가 올바른 날짜(YYYY-MM-DD)가 아니에요.',
        ...info,
      })
    }

    if (!WORK_PATTERN_SET.has(s.pattern)) {
      push({
        code: 'WS_PATTERN_UNSUPPORTED',
        severity: 'error',
        source: 'work-schedule',
        field: 'pattern',
        currentValue: String(s.pattern),
        message: `지원하지 않는 근무 형태("${s.pattern}")예요.`,
        ...info,
      })
    }

    // 중복
    const key = `${s.employeeId}|${s.date}`
    if ((seen.get(key) ?? 0) > 1) {
      push({
        code: 'WS_DUPLICATE',
        severity: 'error',
        source: 'work-schedule',
        field: 'date',
        currentValue: `${s.employeeId} / ${s.date}`,
        message: '같은 직원의 같은 날짜에 근무 스케줄이 중복되어 있어요.',
        ...info,
      })
    }

    // 시작/종료시간
    if (s.startTime && s.endTime && s.endTime <= s.startTime) {
      push({
        code: 'WS_TIME_INVALID',
        severity: 'error',
        source: 'work-schedule',
        field: 'endTime',
        currentValue: `${s.startTime} ~ ${s.endTime}`,
        message: '종료시간이 시작시간보다 같거나 이전이에요.',
        ...info,
      })
    }

    // 시차/단축: 시간 누락
    if (s.pattern === 'Staggered Hours' || s.pattern === 'Reduced Hours') {
      if (!s.startTime || !s.endTime) {
        push({
          code: 'WS_TIME_MISSING',
          severity: 'review',
          source: 'work-schedule',
          field: 'startTime',
          currentValue: `시작: ${s.startTime ?? '없음'} / 종료: ${s.endTime ?? '없음'}`,
          message: `"${s.pattern}" 형태는 시작/종료시간이 모두 필요해요.`,
          ...info,
        })
      }
    }

    // 승인된 휴가와 겹침
    if (isValidISODate(s.date)) {
      const overlaps = approvedLeave.some(
        (r) => r.employeeId === s.employeeId && s.date >= r.startDate && s.date <= r.endDate,
      )
      if (overlaps) {
        push({
          code: 'WS_LEAVE_OVERLAP',
          severity: 'review',
          source: 'work-schedule',
          field: 'date',
          currentValue: s.date,
          message: '승인된 휴가 기간과 근무 스케줄이 겹쳐요.',
          ...info,
        })
      }
    }
  })
}
