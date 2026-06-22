import { useEffect, useState } from 'react'
import { CalendarCheck, Clock3, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { supabase } from '../../lib/supabase'
import type { ClassSession, Course } from '../../lib/types'
import { formatDate } from '../../lib/utils'
import { useSettings } from '../../contexts/SettingsContext'
import { defaultHeroUrl } from '../../lib/assets'

export function DashboardPage() {
  const { settings } = useSettings()
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<ClassSession[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('*').neq('status', 'archived').order('event_date', { ascending: true }),
      supabase.from('class_sessions').select('*, courses(id,name,color,banner_url,location)').neq('status', 'archived').order('session_date', { ascending: true }),
    ]).then(([courseResult, sessionResult]) => {
      setCourses(courseResult.data ?? [])
      setSessions(sessionResult.data ?? [])
    })
  }, [])

  const activeCourses = courses.filter((course) => course.status === 'active').length
  const openSessions = sessions.filter((session) => session.status === 'open' || session.status === 'scheduled').length

  return (
    <div>
      <PageHeader title="Visao geral" eyebrow="Lagoinha Here!" />

      <section className="relative mb-6 overflow-hidden rounded-lg border border-[#ffc400]/16 bg-[#050505] p-5 text-white shadow-2xl shadow-black/40 md:p-8">
        <img className="absolute inset-0 h-full w-full object-cover opacity-34" src={settings.default_banner_url ?? defaultHeroUrl} alt="" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/78 to-[#050505]/22" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc400]/60 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffc400] sm:text-sm sm:tracking-[0.22em]">{settings.church_name}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{settings.platform_name}</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-white/82 sm:text-base">{settings.welcome_text}</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[250px]">
            <HeroStat value={activeCourses} label="ativos" />
            <HeroStat value={sessions.length} label="aulas" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric icon={CalendarCheck} label="Cursos ativos" value={activeCourses} detail="programacao em andamento" to="/courses" />
        <Metric icon={Clock3} label="Aulas criadas" value={sessions.length} detail="encontros cadastrados" />
        <Metric icon={MapPin} label="Aulas abertas" value={openSessions} detail="prontas para presenca" />
      </section>

      <section className="mt-6">
        <div className="card p-5">
          <SectionTitle title="Cursos e eventos em destaque" />
          <div className="grid gap-3">
            {courses.length === 0 && <SoftEmpty text="Nenhum curso ativo encontrado." />}
            {courses.slice(0, 5).map((course) => (
              <Link
                key={course.id}
                className="flex items-center gap-4 rounded-lg border border-[#ffc400]/12 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-[#ffc400]/30 hover:bg-[#ffc400]/8"
                to={`/sessions?course=${course.id}`}
                aria-label={`Abrir aulas de ${course.name}`}
              >
                <div className="h-12 w-2 rounded-full" style={{ background: course.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{course.name}</p>
                  <p className="truncate text-sm font-medium text-[#bfb490]">
                    {formatDate(course.event_date)} {course.location ? `- ${course.location}` : ''}
                  </p>
                </div>
                <span className="chip">{course.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-black/32 p-3 text-center backdrop-blur sm:p-4">
      <p className="gold-text text-2xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-white/62">{label}</p>
    </div>
  )
}

function Metric({ icon: Icon, label, value, detail, to }: { icon: typeof CalendarCheck; label: string; value: number; detail: string; to?: string }) {
  const content = (
    <div className="card p-5 transition hover:-translate-y-0.5 hover:border-[#ffc400]/28">
      <div className="mb-5 flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
          <Icon size={22} />
        </div>
        <Sparkles size={16} className="text-[#ffc400]/50" />
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-bold text-[#bfb490]">{label}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.13em] text-[#8f8260]">{detail}</p>
    </div>
  )

  if (to) {
    return (
      <Link className="block" to={to} aria-label={`Abrir ${label}`}>
        {content}
      </Link>
    )
  }

  return content
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-lg font-black">{title}</h3>
      <span className="h-px flex-1 bg-gradient-to-r from-[#ffc400]/24 to-transparent" />
    </div>
  )
}

function SoftEmpty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#ffc400]/18 bg-white/4 p-4 text-sm font-semibold text-[#bfb490]">{text}</div>
}
