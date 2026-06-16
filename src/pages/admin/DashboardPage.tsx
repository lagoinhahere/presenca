import { useEffect, useState } from 'react'
import { CalendarCheck, Clock3, MapPin, Sparkles, UsersRound } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { supabase } from '../../lib/supabase'
import type { Checkin, ClassSession, Course } from '../../lib/types'
import { formatDate, formatDateTime } from '../../lib/utils'
import { useSettings } from '../../contexts/SettingsContext'
import { defaultHeroUrl } from '../../lib/assets'

export function DashboardPage() {
  const { settings } = useSettings()
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('*').neq('status', 'archived').order('event_date', { ascending: true }),
      supabase.from('class_sessions').select('*, courses(id,name,color,banner_url,location)').neq('status', 'archived').order('session_date', { ascending: true }),
      supabase
        .from('checkins')
        .select('*, students(*), class_sessions(*, courses(*))')
        .order('checked_in_at', { ascending: false })
        .limit(8),
    ]).then(([courseResult, sessionResult, checkinResult]) => {
      setCourses(courseResult.data ?? [])
      setSessions(sessionResult.data ?? [])
      setCheckins(checkinResult.data ?? [])
    })
  }, [])

  const activeCourses = courses.filter((course) => course.status === 'active').length
  const openSessions = sessions.filter((session) => session.status === 'open' || session.status === 'scheduled').length

  return (
    <div>
      <PageHeader title="Visao geral" eyebrow="Lagoinha Here!" />

      <section className="relative mb-6 overflow-hidden rounded-lg border border-[#ffc400]/16 bg-[#050505] p-6 text-white shadow-2xl shadow-black/40 md:p-8">
        <img className="absolute inset-0 h-full w-full object-cover opacity-34" src={settings.default_banner_url ?? defaultHeroUrl} alt="" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/78 to-[#050505]/22" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc400]/60 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffc400]">{settings.church_name}</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">{settings.platform_name}</h2>
          <p className="mt-3 text-base font-medium text-white/82">{settings.welcome_text}</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-[360px]">
            <HeroStat value={activeCourses} label="ativos" />
            <HeroStat value={sessions.length} label="aulas" />
            <HeroStat value={checkins.length} label="presencas" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarCheck} label="Cursos ativos" value={activeCourses} detail="programacao em andamento" />
        <Metric icon={Clock3} label="Aulas criadas" value={sessions.length} detail="encontros cadastrados" />
        <Metric icon={UsersRound} label="Check-ins totais" value={checkins.length} detail="ultimos registros carregados" />
        <Metric icon={MapPin} label="Aulas abertas" value={openSessions} detail="prontas para presenca" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <SectionTitle title="Cursos e eventos em destaque" />
          <div className="grid gap-3">
            {courses.length === 0 && <SoftEmpty text="Nenhum curso ativo encontrado." />}
            {courses.slice(0, 5).map((course) => (
              <div key={course.id} className="flex items-center gap-4 rounded-lg border border-[#ffc400]/12 bg-white/5 p-3">
                <div className="h-12 w-2 rounded-full" style={{ background: course.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{course.name}</p>
                  <p className="truncate text-sm font-medium text-[#bfb490]">
                    {formatDate(course.event_date)} {course.location ? `- ${course.location}` : ''}
                  </p>
                </div>
                <span className="chip">{course.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle title="Presencas recentes" />
          <div className="grid gap-3">
            {checkins.length === 0 && <SoftEmpty text="As presencas recentes aparecerao aqui." />}
            {checkins.map((checkin) => (
              <div key={checkin.id} className="rounded-lg border border-[#ffc400]/12 bg-white/5 p-3">
                <p className="font-black">{checkin.students?.full_name}</p>
                <p className="text-sm font-medium text-[#bfb490]">{checkin.class_sessions?.name}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8b7b6a]">{formatDateTime(checkin.checked_in_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-black/32 p-4 text-center backdrop-blur">
      <p className="gold-text text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-white/62">{label}</p>
    </div>
  )
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof CalendarCheck; label: string; value: number; detail: string }) {
  return (
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
