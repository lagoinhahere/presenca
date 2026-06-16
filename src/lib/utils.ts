import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Checkin } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function formatDate(value?: string | null) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Agora'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function publicCheckinUrl(token: string) {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/checkin/${token}`
}

export function publicQrUrl(token: string) {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/qr/${token}`
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? { vazio: '' })
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadXlsx(filename: string, rows: Record<string, unknown>[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const headers = Object.keys(rows[0] ?? { vazio: '' })
  const data = [
    headers.map((header) => ({ value: header, fontWeight: 'bold' as const })),
    ...rows.map((row) => headers.map((header) => ({ value: String(row[header] ?? '') }))),
  ]
  await writeXlsxFile(data).toFile(filename)
}

export function checkinRows(checkins: Checkin[]) {
  return checkins.map((item) => ({
    aluno: item.students?.full_name ?? '',
    email: item.students?.email ?? '',
    telefone: item.students?.phone ?? '',
    curso: item.class_sessions?.courses?.name ?? '',
    aula: item.class_sessions?.name ?? '',
    data_aula: item.class_sessions?.session_date ?? '',
    checkin_em: formatDateTime(item.checked_in_at),
    observacao: item.note ?? '',
  }))
}
