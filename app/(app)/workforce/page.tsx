'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, Plus, Trash2, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useData } from '@/lib/store'
import { useWorkforce } from '@/lib/workforce-store'
import {
  LEAVE_TYPES,
  LEAVE_STATUSES,
  WORK_PATTERNS,
  type LeaveType,
  type LeaveStatus,
  type WorkPattern,
} from '@/lib/workforce-types'

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

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return Math.max(0, diff)
}

export default function WorkforcePage() {
  const { employees } = useData()
  const {
    leaveRecords,
    workSchedules,
    addLeaveRecord,
    updateLeaveRecord,
    removeLeaveRecord,
    addWorkSchedule,
    removeWorkSchedule,
    clearWorkforce,
  } = useWorkforce()

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarClock className="size-6" />
        </div>
        <div>
          <p className="text-base font-semibold">등록된 직원이 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">먼저 조직·기초데이터를 업로드해주세요.</p>
        </div>
        <Button render={<Link href="/data" />}>기초데이터 업로드하러 가기</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-start gap-2 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            이 화면은 휴가·유연근무 현황을 단순 기록용으로 관리해요. 법정 연차 산정 규칙, 장기 휴직, 출퇴근
            체크인/아웃, 결재 흐름은 지원하지 않으며 급여 계산에는 연결되지 않아요. 데이터는 브라우저에만
            저장돼요.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">휴가 기록</TabsTrigger>
          <TabsTrigger value="schedule">유연근무 스케줄</TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          <LeaveTab
            employees={employees}
            records={leaveRecords}
            addLeaveRecord={addLeaveRecord}
            updateLeaveRecord={updateLeaveRecord}
            removeLeaveRecord={removeLeaveRecord}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab
            employees={employees}
            schedules={workSchedules}
            addWorkSchedule={addWorkSchedule}
            removeWorkSchedule={removeWorkSchedule}
            clearWorkforce={clearWorkforce}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type LeaveTabProps = {
  employees: { id: number; name: string; dept: string }[]
  records: ReturnType<typeof useWorkforce>['leaveRecords']
  addLeaveRecord: ReturnType<typeof useWorkforce>['addLeaveRecord']
  updateLeaveRecord: ReturnType<typeof useWorkforce>['updateLeaveRecord']
  removeLeaveRecord: ReturnType<typeof useWorkforce>['removeLeaveRecord']
}

function LeaveTab({ employees, records, addLeaveRecord, updateLeaveRecord, removeLeaveRecord }: LeaveTabProps) {
  const [employeeId, setEmployeeId] = useState<string>(String(employees[0]?.id ?? ''))
  const [type, setType] = useState<LeaveType>('Annual Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<LeaveStatus>('Pending')
  const [note, setNote] = useState('')

  const computedDays = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate])

  function handleAdd() {
    const eid = parseInt(employeeId)
    if (isNaN(eid) || !startDate || !endDate) return
    addLeaveRecord({
      employeeId: eid,
      type,
      startDate,
      endDate,
      days: computedDays,
      status,
      note: note.trim() || undefined,
    })
    setStartDate('')
    setEndDate('')
    setNote('')
  }

  const empName = (id: number) => employees.find((e) => e.id === id)?.name ?? `#${id}`

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">휴가 기록 추가</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>대상 직원</Label>
              <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
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
            <div className="flex flex-col gap-2">
              <Label>휴가 종류</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as LeaveType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>상태</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as LeaveStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>시작일</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>종료일</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>일수 (자동계산)</Label>
              <Input value={computedDays} readOnly className="bg-muted/40 font-mono tabular-nums" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <Label>비고</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="선택 사항" />
            </div>
          </div>
          <Button size="sm" className="w-fit" onClick={handleAdd} disabled={!startDate || !endDate}>
            <Plus className="size-4" /> 기록 추가
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">휴가 기록 ({records.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직원</TableHead>
                  <TableHead>종류</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">일수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      휴가 기록이 없어요. 위 양식으로 추가해주세요.
                    </TableCell>
                  </TableRow>
                )}
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{empName(r.employeeId)}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.startDate} ~ {r.endDate}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{r.days}</TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        onValueChange={(v) => v && updateLeaveRecord(r.id, { status: v as LeaveStatus })}
                      >
                        <SelectTrigger className="h-7 w-[110px]" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAVE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={r.note}>
                      {r.note || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeLeaveRecord(r.id)}
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
    </div>
  )
}

type ScheduleTabProps = {
  employees: { id: number; name: string; dept: string }[]
  schedules: ReturnType<typeof useWorkforce>['workSchedules']
  addWorkSchedule: ReturnType<typeof useWorkforce>['addWorkSchedule']
  removeWorkSchedule: ReturnType<typeof useWorkforce>['removeWorkSchedule']
  clearWorkforce: ReturnType<typeof useWorkforce>['clearWorkforce']
}

function ScheduleTab({
  employees,
  schedules,
  addWorkSchedule,
  removeWorkSchedule,
  clearWorkforce,
}: ScheduleTabProps) {
  const [employeeId, setEmployeeId] = useState<string>(String(employees[0]?.id ?? ''))
  const [date, setDate] = useState('')
  const [pattern, setPattern] = useState<WorkPattern>('Regular')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')

  function handleAdd() {
    const eid = parseInt(employeeId)
    if (isNaN(eid) || !date) return
    addWorkSchedule({
      employeeId: eid,
      date,
      pattern,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      note: note.trim() || undefined,
    })
    setDate('')
    setStartTime('')
    setEndTime('')
    setNote('')
  }

  const empName = (id: number) => employees.find((e) => e.id === id)?.name ?? `#${id}`

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">유연근무 스케줄 추가</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>대상 직원</Label>
              <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
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
            <div className="flex flex-col gap-2">
              <Label>날짜</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>근무 형태</Label>
              <Select value={pattern} onValueChange={(v) => v && setPattern(v as WorkPattern)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_PATTERNS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>시작 시간 (선택)</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>종료 시간 (선택)</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>비고</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="선택 사항" />
            </div>
          </div>
          <Button size="sm" className="w-fit" onClick={handleAdd} disabled={!date}>
            <Plus className="size-4" /> 스케줄 추가
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">근무 스케줄 ({schedules.length}건)</CardTitle>
          {schedules.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={clearWorkforce}
            >
              <Trash2 className="size-4" /> 전체 초기화
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직원</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead>근무 형태</TableHead>
                  <TableHead>시간</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      스케줄이 없어요. 위 양식으로 추가해주세요.
                    </TableCell>
                  </TableRow>
                )}
                {schedules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{empName(r.employeeId)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={PATTERN_BADGE[r.pattern]}>
                        {r.pattern}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.startTime && r.endTime ? `${r.startTime} ~ ${r.endTime}` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={r.note}>
                      {r.note || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeWorkSchedule(r.id)}
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
    </div>
  )
}
