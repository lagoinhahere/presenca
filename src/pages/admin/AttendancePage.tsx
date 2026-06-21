import { useEffect, useMemo, useState } from 'react'
import { Award, BookOpen, Download, FileSpreadsheet, Search, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/PageHeader'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import type { Checkin, ClassSession, Course, Student } from '../../lib/types'
import { normalizeName } from '../../lib/utils'
import { assetUrl, resolveAssetUrl } from '../../lib/assets'
import { certificateFileName, createCertificatePdf, imageUrlToDataUrl } from '../../lib/certificate'

const CERTIFICATE_THRESHOLD = 75

type AttendanceStudent = {
  student: Student
  attendedSessionIds: Set<string>
  attendanceCount: number
  percentage: number
}

export function AttendancePage() {
  const { settings } = useSettings()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .neq('status', 'archived')
      .order('event_date', { ascending: false })
      .then(({ data }) => {
        setCourses(data ?? [])
        setSelectedCourseId((current) => current || data?.[0]?.id || '')
      })
  }, [])

  useEffect(() => {
    if (!selectedCourseId) {
      setSessions([])
      setCheckins([])
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      supabase
        .from('class_sessions')
        .select('*, courses(id,name,color,banner_url,location)')
        .eq('course_id', selectedCourseId)
        .order('session_date', { ascending: true }),
      supabase
        .from('checkins')
        .select('*, students(*), class_sessions!inner(id,course_id,name,session_date,starts_at,status)')
        .eq('class_sessions.course_id', selectedCourseId),
    ]).then(([sessionResult, checkinResult]) => {
      setSessions(sessionResult.data ?? [])
      setCheckins(checkinResult.data ?? [])
      setLoading(false)
    })
  }, [selectedCourseId])

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)

  const students = useMemo(() => {
    const byStudent = new Map<string, AttendanceStudent>()
    const validSessionIds = new Set(sessions.map((session) => session.id))

    checkins.forEach((checkin) => {
      if (!checkin.students) return
      if (!validSessionIds.has(checkin.class_id)) return
      const current = byStudent.get(checkin.student_id) ?? {
        student: checkin.students,
        attendedSessionIds: new Set<string>(),
        attendanceCount: 0,
        percentage: 0,
      }
      current.attendedSessionIds.add(checkin.class_id)
      byStudent.set(checkin.student_id, current)
    })

    const totalSessions = sessions.length
    return [...byStudent.values()]
      .map((item) => {
        const attendanceCount = item.attendedSessionIds.size
        const percentage = totalSessions > 0 ? Math.min(100, Math.round((attendanceCount / totalSessions) * 100)) : 0
        return { ...item, attendanceCount, percentage }
      })
      .sort((a, b) => b.percentage - a.percentage || a.student.full_name.localeCompare(b.student.full_name))
  }, [checkins, sessions])

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return students
    return students.filter((item) =>
      [item.student.full_name, item.student.email, item.student.phone]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [search, students])

  const eligibleCount = students.filter((item) => item.percentage >= CERTIFICATE_THRESHOLD).length
  const averageAttendance = students.length > 0
    ? Math.round(students.reduce((total, item) => total + item.percentage, 0) / students.length)
    : 0

  async function handleCertificate(item: AttendanceStudent) {
    if (!selectedCourse) return
    if (item.percentage < CERTIFICATE_THRESHOLD) {
      toast.error(`Certificado liberado apenas a partir de ${CERTIFICATE_THRESHOLD}% de presenca.`)
      return
    }

    const [watermarkDataUrl, signatureDataUrl] = await Promise.all([
      imageUrlToDataUrl(assetUrl('certificate-watermark.png')).catch(() => null),
      imageUrlToDataUrl(resolveAssetUrl(selectedCourse.signature_url)).catch(() => null),
    ])
    const doc = await createCertificatePdf({
      churchName: settings.church_name,
      footerText: settings.footer_text,
      studentName: item.student.full_name,
      courseName: selectedCourse.name,
      instructorName: selectedCourse.owner_name,
      attendanceCount: item.attendanceCount,
      totalSessions: sessions.length,
      percentage: item.percentage,
      watermarkDataUrl,
      signatureDataUrl,
    })
    doc.save(certificateFileName(item.student.full_name))
  }

  async function handleExportXlsx() {
    if (!selectedCourse) return
    if (sessions.length === 0 || filteredStudents.length === 0) {
      toast.error('Nao ha dados de frequencia para exportar.')
      return
    }

    await exportAttendanceXlsx({
      courseName: selectedCourse.name,
      sessions,
      students: filteredStudents,
    })
  }

  return (
    <div>
      <PageHeader title="Frequencia dos alunos" eyebrow="Diario de classe">
        <button className="btn btn-primary" disabled={sessions.length === 0 || filteredStudents.length === 0} onClick={() => void handleExportXlsx()} type="button">
          <FileSpreadsheet size={18} /> XLSX
        </button>
      </PageHeader>

      <section className="card mb-5 grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="label">
          Curso/evento
          <select className="field" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
            {courses.length === 0 && <option value="">Nenhum curso encontrado</option>}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="relative min-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b6f61]" size={18} />
          <input
            className="field pl-10"
            placeholder="Buscar aluno"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </section>

      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <SummaryCard icon={BookOpen} label="Aulas do curso" value={sessions.length} />
        <SummaryCard icon={UsersRound} label="Alunos com presenca" value={students.length} />
        <SummaryCard icon={Award} label="Certificados liberados" value={eligibleCount} detail={`${averageAttendance}% media`} />
      </section>

      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm font-semibold text-[#bfb490]">Carregando frequencia...</div>
        ) : sessions.length === 0 ? (
          <div className="p-5 text-sm font-semibold text-[#bfb490]">Crie aulas para este curso antes de acompanhar frequencia.</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-5 text-sm font-semibold text-[#bfb490]">Nenhum aluno encontrado para este curso.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#050505] text-white">
                  <tr>
                    <Th>Aluno</Th>
                    {sessions.map((session, index) => (
                      <Th key={session.id}>{index + 1}</Th>
                    ))}
                    <Th>Presencas</Th>
                    <Th>Frequencia</Th>
                    <Th>Certificado</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((item) => (
                    <tr key={item.student.id} className="border-b border-[rgb(var(--brand-primary-rgb)/0.1)] bg-white/5">
                      <Td strong>
                        {item.student.full_name}
                        <span className="mt-1 block text-xs font-semibold text-[#8f8260]">{item.student.email || item.student.phone || 'Sem contato'}</span>
                      </Td>
                      {sessions.map((session) => (
                        <Td key={session.id}>
                          <span className={item.attendedSessionIds.has(session.id) ? 'text-[var(--brand-accent)]' : 'text-[#6e6655]'}>
                            {item.attendedSessionIds.has(session.id) ? 'Presente' : '-'}
                          </span>
                        </Td>
                      ))}
                      <Td>{item.attendanceCount}/{sessions.length}</Td>
                      <Td>
                        <Progress value={item.percentage} />
                      </Td>
                      <Td>
                        <button
                          className="btn btn-soft"
                          disabled={item.percentage < CERTIFICATE_THRESHOLD}
                          onClick={() => void handleCertificate(item)}
                          type="button"
                        >
                          <Download size={16} /> PDF
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {filteredStudents.map((item) => (
                <article key={item.student.id} className="rounded-lg border border-[rgb(var(--brand-primary-rgb)/0.12)] bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 text-lg font-black">{item.student.full_name}</h2>
                      <p className="mt-1 text-xs font-semibold text-[#8f8260]">{item.student.email || item.student.phone || 'Sem contato'}</p>
                    </div>
                    <span className="chip shrink-0">{item.attendanceCount}/{sessions.length}</span>
                  </div>
                  <div className="mt-4">
                    <Progress value={item.percentage} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {sessions.map((session, index) => (
                      <span key={session.id} className="chip justify-center">
                        Aula {index + 1}: {item.attendedSessionIds.has(session.id) ? 'Sim' : 'Nao'}
                      </span>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary mt-4 w-full"
                    disabled={item.percentage < CERTIFICATE_THRESHOLD}
                    onClick={() => void handleCertificate(item)}
                    type="button"
                  >
                    <Download size={16} /> Gerar certificado
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: typeof BookOpen; label: string; value: number; detail?: string }) {
  return (
    <div className="card p-5">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[rgb(var(--brand-accent-rgb)/0.16)] text-[var(--brand-accent)]">
        <Icon size={22} />
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-bold text-[#bfb490]">{label}</p>
      {detail && <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#8f8260]">{detail}</p>}
    </div>
  )
}

function Progress({ value }: { value: number }) {
  const eligible = value >= CERTIFICATE_THRESHOLD
  return (
    <div className="min-w-36">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-black">
        <span className={eligible ? 'text-[var(--brand-accent)]' : 'text-[#d9cfaa]'}>{value}%</span>
        <span className="text-[#8f8260]">{eligible ? 'Liberado' : `Min. ${CERTIFICATE_THRESHOLD}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em]">{children}</th>
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`px-4 py-3 align-top ${strong ? 'font-black text-[#fff8df]' : 'font-semibold text-[#d9cfaa]'}`}>{children}</td>
}

async function exportAttendanceXlsx({
  courseName,
  sessions,
  students,
}: {
  courseName: string
  sessions: ClassSession[]
  students: AttendanceStudent[]
}) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const sessionHeaders = sessions.map((session, index) => ({
    id: session.id,
    label: `Aula ${index + 1}${session.name ? ` - ${session.name}` : ''}`,
  }))

  const header = [
    { value: 'Aluno', fontWeight: 'bold' as const },
    { value: 'E-mail', fontWeight: 'bold' as const },
    { value: 'Telefone', fontWeight: 'bold' as const },
    ...sessionHeaders.map((session) => ({ value: session.label, fontWeight: 'bold' as const })),
    { value: 'Presencas', fontWeight: 'bold' as const },
    { value: 'Total de aulas', fontWeight: 'bold' as const },
    { value: 'Frequencia', fontWeight: 'bold' as const },
    { value: 'Certificado', fontWeight: 'bold' as const },
  ]

  const rows = students.map((item) => [
    { value: item.student.full_name },
    { value: item.student.email ?? '' },
    { value: item.student.phone ?? '' },
    ...sessionHeaders.map((session) => ({ value: item.attendedSessionIds.has(session.id) ? 'Presente' : 'Ausente' })),
    { value: item.attendanceCount },
    { value: sessions.length },
    { value: `${item.percentage}%` },
    { value: item.percentage >= CERTIFICATE_THRESHOLD ? 'Liberado' : 'Pendente' },
  ])

  await writeXlsxFile([header, ...rows], { sheet: 'Frequencia' }).toFile(`frequencia-${normalizeName(courseName).replace(/\s+/g, '-')}.xlsx`)
}
