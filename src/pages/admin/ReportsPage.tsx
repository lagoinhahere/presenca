import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Download, FileSpreadsheet, Search } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { supabase } from '../../lib/supabase'
import type { Checkin } from '../../lib/types'
import { checkinRows, downloadCsv, downloadXlsx, formatDateTime } from '../../lib/utils'

export function ReportsPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    let query = supabase
      .from('checkins')
      .select('*, students(*), class_sessions(*, courses(*))')
      .order('checked_in_at', { ascending: false })
      .limit(1000)

    if (from) query = query.gte('checked_in_at', `${from}T00:00:00`)
    if (to) query = query.lte('checked_in_at', `${to}T23:59:59`)

    const { data } = await query
    setCheckins(data ?? [])
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return checkins
    return checkins.filter((item) =>
      [item.students?.full_name, item.students?.email, item.students?.phone, item.class_sessions?.name, item.class_sessions?.courses?.name]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [checkins, search])

  const rows = checkinRows(filtered)

  return (
    <div>
      <PageHeader title="Historico e relatorios" eyebrow="Presencas">
        <button className="btn btn-soft" onClick={() => downloadCsv('presencas-lagoinha-here.csv', rows)} type="button">
          <Download size={18} /> CSV
        </button>
        <button className="btn btn-primary" onClick={() => void downloadXlsx('presencas-lagoinha-here.xlsx', rows)} type="button">
          <FileSpreadsheet size={18} /> XLSX
        </button>
      </PageHeader>

      <section className="card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b6f61]" size={18} />
          <input
            className="field pl-10"
            placeholder="Buscar por aluno, curso, aula, e-mail ou telefone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <input className="field" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input className="field" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </section>

      <section className="grid gap-3 md:hidden">
        {filtered.map((item) => (
          <article key={item.id} className="card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-lg font-black text-[#fff8df]">{item.students?.full_name}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#ffc400]">{formatDateTime(item.checked_in_at)}</p>
              </div>
              <span className="chip shrink-0">check-in</span>
            </div>
            <div className="grid gap-2 text-sm font-semibold text-[#d9cfaa]">
              <MobileRow label="Curso" value={item.class_sessions?.courses?.name} />
              <MobileRow label="Aula" value={item.class_sessions?.name} />
              <MobileRow label="Contato" value={[item.students?.email, item.students?.phone].filter(Boolean).join(' | ')} />
              {item.note && <MobileRow label="Obs." value={item.note} />}
            </div>
          </article>
        ))}
        {filtered.length === 0 && <div className="card p-4 text-sm font-semibold text-[#bfb490]">Nenhuma presenca encontrada com os filtros atuais.</div>}
      </section>

      <section className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#050505] text-white">
              <tr>
                <Th>Aluno</Th>
                <Th>Contato</Th>
                <Th>Curso</Th>
                <Th>Aula</Th>
                <Th>Check-in</Th>
                <Th>Obs.</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-[#ffc400]/10 bg-white/5">
                  <Td strong>{item.students?.full_name}</Td>
                  <Td>
                    {item.students?.email}
                    <br />
                    <span className="text-[#bfb490]">{item.students?.phone}</span>
                  </Td>
                  <Td>{item.class_sessions?.courses?.name}</Td>
                  <Td>{item.class_sessions?.name}</Td>
                  <Td>{formatDateTime(item.checked_in_at)}</Td>
                  <Td>{item.note}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function MobileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="grid gap-0.5">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#8f8260]">{label}</span>
      <span className="break-words">{value || '-'}</span>
    </p>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em]">{children}</th>
}

function Td({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <td className={`px-4 py-3 align-top ${strong ? 'font-black text-[#fff8df]' : 'font-semibold text-[#d9cfaa]'}`}>{children}</td>
}
