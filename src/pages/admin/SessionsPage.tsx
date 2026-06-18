import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Archive, Copy, Eye, Pencil, Plus, QrCode, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { supabase } from '../../lib/supabase'
import type { ClassSession, ClassStatus, Course } from '../../lib/types'
import { formatDate, publicCheckinUrl, publicQrUrl } from '../../lib/utils'

const blankSession = {
  course_id: '',
  name: '',
  description: '',
  session_date: '',
  starts_at: '',
  location: '',
  status: 'scheduled' as ClassStatus,
}

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [editing, setEditing] = useState<ClassSession | null>(null)
  const [creating, setCreating] = useState(false)
  const selectedCourseId = searchParams.get('course')

  async function load() {
    const [sessionResult, courseResult] = await Promise.all([
      supabase.from('class_sessions').select('*, courses(id,name,color,banner_url,location)').order('session_date', { ascending: false }),
      supabase.from('courses').select('*').neq('status', 'archived').order('name'),
    ])
    setSessions(sessionResult.data ?? [])
    setCourses(courseResult.data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)
  const visibleSessions = selectedCourseId ? sessions.filter((session) => session.course_id === selectedCourseId) : sessions

  async function remove(session: ClassSession) {
    if (!confirm(`Excluir "${session.name}"?`)) return
    const { error } = await supabase.from('class_sessions').delete().eq('id', session.id)
    if (error) toast.error(error.message)
    else {
      toast.success('Aula excluida.')
      load()
    }
  }

  async function archive(session: ClassSession) {
    const { error } = await supabase.from('class_sessions').update({ status: 'archived' }).eq('id', session.id)
    if (error) toast.error(error.message)
    else {
      toast.success('Aula arquivada.')
      load()
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado.')
  }

  return (
    <div>
      <PageHeader title="Aulas e encontros" eyebrow="QR Code">
        <button className="btn btn-primary" onClick={() => setCreating(true)} type="button">
          <Plus size={18} /> Nova aula
        </button>
      </PageHeader>

      {selectedCourse && (
        <section className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffc400]">Aulas filtradas por curso</p>
            <h2 className="mt-1 line-clamp-2 text-xl font-black text-[#fff8df]">{selectedCourse.name}</h2>
          </div>
          <button className="btn btn-soft" onClick={() => setSearchParams({})} type="button">
            Ver todas
          </button>
        </section>
      )}

      {visibleSessions.length === 0 ? (
        <EmptyState title="Nenhuma aula criada" text="Crie aulas dentro de um curso para gerar QR Codes e receber check-ins." />
      ) : (
        <div className="grid gap-4">
          {visibleSessions.map((session) => (
            <article key={session.id} className="card grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="chip">{session.courses?.name ?? 'Curso removido'}</span>
                  <span className="chip">{session.status}</span>
                </div>
                <h2 className="line-clamp-2 text-xl font-black sm:text-2xl lg:truncate">{session.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[#bfb490]">
                  {formatDate(session.session_date)} {session.starts_at ? `as ${formatTime24(session.starts_at)}` : ''} {session.location ? `- ${session.location}` : ''}
                </p>
                {session.description && <p className="mt-2 line-clamp-2 text-sm font-medium text-[#bfb490]">{session.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                <Link className="btn btn-primary" to={`/qr/${session.qr_token}`} target="_blank">
                  <QrCode size={16} /> QR
                </Link>
                <Link className="btn btn-soft" to={`/checkin/${session.qr_token}`} target="_blank">
                  <Eye size={16} /> Check-in
                </Link>
                <button className="btn btn-soft" onClick={() => copyUrl(publicCheckinUrl(session.qr_token))} type="button">
                  <Copy size={16} /> Link
                </button>
                <button className="btn btn-soft" onClick={() => setEditing(session)} type="button" aria-label="Editar aula">
                  <Pencil size={16} />
                  <span className="sm:hidden">Editar</span>
                </button>
                <button className="btn btn-soft" onClick={() => archive(session)} type="button" aria-label="Arquivar aula">
                  <Archive size={16} />
                  <span className="sm:hidden">Arquivar</span>
                </button>
                <button className="btn btn-danger col-span-2 sm:col-span-1" onClick={() => remove(session)} type="button" aria-label="Excluir aula">
                  <Trash2 size={16} />
                  <span className="sm:hidden">Excluir</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SessionModal
          session={editing}
          courses={courses}
          defaultCourseId={selectedCourse?.id ?? null}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function SessionModal({
  session,
  courses,
  defaultCourseId,
  onClose,
  onSaved,
}: {
  session: ClassSession | null
  courses: Course[]
  defaultCourseId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const initial = useMemo(
    () => ({ ...blankSession, course_id: defaultCourseId ?? courses[0]?.id ?? '', ...(session ?? {}) }),
    [courses, defaultCourseId, session],
  )
  const [form, setForm] = useState(initial)

  useEffect(() => {
    setForm(initial)
  }, [initial])

  function update(key: keyof typeof blankSession, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const rawStartsAt = form.starts_at ?? ''
    const startsAt = normalizeTime24(rawStartsAt)
    if (rawStartsAt && !startsAt) {
      toast.error('Informe o horario no formato 24h, por exemplo 20:00.')
      return
    }
    const payload = {
      course_id: form.course_id,
      name: form.name,
      description: form.description || null,
      session_date: form.session_date || null,
      starts_at: startsAt,
      location: form.location || null,
      status: form.status,
      qr_token: session?.qr_token ?? crypto.randomUUID(),
    }
    const result = session
      ? await supabase.from('class_sessions').update(payload).eq('id', session.id)
      : await supabase.from('class_sessions').insert(payload)
    if (result.error) toast.error(result.error.message)
    else {
      toast.success(session ? 'Aula atualizada.' : 'Aula criada.')
      onSaved()
    }
  }

  return (
    <Modal title={session ? 'Editar aula' : 'Nova aula'} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="label">
          Curso/evento
          <select className="field" value={form.course_id} onChange={(event) => update('course_id', event.target.value)} required>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="label md:col-span-2">
            Nome da aula
            <input className="field" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label className="label md:col-span-2">
            Descricao
            <textarea className="field min-h-24" value={form.description ?? ''} onChange={(event) => update('description', event.target.value)} />
          </label>
          <label className="label">
            Data
            <input className="field" type="date" value={form.session_date ?? ''} onChange={(event) => update('session_date', event.target.value)} />
          </label>
          <label className="label">
            Horario
            <input
              className="field"
              inputMode="numeric"
              maxLength={5}
              pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
              placeholder="20:00"
              value={formatTimeInput(form.starts_at ?? '')}
              onBlur={(event) => update('starts_at', normalizeTime24(event.target.value) ?? event.target.value)}
              onChange={(event) => update('starts_at', maskTime24(event.target.value))}
            />
          </label>
          <label className="label">
            Local
            <input className="field" value={form.location ?? ''} onChange={(event) => update('location', event.target.value)} />
          </label>
          <label className="label">
            Status
            <select className="field" value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option value="scheduled">Agendada</option>
              <option value="open">Aberta</option>
              <option value="closed">Fechada</option>
              <option value="archived">Arquivada</option>
            </select>
          </label>
        </div>
        {session?.qr_token && <p className="text-xs font-bold text-[#bfb490]">QR publico: {publicQrUrl(session.qr_token)}</p>}
        <div className="grid gap-2 sm:flex sm:justify-end">
          <button className="btn btn-soft" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}

function formatTime24(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 5)
}

function formatTimeInput(value: string) {
  return formatTime24(value)
}

function maskTime24(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function normalizeTime24(value: string) {
  const trimmed = value.trim()
  const match = /^(\d{1,2}):?(\d{2})(?::\d{2})?$/.exec(trimmed)
  if (!match) return trimmed ? null : null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
