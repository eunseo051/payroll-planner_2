'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Employee, Params, DEFAULT_PARAMS } from './calc'

const STORAGE_KEY_DATA = 'payroll-planner:employees'
const STORAGE_KEY_PARAMS = 'payroll-planner:params'

type DataContextType = {
  employees: Employee[]
  setEmployees: (rows: Employee[]) => void
  fileName: string
  setFileName: (name: string) => void
  params: Params
  updateParams: (patch: Partial<Params>) => void
  resetParams: () => void
  clearAll: () => void
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployeesState] = useState<Employee[]>([])
  const [fileName, setFileName] = useState('')
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [hydrated, setHydrated] = useState(false)

  // 최초 로드 시 localStorage에서 복원 (새로고침해도 데이터 안 날아가게)
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_DATA)
      const savedParams = localStorage.getItem(STORAGE_KEY_PARAMS)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        setEmployeesState(parsed.employees || [])
        setFileName(parsed.fileName || '')
      }
      if (savedParams) {
        setParams({ ...DEFAULT_PARAMS, ...JSON.parse(savedParams) })
      }
    } catch (e) {
      console.warn('저장된 데이터를 불러오지 못했습니다', e)
    }
    setHydrated(true)
  }, [])

  // 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({ employees, fileName }))
    } catch (e) {
      console.warn('데이터 저장 실패', e)
    }
  }, [employees, fileName, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(params))
    } catch (e) {
      console.warn('파라미터 저장 실패', e)
    }
  }, [params, hydrated])

  const setEmployees = useCallback((rows: Employee[]) => setEmployeesState(rows), [])

  const updateParams = useCallback((patch: Partial<Params>) => {
    setParams((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetParams = useCallback(() => setParams(DEFAULT_PARAMS), [])

  const clearAll = useCallback(() => {
    setEmployeesState([])
    setFileName('')
    setParams(DEFAULT_PARAMS)
    localStorage.removeItem(STORAGE_KEY_DATA)
    localStorage.removeItem(STORAGE_KEY_PARAMS)
  }, [])

  return (
    <DataContext.Provider
      value={{ employees, setEmployees, fileName, setFileName, params, updateParams, resetParams, clearAll }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData는 DataProvider 안에서만 사용할 수 있어요')
  return ctx
}
