import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ExternalLink } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { ClassSession } from '../../lib/types'
import { publicCheckinUrl, formatDate } from '../../lib/utils'
import { useSettings } from '../../contexts/SettingsContext'

export function QrDisplayPage() {
  const { token } = useParams()
  const { settings } = useSettings()
  const [session, setSession] = useState<ClassSession | null>(null)

  useEffect(() => {
    if (!token) return
    if (!isSupabaseConfigured) return
    supabase
      .from('class_sessions')
      .select('*, courses(id,name,color,banner_url,location)')
      .eq('qr_token', token)
      .maybeSingle()
      .then(({ data }) => setSession(data))
  }, [token])

  const url = token ? publicCheckinUrl(token) : ''

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050505] p-5 text-white">
      <img
        className="absolute inset-0 h-full w-full object-cover opacity-36"
        src={session?.courses?.banner_url || settings.default_banner_url || '/default-hero.png'}
        alt=""
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#050505]/84 to-[#ffc400]/34" />
      <section className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffc400]">{settings.platform_name}</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-normal md:text-7xl">{session?.name ?? 'Check-in'}</h1>
          <p className="mt-5 text-2xl font-bold text-white/82">{session?.courses?.name}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="chip border-white/25 bg-white/12 text-white">{formatDate(session?.session_date)}</span>
            {session?.starts_at && <span className="chip border-white/25 bg-white/12 text-white">{session.starts_at}</span>}
            {session?.location && <span className="chip border-white/25 bg-white/12 text-white">{session.location}</span>}
          </div>
        </div>
        <div className="rounded-lg bg-[#fff8df] p-5 text-[#050505] shadow-2xl shadow-black/40">
          <QRCodeSVG value={url} size={320} includeMargin level="H" />
          <Link className="btn btn-primary mt-4 w-full" to={`/checkin/${token}`}>
            <ExternalLink size={18} /> Abrir check-in
          </Link>
        </div>
      </section>
    </main>
  )
}
