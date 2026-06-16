import { useEffect, useState } from 'react'
import { CalendarCheck, Clock3, MapPin, UsersRound } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { supabase } from '../../lib/supabase'
import type { Checkin, ClassSession, Course } from '../../lib/types'
import { formatDate, formatDateTime } from '../../lib/utils'
import { useSettings } from '../../contexts/SettingsContext'

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

      <section className="relative mb-6 overflow-hidden rounded-lg bg-[#050505] p-6 text-white md:p-8">
        <img className="absolute inset-0 h-full w-full object-cover opacity-34" src={settings.default_banner_url ?? '/default-hero.png'} alt="" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/72 to-[#050505]/18" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffc400]">{settings.church_name}</p>
          <h2 className="mt-3 text-3xl font-black md:text-4xl">{settings.platform_name}</h2>
          <p className="mt-3 text-base font-medium text-white/82">{settings.welcome_text}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarCheck} label="Cursos ativos" value={activeCourses} />
        <Metric icon={Clock3} label="Aulas criadas" value={sessions.length} />
        <Metric icon={UsersRound} label="Check-ins totais" value={checkins.length} />
        <Metric icon={MapPin} label="Aulas abertas" value={openSessions} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <h3 className="mb-4 text-lg font-black">Cursos e eventos em destaque</h3>
          <div className="grid gap-3">
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
          <h3 className="mb-4 text-lg font-black">Presencas recentes</h3>
          <div className="grid gap-3">
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

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarCheck; label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
        <Icon size={22} />
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-bold text-[#bfb490]">{label}</p>
    </div>
  )
}
