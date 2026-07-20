import * as XLSX from 'xlsx'
import { Employee, ComputedEmployee } from './calc'

// 컬럼명이 조금씩 달라도 유연하게 인식
function pick(row: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k]
  }
  return ''
}

// 날짜 컬럼 전용: cellDates:true 옵션 때문에 Date 객체로 들어올 수도, 문자열로 들어올 수도 있음 -> YYYY-MM-DD로 통일
function pickDate(row: Record<string, any>, keys: string[]): string | undefined {
  const v = pick(row, keys)
  if (!v) return undefined
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return undefined
    return v.toISOString().slice(0, 10)
  }
  return String(v)
}

export function parseEmployeeExcel(json: Record<string, any>[]): Employee[] {
  return json.map((row, i) => ({
    id: i,
    name: String(pick(row, ['이름', '성명', 'name']) || `직원${i + 1}`),
    dept: String(pick(row, ['부서', '부서명', 'dept']) || '미지정'),
    position: String(pick(row, ['직급', '직위', 'position']) || ''),
    baseSalary: Number(pick(row, ['현재연봉', '연봉', '기본연봉', 'baseSalary'])) || 0,
    tenure: Number(pick(row, ['근속연수', '근속', 'tenure'])) || 0,
    grade: String(pick(row, ['인사평가등급', '평가등급', '근무평가등급', 'grade']) || 'B')
      .toUpperCase()
      .trim(),
    step: pick(row, ['호봉', 'step']) ? Number(pick(row, ['호봉', 'step'])) : undefined,
    hireDate: pickDate(row, ['입사일', 'hireDate']),
    departmentAssignedDate: pickDate(row, ['현재부서발령일', '부서발령일', 'departmentAssignedDate']),
  }))
}

export function readExcelFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array', cellDates: true })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
        resolve(json)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function downloadSampleTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_EMPLOYEES)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '기초데이터')
  XLSX.writeFile(wb, '인건비_시뮬레이터_샘플양식.xlsx')
}

export const SAMPLE_EMPLOYEES = [
  { 이름: '김민준', 부서: '경영지원팀', 직급: '5급', 현재연봉: 52000000, 근속연수: 6, 인사평가등급: 'A', 호봉: 6, 입사일: '2020-03-02', 현재부서발령일: '2024-01-01' },
  { 이름: '이서연', 부서: '인사팀', 직급: '6급', 현재연봉: 42000000, 근속연수: 3, 인사평가등급: 'S', 호봉: 3, 입사일: '2023-07-10', 현재부서발령일: '2023-07-10' },
  { 이름: '박도윤', 부서: '재무팀', 직급: '6급', 현재연봉: 36000000, 근속연수: 1, 인사평가등급: 'B', 호봉: 1, 입사일: '2025-02-17', 현재부서발령일: '2025-02-17' },
  { 이름: '최지우', 부서: '경영지원팀', 직급: '5급', 현재연봉: 44000000, 근속연수: 4, 인사평가등급: 'A', 호봉: 4, 입사일: '2022-05-20', 현재부서발령일: '2023-09-01' },
  { 이름: '정하윤', 부서: '재무팀', 직급: '4급', 현재연봉: 68000000, 근속연수: 9, 인사평가등급: 'S', 호봉: 9, 입사일: '2017-04-03', 현재부서발령일: '2020-01-15' },
  { 이름: '강서준', 부서: '인사팀', 직급: '6급', 현재연봉: 34000000, 근속연수: 1, 인사평가등급: 'B', 호봉: 1, 입사일: '2025-01-06', 현재부서발령일: '2025-01-06' },
  { 이름: '윤예은', 부서: '기획팀', 직급: '5급', 현재연봉: 54000000, 근속연수: 7, 인사평가등급: 'B', 호봉: 7, 입사일: '2019-08-12', 현재부서발령일: '2021-03-01' },
  { 이름: '한도현', 부서: '기획팀', 직급: '4급', 현재연봉: 82000000, 근속연수: 12, 인사평가등급: 'A', 호봉: 12, 입사일: '2014-11-01', 현재부서발령일: '2018-06-01' },
]

export function loadSampleData(): Employee[] {
  return parseEmployeeExcel(SAMPLE_EMPLOYEES)
}

export function exportResults(computed: ComputedEmployee[]) {
  const rows = computed.map((r) => ({
    이름: r.name,
    부서: r.dept,
    직급: r.position,
    호봉: r.step ?? '-',
    평가등급: r.grade,
    입사일: r.hireDate ?? '-',
    입사연도: r.hireYear ?? '-',
    총근무기간: r.totalTenureLabel,
    현재부서발령일: r.departmentAssignedDate ?? '-',
    현부서근무기간: r.deptTenureLabel,
    근속연수: r.tenure,
    현재연봉: Math.round(r.baseSalary),
    자연인상분: Math.round(r.naturalRaise),
    성과배분분: Math.round(r.perfShare),
    인상후_연환산연봉: Math.round(r.newSalary),
    이번달예상급여: Math.round(r.monthlyPay),
    개인인건비: Math.round(r.laborCost),
    승진추정: r.isPromo ? 'Y' : 'N',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '시뮬레이션결과')
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `인건비_시뮬레이션_결과_${today}.xlsx`)
}
