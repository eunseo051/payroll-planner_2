// 데이터 품질 센터 — 업로드된 직원 데이터의 누락/이상/중복을 감지
// 급여 계산(lib/calc.ts)은 건드리지 않고 읽기 전용으로 검사만 수행

import { Employee } from './calc'
import { LeaveRecord, WorkSchedule } from './workforce-types'

export type IssueLevel = 'error' | 'warning' | 'info'

export type Issue = {
  level: IssueLevel
  category: string
  message: string
  employeeId?: number
  employeeName?: string
}

const VALID_GRADES = new Set(['S', 'A', 'B', 'C', 'D'])

function isValidDate(s?: string): boolean {
  if (!s) return false
  const d = new Date(s)
  return !isNaN(d.getTime())
}

export function runDataQualityChecks(
  employees: Employee[],
  leaveRecords: LeaveRecord[],
  workSchedules: WorkSchedule[],
): Issue[] {
  const issues: Issue[] = []
  if (employees.length === 0) return issues

  const ids = new Set(employees.map((e) => e.id))
  const nameCount = new Map<string, number>()

  employees.forEach((e) => {
    if (!e.name?.trim()) {
      issues.push({ level: 'error', category: '이름', message: '이름이 비어있어요.', employeeId: e.id, employeeName: e.name })
    } else {
      nameCount.set(e.name, (nameCount.get(e.name) ?? 0) + 1)
    }

    if (!e.dept?.trim() || e.dept === '미지정') {
      issues.push({ level: 'warning', category: '부서', message: '부서가 미지정이에요.', employeeId: e.id, employeeName: e.name })
    }

    if (!e.position?.trim()) {
      issues.push({ level: 'warning', category: '직급', message: '직급이 비어있어요. 호봉제 모드에서 봉급표 조회가 안 될 수 있어요.', employeeId: e.id, employeeName: e.name })
    }

    if (!e.baseSalary || e.baseSalary <= 0) {
      issues.push({ level: 'error', category: '연봉', message: '현재연봉이 0이거나 비어있어요.', employeeId: e.id, employeeName: e.name })
    }

    if (!e.hireDate && !e.tenure) {
      issues.push({ level: 'warning', category: '근속', message: '입사일과 근속연수가 모두 비어있어요. 승진 추정이 어려워요.', employeeId: e.id, employeeName: e.name })
    }

    if (e.hireDate && !isValidDate(e.hireDate)) {
      issues.push({ level: 'error', category: '입사일', message: `입사일 형식이 잘못됐어요: "${e.hireDate}"`, employeeId: e.id, employeeName: e.name })
    }

    if (e.departmentAssignedDate && !isValidDate(e.departmentAssignedDate)) {
      issues.push({ level: 'warning', category: '부서발령일', message: `부서발령일 형식이 잘못됐어요: "${e.departmentAssignedDate}"`, employeeId: e.id, employeeName: e.name })
    }

    if (e.grade && !VALID_GRADES.has(e.grade)) {
      issues.push({ level: 'warning', category: '평가등급', message: `평가등급 "${e.grade}"이(가) S/A/B/C/D 외 값이에요.`, employeeId: e.id, employeeName: e.name })
    }
    if (!e.grade) {
      issues.push({ level: 'info', category: '평가등급', message: '평가등급이 비어있어요. 기본값 B로 처리돼요.', employeeId: e.id, employeeName: e.name })
    }
  })

  // 중복 이름
  nameCount.forEach((count, name) => {
    if (count > 1 && name) {
      issues.push({ level: 'warning', category: '중복', message: `동일한 이름 "${name}"이(가) ${count}명 있어요. 동일 인물 중복 등록인지 확인해주세요.` })
    }
  })

  // 휴가/근무 데이터가 존재하지 않는 직원을 참조하는지
  leaveRecords.forEach((r) => {
    if (!ids.has(r.employeeId)) {
      issues.push({ level: 'warning', category: '휴가데이터', message: `휴가 기록이 존재하지 않는 직원 ID(${r.employeeId})를 참조해요.` })
    }
  })
  workSchedules.forEach((r) => {
    if (!ids.has(r.employeeId)) {
      issues.push({ level: 'warning', category: '근무데이터', message: `근무 스케줄이 존재하지 않는 직원 ID(${r.employeeId})를 참조해요.` })
    }
  })

  return issues
}

export type IssueSummary = {
  total: number
  errors: number
  warnings: number
  infos: number
  byCategory: Record<string, number>
}

export function summarizeIssues(issues: Issue[]): IssueSummary {
  const summary: IssueSummary = { total: issues.length, errors: 0, warnings: 0, infos: 0, byCategory: {} }
  issues.forEach((i) => {
    if (i.level === 'error') summary.errors++
    else if (i.level === 'warning') summary.warnings++
    else summary.infos++
    summary.byCategory[i.category] = (summary.byCategory[i.category] ?? 0) + 1
  })
  return summary
}
