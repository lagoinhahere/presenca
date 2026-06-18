import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { CalendarDays, Clock3, ExternalLink, MapPin, UsersRound, Wifi } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { ClassSession } from '../../lib/types'
import { publicCheckinUrl, formatDate } from '../../lib/utils'
import { useSettings } from '../../contexts/SettingsContext'
import { brandLogoUrl, defaultHeroUrl } from '../../lib/assets'

export function QrDisplayPage() {
  const { token } = useParams()
  const { settings } = useSettings()
  const [session, setSession] = useState<ClassSession | null>(null)
  const [checkinCount, setCheckinCount] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const loadCheckinCount = useCallback(async () => {
    if (!token || !isSupabaseConfigured) return
    const { data, error } = await supabase.rpc('get_class_checkin_count', { target_qr_token: token })
    if (!error && typeof data === 'number') {
      setCheckinCount(data)
      setUpdatedAt(new Date())
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    if (!isSupabaseConfigured) return
    supabase
      .from('class_sessions')
      .select('*, courses(id,name,color,banner_url,location)')
      .eq('qr_token', token)
      .maybeSingle()
      .then(({ data }) => {
        setSession(data)
        void loadCheckinCount()
      })
  }, [loadCheckinCount, token])

  useEffect(() => {
    if (!session?.id || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`tv-checkins-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins', filter: `class_id=eq.${session.id}` },
        () => {
          void loadCheckinCount()
        },
      )
      .subscribe()

    const interval = window.setInterval(() => {
      void loadCheckinCount()
    }, 15000)

    return () => {
      window.clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [loadCheckinCount, session?.id])

  useEffect(() => {
    void loadCheckinCount()
  }, [loadCheckinCount])

  const url = token ? publicCheckinUrl(token) : ''
  const hero = session?.courses?.banner_url || settings.default_banner_url || defaultHeroUrl
  const brandLogo = settings.logo_url || brandLogoUrl
  const formattedTime = updatedAt
    ? updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'ao vivo'

  return (
    <main className="relative h-screen overflow-hidden bg-[#050505] p-4 text-white sm:p-5 lg:p-6">
      <img className="absolute inset-0 h-full w-full object-cover opacity-32" src={hero} alt="" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,196,0,0.22),transparent_30rem),linear-gradient(115deg,#050505_0%,rgba(5,5,5,0.94)_42%,rgba(5,5,5,0.66)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc400]/70 to-transparent" />

      <section className="relative mx-auto grid h-full w-full max-w-7xl grid-rows-[auto_1fr_auto] gap-3 sm:gap-4">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <img className="h-10 w-10 rounded-lg border border-[#ffc400]/18 bg-black object-contain p-2 shadow-xl shadow-black/40 sm:h-11 sm:w-11" src={brandLogo} alt="" />
            <div className="min-w-0">
              <p className="truncate text-lg font-black leading-tight sm:text-xl">{settings.platform_name}</p>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#ffc400] sm:text-xs">{settings.church_name}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-[#ffc400]/18 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#fff8df] backdrop-blur sm:flex">
            <Wifi size={16} className="text-[#ffc400]" />
            Presenca ao vivo
          </div>
        </header>

        <div className="grid min-h-0 items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.54fr)] xl:gap-7">
          <div className="max-w-4xl">
            <div className="mb-4 h-1 w-20 rounded-full bg-[#ffc400] sm:mb-5" />
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffc400] sm:text-sm">{session?.courses?.name ?? 'Check-in publico'}</p>
            <h1 className="mt-3 text-[clamp(2.45rem,6.1vw,5.9rem)] font-black leading-[0.95] tracking-normal text-white sm:mt-4">
              {session?.name ?? 'Aponte a camera para confirmar presenca'}
            </h1>
            <div className="mt-5 grid max-w-3xl gap-2 sm:grid-cols-3 lg:mt-6">
              <InfoPill icon={CalendarDays} label="Data" value={formatDate(session?.session_date)} />
              <InfoPill icon={Clock3} label="Horario" value={session?.starts_at ?? 'Livre'} />
              <InfoPill icon={MapPin} label="Local" value={session?.location || session?.courses?.location || 'Lagoinha Americana'} />
            </div>
          </div>

          <aside className="rounded-lg border border-[#ffc400]/22 bg-[#080806]/86 p-3 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:p-4">
            <div className="mx-auto max-w-[min(42vh,390px)] rounded-lg border border-[#ffc400]/18 bg-[#fff8df] p-3 text-[#050505] shadow-[0_0_70px_rgba(255,196,0,0.18)]">
              <QRCodeSVG value={url} size={390} includeMargin level="H" className="h-auto w-full" />
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
              <div className="rounded-lg border border-[#ffc400]/18 bg-white/7 p-3">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#bfb490] sm:text-xs">Confirmados</p>
                <p className="gold-text mt-1 text-5xl font-black leading-none xl:text-6xl">{checkinCount}</p>
              </div>
              <div className="grid min-w-24 place-items-center rounded-lg border border-[#ffc400]/18 bg-[#ffc400]/12 p-3 text-center">
                <UsersRound className="text-[#ffc400]" size={26} />
                <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#d9cfaa]">{formattedTime}</p>
              </div>
            </div>

            <Link className="btn btn-primary mt-3 w-full" to={`/checkin/${token}`}>
              <ExternalLink size={18} /> Abrir check-in
            </Link>
            <p className="mt-3 text-center text-xs font-semibold text-[#bfb490] sm:text-sm">Aponte a camera do celular para o QR Code.</p>
          </aside>
        </div>

        <footer className="flex flex-col gap-1 border-t border-[#ffc400]/12 pt-3 text-xs font-semibold text-[#bfb490] sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <span>{settings.footer_text}</span>
          <span className="text-[#ffc400]">lagoinha here!</span>
        </footer>
      </section>
    </main>
  )
}

function InfoPill({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/8 p-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-[#ffc400]">
        <Icon size={16} />
        <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] sm:text-xs">{label}</span>
      </div>
      <p className="line-clamp-2 text-sm font-black text-white sm:text-base">{value}</p>
    </div>
  )
}
