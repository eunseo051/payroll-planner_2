// 휴가·유연근무 데이터 타입
// 급여 계산과 분리된 별도 데이터 — Employee.id 와 employeeId 로 연결
// 급여 계산(lib/calc.ts)에는 영향을 주지 않음

export type LeaveType =
  | 'Annual Leave'
  | 'AM Half-day'
  | 'PM Half-day'
  | 'Sick Leave'
  | 'Official Leave'
  | 'Special Leave'

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'

export type LeaveBalance = {
  employeeId: number
  year: number
  grantedDays: number
}

export type LeaveRecord = {
  id: string
  employeeId: number
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  status: LeaveStatus
  note?: string
}

export type WorkPattern =
  | 'Regular'
  | 'Staggered Hours'
  | 'Remote'
  | 'Business Trip'
  | 'Reduced Hours'

export type WorkSchedule = {
  id: string
  employeeId: number
  date: string
  pattern: WorkPattern
  startTime?: string
  endTime?: string
  note?: string
}

export const LEAVE_TYPES: LeaveType[] = [
  'Annual Leave',
  'AM Half-day',
  'PM Half-day',
  'Sick Leave',
  'Official Leave',
  'Special Leave',
]

export const LEAVE_STATUSES: LeaveStatus[] = ['Pending', 'Approved', 'Rejected']

export const WORK_PATTERNS: WorkPattern[] = [
  'Regular',
  'Staggered Hours',
  'Remote',
  'Business Trip',
  'Reduced Hours',
]
