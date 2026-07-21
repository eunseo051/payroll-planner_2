'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Employee } from './calc'
import {
  LeaveBalance,
  LeaveRecord,
  WorkSchedule,
  LeaveType,
  LeaveStatus,
  WorkPattern,
} from './workforce-types'

const STORAGE_KEY = 'payroll-planner:workforce'

type WorkforceState = {
  leaveBalances: LeaveBalance[]
  leaveRecords: LeaveRecord[]
  workSchedules: WorkSchedule[]
}

type WorkforceContextType = {
  leaveBalances: LeaveBalance[]
  leaveRecords: LeaveRecord[]
  workSchedules: WorkSchedule[]
  upsertLeaveBalance: (row: Omit<LeaveBalance, 'id'>) => void
  addLeaveRecord: (row: Omit<LeaveRecord, 'id'>) => void
  updateLeaveRecord: (id: string, patch: Partial<LeaveRecord>) => void
  removeLeaveRecord: (id: string) => void
  upsertWorkSchedule: (row: Omit<WorkSchedule, 'id'>) => void
  removeWorkSchedule: (id: string) => void
  resetWorkforce: () => void
  generateDemoData: (employees: Employee[]) => void
}

const WorkforceContext = createContext<WorkforceContextType | null>(null)

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const EMPTY: WorkforceState = {
  leaveBalances: [],
  leaveRecords: [],
  workSchedules: [],
}

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : []
}

export function WorkforceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkforceState>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WorkforceState>
        setState({
          leaveBalances: safeArray<LeaveBalance>(parsed.leaveBalances),
          leaveRecords: safeArray<LeaveRecord>(parsed.leaveRecords),
          workSchedules: safeArray<WorkSchedule>(parsed.workSchedules),
        })
      }
    } catch (e) {
      console.warn('휴가·근무 데이터를 불러오지 못했습니다', e)
      setState(EMPTY)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('휴가·근무 데이터 저장 실패', e)
    }
  }, [state, hydrated])

  const upsertLeaveBalance = useCallback((row: Omit<LeaveBalance, 'id'>) => {
    setState((s) => {
      const idx = s.leaveBalances.findIndex(
        (b) => b.employeeId === row.employeeId && b.year === row.year,
      )
      if (idx >= 0) {
        const next = [...s.leaveBalances]
        next[idx] = { ...next[idx], ...row }
        return { ...s, leaveBalances: next }
      }
      return { ...s, leaveBalances: [...s.leaveBalances, { ...row }] }
    })
  }, [])

  const addLeaveRecord = useCallback((row: Omit<LeaveRecord, 'id'>) => {
    setState((s) => ({ ...s, leaveRecords: [...s.leaveRecords, { ...row, id: genId() }] }))
  }, [])

  const updateLeaveRecord = useCallback((id: string, patch: Partial<LeaveRecord>) => {
    setState((s) => ({
      ...s,
      leaveRecords: s.leaveRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }, [])

  const removeLeaveRecord = useCallback((id: string) => {
    setState((s) => ({ ...s, leaveRecords: s.leaveRecords.filter((r) => r.id !== id) }))
  }, [])

  const upsertWorkSchedule = useCallback((row: Omit<WorkSchedule, 'id'>) => {
    setState((s) => {
      const idx = s.workSchedules.findIndex(
        (w) => w.employeeId === row.employeeId && w.date === row.date,
      )
      if (idx >= 0) {
        const next = [...s.workSchedules]
        next[idx] = { ...next[idx], ...row }
        return { ...s, workSchedules: next }
      }
      return { ...s, workSchedules: [...s.workSchedules, { ...row, id: genId() }] }
    })
  }, [])

  const removeWorkSchedule = useCallback((id: string) => {
    setState((s) => ({ ...s, workSchedules: s.workSchedules.filter((r) => r.id !== id) }))
  }, [])

  const resetWorkforce = useCallback(() => {
    setState(EMPTY)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const generateDemoData = useCallback((employees: Employee[]) => {
    if (employees.length === 0) return
    const year = new Date().getFullYear()

    const balances: LeaveBalance[] = employees.slice(0, 6).map((e) => ({
      employeeId: e.id,
      year,
      grantedDays: 15,
    }))

    const leaveTypes: LeaveType[] = ['Annual Leave', 'AM Half-day', 'Sick Leave', 'Official Leave']
    const statuses: LeaveStatus[] = ['Approved', 'Pending', 'Rejected']
    const records: LeaveRecord[] = []
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
    const pad = (n: number) => String(n).padStart(2, '0')
    employees.slice(0, 6).forEach((e, i) => {
      const count = 1 + (i % 2)
      for (let k = 0; k < count; k++) {
        const type = pick(leaveTypes)
        const month = 1 + Math.floor(Math.random() * 10)
        const day = 1 + Math.floor(Math.random() * 20)
        const start = `${year}-${pad(month)}-${pad(day)}`
        const end = type.includes('Half-day') ? start : `${year}-${pad(month)}-${pad(day + 1)}`
        records.push({
          id: genId(),
          employeeId: e.id,
          type,
          startDate: start,
          endDate: end,
          days: type.includes('Half-day') ? 0.5 : 2,
          status: pick(statuses),
          note: '시연용 가상 데이터',
        })
      }
    })

    const patterns: WorkPattern[] = ['Remote', 'Staggered Hours', 'Business Trip', 'Reduced Hours']
    const schedules: WorkSchedule[] = []
    employees.slice(0, 6).forEach((e) => {
      const d = new Date()
      const monday = d.getDate() - ((d.getDay() + 6) % 7)
      const dayOffset = Math.floor(Math.random() * 5)
      const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(monday + dayOffset)}`
      const pattern = pick(patterns)
      schedules.push({
        id: genId(),
        employeeId: e.id,
        date,
        pattern,
        startTime: pattern === 'Regular' ? undefined : '09:00',
        endTime: pattern === 'Regular' ? undefined : '18:00',
        note: '시연용 가상 데이터',
      })
    })

    setState((s) => ({
      leaveBalances: [...s.leaveBalances, ...balances],
      leaveRecords: [...s.leaveRecords, ...records],
      workSchedules: [...s.workSchedules, ...schedules],
    }))
  }, [])

  const { leaveBalances, leaveRecords, workSchedules } = state

  return (
    <WorkforceContext.Provider
      value={{
        leaveBalances,
        leaveRecords,
        workSchedules,
        upsertLeaveBalance,
        addLeaveRecord,
        updateLeaveRecord,
        removeLeaveRecord,
        upsertWorkSchedule,
        removeWorkSchedule,
        resetWorkforce,
        generateDemoData,
      }}
    >
      {children}
    </WorkforceContext.Provider>
  )
}

export function useWorkforce() {
  const ctx = useContext(WorkforceContext)
  if (!ctx) throw new Error('useWorkforce는 WorkforceProvider 안에서만 사용할 수 있어요')
  return ctx
}
