'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useData } from '@/lib/store'
import { useWorkforce } from '@/lib/workforce-store'
import {
  LEAVE_TYPES,
  LEAVE_STATUSES,
  WORK_PATTERNS,
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  WORK_PATTERN_LABEL,
  type LeaveType,
  type LeaveStatus,
  type WorkPattern,
  type LeaveRecord,
} from '@/lib/workforce-types'
import { Employee } from '@/lib/calc'

// ── 날짜 헬퍼 (로컬 YYYY-MM-DD, 타임존 셰프팅 방지) ───────────────────────
const WEEKDAYS = ['월', '화', '수', '목', '금'] as const

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function getMondayOfWeek(ref: Date): Date {
  const d = new Date(ref)
  const day = d.getDay()
  const diff = (day + 6) % 7 // 월=0
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// ── 배지 스타일 ──────────────────────────────────────────────────────
const STATUS_BADGE: Record<LeaveStatus, string> = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
}

const PATTERN_BADGE: Record<WorkPattern, string> = {
  Regular: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Staggered Hours': 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  Remote: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  'Business Trip': 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  'Reduced Hours': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
}

// ── 메인 페이지 ──────────────────────────────────────────────────────
export default function WorkforcePage() {
  const { employees } = useData()
  const wf = useWorkforce()

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarDays className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">등록된 직원이 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            근무·휴가 운영을 하려면 먼저 직원 기초데이터가 필요해요.
          </p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  const hasWorkforceData =
    wf.leaveBalances.length > 0 ||
    wf.leaveRecords.length > 0 ||
    wf.workSchedules.length > 0

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-start gap-2 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            이 화면은 휴가·유연근무 현황을 단순 기록용으로 관리해요. 법정 연차 산정 규칙, 장기 휴직,
            출퇴근 체크인/아웃, 결재 흐름은 지원하지 않으며 급여 계산에는 연결되지 않아요. 데이터는
            브라우저(localStorage)에만 저장돼요.
          </p>
        </CardContent>
      </Card>

      {!hasWorkforceData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">근무·휴가 데이터가 비어있어요</CardTitle>
            <p className="text-xs text-muted-foreground">
              직원은 {employees.length}명 등록되어 있어요. 아래 버튼으로 시연용 가상 데이터를 만들거나,
              직접 입력을 시작할 수 있어요.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => wf.generateDemoData(employees)}>
              <Sparkles className="size-4" /> 시연용 일정 생성
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={wf.resetWorkforce}
            >
              <RotateCcw className="size-4" /> 근무·휴가 데이터 초기화
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">휴가 현황</TabsTrigger>
          <TabsTrigger value="schedule">팀 근무표</TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          <LeaveTab employees={employees} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── 공통 필터 ──────────────────────────────────────────────────────
function useFilters(employees: Employee[]) {
  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.dept).filter(Boolean))).sort(),
    [employees],
  )
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [dept, setDept] = useState<string>('all')
  const [nameQuery, setNameQuery] = useState('')

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (dept !== 'all' && e.dept !== dept) return false
      if (nameQuery && !e.name.toLowerCase().includes(nameQuery.toLowerCase())) return false
      return true
    })
  }, [employees, dept, nameQuery])

  return { departments, year, setYear, dept, setDept, nameQuery, setNameQuery, filtered }
}

