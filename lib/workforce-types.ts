// 휴가·유연근무 데이터 타입
// 급여 계산과 분리된 별도 데이터 — Employee.id 와 employeeId 로 연결
// 급여 계산(lib/calc.ts)에는 영향을 주지 않음
// 내부 값은 영문 union을 유지하고 UI 표시는 한국어 라벨 매핑 사용

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

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  'Annual Leave': '연차',
  'AM Half-day': '오전반차',
  'PM Half-day': '오후반차',
  'Sick Leave': '병가',
  'Official Leave': '공가',
  'Special Leave': '특별휴가',
}

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  Pending: '대기',
  Approved: '승인',
  Rejected: '반려',
}

export const WORK_PATTERN_LABEL: Record<WorkPattern, string> = {
  Regular: '기본근무',
  'Staggered Hours': '시차출퇴근',
  Remote: '재택근무',
  'Business Trip': '출장',
  'Reduced Hours': '단축근무',
}
