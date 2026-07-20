'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  LeaveBalance,
  LeaveRecord,
  WorkSchedule,
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
  setLeaveBalances: (rows: LeaveBalance[]) => void
  addLeaveRecord: (row: Omit<LeaveRecord, 'id'>) => void
  updateLeaveRecord: (id: string, patch: Partial<LeaveRecord>) => void
  removeLeaveRecord: (id: string) => void
  addWorkSchedule: (row: Omit<WorkSchedule, 'id'>) => void
  updateWorkSchedule: (id: string, patch: Partial<WorkSchedule>) => void
  removeWorkSchedule: (id: string) => void
  clearWorkforce: () => void
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

export function WorkforceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkforceState>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setState({
          leaveBalances: Array.isArray(parsed.leaveBalances) ? parsed.leaveBalances : [],
          leaveRecords: Array.isArray(parsed.leaveRecords) ? parsed.leaveRecords : [],
          workSchedules: Array.isArray(parsed.workSchedules) ? parsed.workSchedules : [],
        })
      }
    } catch (e) {
      console.warn('휴가·근무 데이터를 불러오지 못했습니다', e)
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

  const setLeaveBalances = useCallback((rows: LeaveBalance[]) => {
    setState((s) => ({ ...s, leaveBalances: rows }))
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

  const addWorkSchedule = useCallback((row: Omit<WorkSchedule, 'id'>) => {
    setState((s) => ({ ...s, workSchedules: [...s.workSchedules, { ...row, id: genId() }] }))
  }, [])

  const updateWorkSchedule = useCallback((id: string, patch: Partial<WorkSchedule>) => {
    setState((s) => ({
      ...s,
      workSchedules: s.workSchedules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }, [])

  const removeWorkSchedule = useCallback((id: string) => {
    setState((s) => ({ ...s, workSchedules: s.workSchedules.filter((r) => r.id !== id) }))
  }, [])

  const clearWorkforce = useCallback(() => {
    setState(EMPTY)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const { leaveBalances, leaveRecords, workSchedules } = state

  return (
    <WorkforceContext.Provider
      value={{
        leaveBalances,
        leaveRecords,
        workSchedules,
        setLeaveBalances,
        addLeaveRecord,
        updateLeaveRecord,
        removeLeaveRecord,
        addWorkSchedule,
        updateWorkSchedule,
        removeWorkSchedule,
        clearWorkforce,
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