// ── 휴가 현황 탭 ──────────────────────────────────────────────────────
function LeaveTab({ employees }: { employees: Employee[] }) {
  const { leaveBalances, leaveRecords, upsertLeaveBalance, addLeaveRecord, updateLeaveRecord, removeLeaveRecord } =
    useWorkforce()
  const { departments, year, setYear, dept, setDept, nameQuery, setNameQuery, filtered } =
    useFilters(employees)

  const [balanceOpen, setBalanceOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // 요약 계산
  const summary = useMemo(() => {
    const empIds = new Set(filtered.map((e) => e.id))
    const balances = leaveBalances.filter((b) => b.year === year && empIds.has(b.employeeId))
    const records = leaveRecords.filter((r) => empIds.has(r.employeeId))

    const configuredCount = balances.length
    const totalGranted = balances.reduce((s, b) => s + b.grantedDays, 0)
    const approvedUsed = records
      .filter((r) => r.status === 'Approved')
      .reduce((s, r) => s + r.days, 0)
    const pendingDays = records
      .filter((r) => r.status === 'Pending')
      .reduce((s, r) => s + r.days, 0)
    const remaining = totalGranted - approvedUsed

    return { configuredCount, totalGranted, approvedUsed, pendingDays, remaining }
  }, [filtered, leaveBalances, leaveRecords, year])

  // 직원별 요약 테이블
  const empRows = useMemo(() => {
    return filtered.map((e) => {
      const balance = leaveBalances.find(
        (b) => b.employeeId === e.id && b.year === year,
      )
      const empRecords = leaveRecords.filter((r) => r.employeeId === e.id)
      const approvedUsed = empRecords
        .filter((r) => r.status === 'Approved')
        .reduce((s, r) => s + r.days, 0)
      const pending = empRecords
        .filter((r) => r.status === 'Pending')
        .reduce((s, r) => s + r.days, 0)
      const granted = balance?.grantedDays
      const remaining = granted !== undefined ? granted - approvedUsed : undefined
      const usageRate =
        granted !== undefined && granted > 0 ? (approvedUsed / granted) * 100 : null
      return { e, granted, approvedUsed, pending, remaining, usageRate }
    })
  }, [filtered, leaveBalances, leaveRecords, year])

  // 휴가 기록 테이블 (필터 적용)
  const recordRows = useMemo(() => {
    const empIds = new Set(filtered.map((e) => e.id))
    return leaveRecords
      .filter((r) => empIds.has(r.employeeId))
      .map((r) => ({
        record: r,
        emp: employees.find((e) => e.id === r.employeeId),
      }))
      .sort((a, b) => b.record.startDate.localeCompare(a.record.startDate))
  }, [leaveRecords, filtered, employees])

  return (
    <div className="flex flex-col gap-6">
      {/* 필터 */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">기준연도</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-[100px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">부서</Label>
            <Select value={dept} onValueChange={(v) => setDept((v as string) ?? 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="전체 부서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">직원 이름 검색</Label>
            <Input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="이름 입력"
              className="w-[180px]"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBalanceOpen(true)}>
              <Plus className="size-4" /> 연차 부여 설정
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingRecord(null)
                setRecordOpen(true)
              }}
            >
              <Plus className="size-4" /> 휴가 기록 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="연차 설정 인원" value={`${summary.configuredCount}명`} />
        <SummaryCard
          label="총 부여일수"
          value={summary.totalGranted > 0 ? `${summary.totalGranted}일` : '미설정'}
        />
        <SummaryCard label="승인 사용일수" value={`${summary.approvedUsed}일`} />
        <SummaryCard label="승인 대기일수" value={`${summary.pendingDays}일`} />
        <SummaryCard
          label="잔여일수"
          value={
            summary.totalGranted > 0 ? `${summary.remaining}일` : '미설정'
          }
          warn={summary.remaining < 0}
        />
      </div>

      {/* 직원별 휴가 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">직원별 휴가 요약 ({empRows.length}명)</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead className="text-right">부여일수</TableHead>
                  <TableHead className="text-right">승인 사용</TableHead>
                  <TableHead className="text-right">승인 대기</TableHead>
                  <TableHead className="text-right">잔여일수</TableHead>
                  <TableHead className="text-right">사용률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empRows.map(({ e, granted, approvedUsed, pending, remaining, usageRate }) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.dept}</TableCell>
                    <TableCell>{e.position || '-'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {granted !== undefined ? `${granted}일` : '미설정'}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{approvedUsed}일</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{pending}일</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {remaining !== undefined ? (
                        <span className={remaining < 0 ? 'text-red-600' : ''}>{remaining}일</span>
                      ) : (
                        '미설정'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {usageRate !== null ? `${usageRate.toFixed(0)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 휴가 기록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">휴가 기록 ({recordRows.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기간</TableHead>
                  <TableHead>직원</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>휴가 유형</TableHead>
                  <TableHead className="text-right">일수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-center">수정</TableHead>
                  <TableHead className="text-center">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      휴가 기록이 없어요.
                    </TableCell>
                  </TableRow>
                )}
                {recordRows.map(({ record, emp }) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {record.startDate} ~ {record.endDate}
                    </TableCell>
                    <TableCell className="font-medium">{emp?.name ?? `#${record.employeeId}`}</TableCell>
                    <TableCell className="text-sm">{emp?.dept ?? '-'}</TableCell>
                    <TableCell>{LEAVE_TYPE_LABEL[record.type]}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{record.days}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_BADGE[record.status]}>
                        {LEAVE_STATUS_LABEL[record.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={record.note}>
                      {record.note || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingRecord(record)
                          setRecordOpen(true)
                        }}
                        aria-label="수정"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(record.id)}
                        aria-label="삭제"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 연차 부여 설정 다이얼로그 */}
      <BalanceDialog
        open={balanceOpen}
        onOpenChange={setBalanceOpen}
        employees={employees}
        year={year}
        onSave={upsertLeaveBalance}
        existingBalances={leaveBalances}
      />

      {/* 휴가 기록 다이얼로그 */}
      <RecordDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        employees={employees}
        editing={editingRecord}
        onAdd={addLeaveRecord}
        onUpdate={updateLeaveRecord}
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 기록 삭제</DialogTitle>
            <DialogDescription>
              이 휴가 기록을 삭제할까요? 이 작업은 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) removeLeaveRecord(deleteId)
                setDeleteId(null)
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={`text-2xl font-bold tabular-nums ${
            warn ? 'text-red-600' : ''
          }`}
        >
          {value}
        </span>
        {warn && (
          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <AlertTriangle className="size-3" /> 잔여 부족
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

// ── 연차 부여 설정 다이얼로그 ──────────────────────────────────────────
type LeaveBalanceTargetMode = 'employee' | 'department' | 'all'

function BalanceDialog({
  open,
  onOpenChange,
  employees,
  year,
  onSave,
  existingBalances,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employees: Employee[]
  year: number
  onSave: (row: { employeeId: number; year: number; grantedDays: number }) => void
  existingBalances: { employeeId: number; year: number }[]
}) {
  const [mode, setMode] = useState<LeaveBalanceTargetMode>('employee')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [department, setDepartment] = useState<string>('all')
  const [grantedDays, setGrantedDays] = useState<string>('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.dept).filter(Boolean))).sort(),
    [employees],
  )

  // 대상 직원 목록 도출
  const affectedEmployees = useMemo(() => {
    if (mode === 'employee') {
      const eid = parseInt(employeeId)
      return Number.isNaN(eid) ? [] : employees.filter((e) => e.id === eid)
    }
    if (mode === 'department') {
      return department === 'all' ? [] : employees.filter((e) => e.dept === department)
    }
    return employees
  }, [mode, employeeId, department, employees])

  // 부여일수 유효성 검사 — 빈 문자열을 Number()로 0으로 만들지 않도록 원본 문자열 먼저 검증
  const grantedDaysError = useMemo(() => {
    const raw = grantedDays.trim()
    if (raw === '') return '부여일수를 입력해주세요.'
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return '숫자로 입력해주세요.'
    const n = Number(raw)
    if (!Number.isFinite(n)) return '올바른 숫자가 아니에요.'
    if (n < 0) return '0 이상의 값을 입력해주세요.'
    return null
  }, [grantedDays])

  const yearValid = Number.isInteger(year) && year > 0
  const hasValidTarget = affectedEmployees.length > 0
  const canSave =
    yearValid &&
    grantedDaysError === null &&
    hasValidTarget &&
    !(mode === 'employee' && !employeeId) &&
    !(mode === 'department' && department === 'all')

  // 기존/신규 건수 계산
  const bulkStats = useMemo(() => {
    const existingSet = new Set(
      existingBalances
        .filter((b) => b.year === year)
        .map((b) => b.employeeId),
    )
    let updateCount = 0
    let newCount = 0
    affectedEmployees.forEach((e) => {
      if (existingSet.has(e.id)) updateCount++
      else newCount++
    })
    return { updateCount, newCount }
  }, [affectedEmployees, existingBalances, year])

  // 다이얼로그 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setMode('employee')
      setEmployeeId('')
      setDepartment('all')
      setGrantedDays('')
      setConfirmOpen(false)
    }
  }, [open])

  // 모드 전환 시 더 이상 관련 없는 선택 항목만 초기화 (연도·부여일수는 유지)
  function handleModeChange(next: LeaveBalanceTargetMode) {
    setMode(next)
    if (next !== 'employee') setEmployeeId('')
    if (next !== 'department') setDepartment('all')
  }

  function performSave() {
    if (grantedDaysError !== null) return
    const days = Number(grantedDays.trim())
    affectedEmployees.forEach((e) =>
      onSave({ employeeId: e.id, year, grantedDays: days }),
    )
    onOpenChange(false)
  }

  function handleSaveClick() {
    if (mode === 'employee') {
      performSave()
      return
    }
    setConfirmOpen(true)
  }

  const affectedLabel =
    mode === 'employee'
      ? affectedEmployees[0]?.name
        ? `${affectedEmployees[0].name} 직원 1명에게 적용됩니다.`
        : ''
      : mode === 'department'
        ? `${department} 직원 ${affectedEmployees.length}명에게 적용됩니다.`
        : `전체 직원 ${affectedEmployees.length}명에게 적용됩니다.`

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>연차 부여 설정</DialogTitle>
            <DialogDescription>
              부여 대상을 선택하고 기준연도와 부여일수를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {/* 부여 대상 선택 */}
            <div className="flex flex-col gap-1.5">
              <Label>부여 대상</Label>
              <Tabs
                value={mode}
                onValueChange={(v) => handleModeChange(v as LeaveBalanceTargetMode)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="employee" className="flex-1">직원 1명</TabsTrigger>
                  <TabsTrigger value="department" className="flex-1">선택 부서 전체</TabsTrigger>
                  <TabsTrigger value="all" className="flex-1">전 직원</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>기준연도</Label>
              <Input value={year} readOnly className="bg-muted/40" />
            </div>

            {mode === 'employee' && (
              <div className="flex flex-col gap-1.5">
                <Label>직원</Label>
                <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="직원 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name} · {e.dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === 'department' && (
              <div className="flex flex-col gap-1.5">
                <Label>부서</Label>
                <Select value={department} onValueChange={(v) => setDepartment((v as string) ?? 'all')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="부서 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>부여일수</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={grantedDays}
                onChange={(e) => setGrantedDays(e.target.value)}
                placeholder="부여일수 입력 (0 이상)"
              />
              {grantedDaysError && (
                <p className="text-xs text-destructive">{grantedDaysError}</p>
              )}
            </div>

            {hasValidTarget && affectedLabel && (
              <p className="text-sm text-muted-foreground">{affectedLabel}</p>
            )}
            {mode === 'department' && department !== 'all' && affectedEmployees.length === 0 && (
              <p className="text-xs text-destructive">해당 부서에 직원이 없어요.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button onClick={handleSaveClick} disabled={!canSave}>
              {mode === 'employee' ? '저장' : '다음'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 적용 확인 다이얼로그 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>연차 부여 일괄 적용</DialogTitle>
            <DialogDescription>
              {year}년도 연차 {Number(grantedDays.trim())}일을{' '}
              {mode === 'department'
                ? `${department} 직원 ${affectedEmployees.length}명`
                : `전체 직원 ${affectedEmployees.length}명`}
              에게 적용합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">기준연도</span>
              <span>{year}년</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">부여일수</span>
              <span>{Number(grantedDays.trim())}일</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">적용 대상</span>
              <span>
                {mode === 'department' ? `${department} 직원` : '전체 직원'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">대상 직원 수</span>
              <span>{affectedEmployees.length}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">기존 설정 업데이트</span>
              <span>{bulkStats.updateCount}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">신규 설정 생성</span>
              <span>{bulkStats.newCount}건</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            기존 설정 {bulkStats.updateCount}건은 업데이트되고, 신규 설정 {bulkStats.newCount}건이 생성됩니다.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button onClick={performSave}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── 휴가 기록 다이얼로그 ──────────────────────────────────────────────
function RecordDialog({
  open,
  onOpenChange,
  employees,
  editing,
  onAdd,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employees: Employee[]
  editing: LeaveRecord | null
  onAdd: (row: Omit<LeaveRecord, 'id'>) => void
  onUpdate: (id: string, patch: Partial<LeaveRecord>) => void
}) {
  const [employeeId, setEmployeeId] = useState<string>('')
  const [type, setType] = useState<LeaveType>('Annual Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [days, setDays] = useState<string>('')
  const [status, setStatus] = useState<LeaveStatus>('Pending')
  const [note, setNote] = useState('')

  // editing이 바뀌면 폼 초기화
  useEffect(() => {
    if (editing) {
      setEmployeeId(String(editing.employeeId))
      setType(editing.type)
      setStartDate(editing.startDate)
      setEndDate(editing.endDate)
      setDays(String(editing.days))
      setStatus(editing.status)
      setNote(editing.note ?? '')
    } else if (open) {
      setEmployeeId('')
      setType('Annual Leave')
      setStartDate('')
      setEndDate('')
      setDays('')
      setStatus('Pending')
      setNote('')
    }
  }, [editing, open])

  // 반차 선택 시 days 자동 0.5
  useEffect(() => {
    if (type === 'AM Half-day' || type === 'PM Half-day') {
      setDays('0.5')
    }
  }, [type])

  function handleSave() {
    const eid = parseInt(employeeId)
    const d = parseFloat(days)
    if (isNaN(eid) || !startDate || !endDate || isNaN(d) || d <= 0) return

    const row = {
      employeeId: eid,
      type,
      startDate,
      endDate,
      days: d,
      status,
      note: note.trim() || undefined,
    }
    if (editing) {
      onUpdate(editing.id, row)
    } else {
      onAdd(row)
    }
    onOpenChange(false)
  }

  const isHalfDay = type === 'AM Half-day' || type === 'PM Half-day'
  const valid =
    employeeId && startDate && endDate && days !== '' && parseFloat(days) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? '휴가 기록 수정' : '휴가 기록 추가'}</DialogTitle>
          <DialogDescription>
            직원·유형·기간·일수·상태를 입력해주세요. 오전/오후반차는 0.5일로 자동 설정돼요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>직원</Label>
            <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="직원 선택" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} · {e.dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>휴가 유형</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as LeaveType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LEAVE_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>상태</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as LeaveStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAVE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>시작일</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>종료일</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>사용일수</Label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={isHalfDay}
              placeholder="사용일수 입력"
            />
            {isHalfDay && (
              <p className="text-xs text-muted-foreground">오전/오후반차는 0.5일로 고정돼요.</p>
            )}
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>메모</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="선택 사항" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button onClick={handleSave} disabled={!valid}>
            {editing ? '수정' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 팀 근무표 탭 ──────────────────────────────────────────────────────
function ScheduleTab({ employees }: { employees: Employee[] }) {
  const { workSchedules, leaveRecords, upsertWorkSchedule, removeWorkSchedule } = useWorkforce()
  const [weekRef, setWeekRef] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [dept, setDept] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogEmp, setDialogEmp] = useState<string>('')
  const [dialogDate, setDialogDate] = useState<string>('')
  const [editingSchedule, setEditingSchedule] = useState<
    | { id: string; employeeId: number; date: string; pattern: WorkPattern; startTime?: string; endTime?: string; note?: string }
    | null
  >(null)

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.dept).filter(Boolean))).sort(),
    [employees],
  )

  const filteredEmps = useMemo(
    () => employees.filter((e) => (dept === 'all' ? true : e.dept === dept)),
    [employees, dept],
  )

  const weekDates = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(weekRef, i))
  }, [weekRef])

  const weekStartISO = toISO(weekDates[0])
  const weekEndISO = toISO(weekDates[4])

  // 승인된 휴가 맵: employeeId -> Set<dateISO>
  const approvedLeaveMap = useMemo(() => {
    const map = new Map<number, Set<string>>()
    leaveRecords
      .filter((r) => r.status === 'Approved')
      .forEach((r) => {
        let set = map.get(r.employeeId)
        if (!set) {
          set = new Set()
          map.set(r.employeeId, set)
        }
        const start = parseISO(r.startDate)
        const end = parseISO(r.endDate)
        if (!start || !end) return
        let cur = new Date(start)
        while (cur.getTime() <= end.getTime()) {
          set.add(toISO(cur))
          cur = addDays(cur, 1)
        }
      })
    return map
  }, [leaveRecords])

  // 스케줄 맵: employeeId|date -> schedule
  const scheduleMap = useMemo(() => {
    const map = new Map<string, (typeof workSchedules)[number]>()
    workSchedules.forEach((s) => {
      map.set(`${s.employeeId}|${s.date}`, s)
    })
    return map
  }, [workSchedules])

  function openCellDialog(empId: number, date: string) {
    const existing = scheduleMap.get(`${empId}|${date}`)
    setDialogEmp(String(empId))
    setDialogDate(date)
    setEditingSchedule(existing ?? null)
    setDialogOpen(true)
  }

  function openAddDialog() {
    setDialogEmp('')
    setDialogDate(toISO(new Date()))
    setEditingSchedule(null)
    setDialogOpen(true)
  }

  function handleSaveSchedule(row: {
    employeeId: number
    date: string
    pattern: WorkPattern
    startTime?: string
    endTime?: string
    note?: string
  }) {
    if (row.pattern === 'Regular') {
      const existing = scheduleMap.get(`${row.employeeId}|${row.date}`)
      if (existing) removeWorkSchedule(existing.id)
    } else {
      upsertWorkSchedule(row)
    }
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 주차 컨트롤 */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setWeekRef(addDays(weekRef, -7))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekRef(getMondayOfWeek(new Date()))}>
              <CalendarRange className="size-4" /> 이번 주
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setWeekRef(addDays(weekRef, 7))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {weekStartISO} ~ {weekEndISO}
          </span>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">부서</Label>
            <Select value={dept} onValueChange={(v) => setDept((v as string) ?? 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="전체 부서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="ml-auto" onClick={openAddDialog}>
            <Plus className="size-4" /> 유연근무 등록
          </Button>
        </CardContent>
      </Card>

      {/* 주간 그리드 */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background min-w-[120px]">직원</TableHead>
                {weekDates.map((d, i) => (
                  <TableHead key={i} className="text-center min-w-[110px]">
                    {WEEKDAYS[i]}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {toISO(d).slice(5)}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmps.map((e) => {
                const leaveDates = approvedLeaveMap.get(e.id)
                return (
                  <TableRow key={e.id}>
                    <TableCell className="sticky left-0 z-10 bg-background font-medium">
                      {e.name}
                      <span className="block text-xs font-normal text-muted-foreground">{e.dept}</span>
                    </TableCell>
                    {weekDates.map((d) => {
                      const iso = toISO(d)
                      const onLeave = leaveDates?.has(iso)
                      const schedule = scheduleMap.get(`${e.id}|${iso}`)
                      let label = '기본근무'
                      let badgeClass = PATTERN_BADGE.Regular
                      if (onLeave) {
                        label = '휴가'
                        badgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                      } else if (schedule) {
                        label = WORK_PATTERN_LABEL[schedule.pattern]
                        badgeClass = PATTERN_BADGE[schedule.pattern]
                      }
                      return (
                        <TableCell key={iso} className="text-center">
                          <button
                            className="w-full"
                            onClick={() => openCellDialog(e.id, iso)}
                            aria-label={`${e.name} ${iso} 근무 형태 변경`}
                          >
                            <Badge variant="secondary" className={badgeClass}>
                              {label}
                            </Badge>
                          </button>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={filteredEmps}
        initialEmployeeId={dialogEmp}
        initialDate={dialogDate}
        editing={editingSchedule}
        onSave={handleSaveSchedule}
      />
    </div>
  )
}

// ── 근무 스케줄 다이얼로그 ──────────────────────────────────────────────
function ScheduleDialog({
  open,
  onOpenChange,
  employees,
  initialEmployeeId,
  initialDate,
  editing,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employees: Employee[]
  initialEmployeeId: string
  initialDate: string
  editing: {
    id: string
    employeeId: number
    date: string
    pattern: WorkPattern
    startTime?: string
    endTime?: string
    note?: string
  } | null
  onSave: (row: {
    employeeId: number
    date: string
    pattern: WorkPattern
    startTime?: string
    endTime?: string
    note?: string
  }) => void
}) {
  const [employeeId, setEmployeeId] = useState<string>('')
  const [date, setDate] = useState('')
  const [pattern, setPattern] = useState<WorkPattern>('Regular')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (editing) {
      setEmployeeId(String(editing.employeeId))
      setDate(editing.date)
      setPattern(editing.pattern)
      setStartTime(editing.startTime ?? '')
      setEndTime(editing.endTime ?? '')
      setNote(editing.note ?? '')
    } else if (open) {
      setEmployeeId(initialEmployeeId)
      setDate(initialDate)
      setPattern('Regular')
      setStartTime('')
      setEndTime('')
      setNote('')
    }
  }, [editing, open, initialEmployeeId, initialDate])

  const showTimes = pattern === 'Staggered Hours' || pattern === 'Reduced Hours'

  function handleSave() {
    const eid = parseInt(employeeId)
    if (isNaN(eid) || !date) return
    onSave({
      employeeId: eid,
      date,
      pattern,
      startTime: showTimes && startTime ? startTime : undefined,
      endTime: showTimes && endTime ? endTime : undefined,
      note: note.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>유연근무 스케줄 {editing ? '수정' : '등록'}</DialogTitle>
          <DialogDescription>
            직원과 날짜를 선택하고 근무 형태를 지정해요. 기본근무를 선택하면 해당 날짜의 커스텀 스케줄이
            삭제돼요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>직원</Label>
            <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="직원 선택" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} · {e.dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>날짜</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>근무 형태</Label>
            <Select value={pattern} onValueChange={(v) => v && setPattern(v as WorkPattern)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_PATTERNS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {WORK_PATTERN_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showTimes && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>시작시간</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>종료시간</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </>
          )}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>메모</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="선택 사항" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button onClick={handleSave} disabled={!employeeId || !date}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
