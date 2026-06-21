import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Loader2, Mail, UserCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { ClassSession, Student } from '../../lib/types'
import { formatDate, normalizeName } from '../../lib/utils'
import { useSettings } from '../../contexts/SettingsContext'
import { defaultHeroUrl } from '../../lib/assets'

type CheckinForm = {
  full_name: string
  email: string
  note: string
  send_receipt: boolean
}

export function CheckinPage() {
  const { token } = useParams()
  const { settings } = useSettings()
  const [session, setSession] = useState<ClassSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receiptSent, setReceiptSent] = useState(false)
  const [form, setForm] = useState<CheckinForm>({ full_name: '', email: '', note: '', send_receipt: false })

  useEffect(() => {
    if (!token) return
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    supabase
      .from('class_sessions')
      .select('*, courses(id,name,color,banner_url,location)')
      .eq('qr_token', token)
      .maybeSingle()
      .then(({ data }) => {
        setSession(data)
        setLoading(false)
      })
  }, [token])

  function update<K extends keyof CheckinForm>(key: K, value: CheckinForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function notifyTvMode(fullName: string, checkinId: string) {
    if (!token || !isSupabaseConfigured) return
    const channel = supabase.channel(`public-checkins-${token}`)
    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return
      await channel.send({
        type: 'broadcast',
        event: 'checkin-created',
        payload: { token, checkin_id: checkinId, full_name: fullName, at: new Date().toISOString() },
      })
      void supabase.removeChannel(channel)
    })
  }

  async function findOrCreateStudent(): Promise<Student> {
    const normalized = normalizeName(form.full_name)
    const email = form.email.trim().toLowerCase() || null
    const query = email ? `email.eq.${email}` : `normalized_name.eq.${normalized}`
    const existing = await supabase.from('students').select('*').or(query).limit(1).maybeSingle()
    if (existing.data) return existing.data

    const inserted = await supabase
      .from('students')
      .insert({ full_name: form.full_name.trim(), normalized_name: normalized, email, phone: null })
      .select('*')
      .single()
    if (inserted.error) throw inserted.error
    return inserted.data
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    setBusy(true)
    try {
      const student = await findOrCreateStudent()
      const { data: checkin, error } = await supabase
        .from('checkins')
        .insert({
          class_id: session.id,
          student_id: student.id,
          note: form.note.trim() || null,
          receipt_requested: form.send_receipt,
        })
        .select('id')
        .single()
      if (error?.code === '23505') {
        toast.info('Sua presenca ja estava registrada para esta aula.')
        setDone(true)
      } else if (error) {
        throw error
      } else {
        setDone(true)
        void notifyTvMode(student.full_name, checkin.id)
        if (form.send_receipt) {
          const { error: receiptError } = await supabase.functions.invoke('send-checkin-receipt', {
            body: { checkinId: checkin.id },
          })
          if (receiptError) {
            toast.warning('Presenca confirmada, mas o comprovante nao pode ser enviado agora.')
          } else {
            setReceiptSent(true)
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel registrar a presenca.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#060604]">
        <Loader2 className="animate-spin text-[#ffc400]" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#060604]">
      <section className="relative overflow-hidden bg-[#050505] px-5 py-12 text-white">
        <img className="absolute inset-0 h-full w-full object-cover opacity-32" src={session?.banner_url || session?.courses?.banner_url || settings.default_banner_url || defaultHeroUrl} alt="" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#050505]/84 to-[#ffc400]/36" />
        <div className="relative mx-auto max-w-xl">
          <div className="mb-5 h-1 w-16 rounded-full bg-[#ffc400]" />
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffc400]">{settings.platform_name}</p>
          <h1 className="mt-4 text-4xl font-black tracking-normal">{session?.name ?? 'Check-in indisponivel'}</h1>
          <p className="mt-3 text-base font-semibold text-white/82">{session?.courses?.name}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip border-white/25 bg-white/12 text-white">{formatDate(session?.session_date)}</span>
            {session?.starts_at && <span className="chip border-white/25 bg-white/12 text-white">{session.starts_at.slice(0, 5)}</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-4 max-w-xl px-5 py-6">
        {done ? (
          <div className="card p-6 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="text-2xl font-black">Presenca confirmada</h2>
            <p className="mt-2 font-medium text-[#bfb490]">Obrigado! Seu check-in foi registrado com sucesso.</p>
            {receiptSent && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--brand-accent-rgb)/0.2)] bg-[rgb(var(--brand-accent-rgb)/0.08)] px-4 py-3 text-sm font-bold text-[#fff8df]">
                <Mail size={17} className="text-[var(--brand-accent)]" />
                Comprovante enviado para {form.email}
              </div>
            )}
          </div>
        ) : (
          <form className="card grid gap-4 p-5 shadow-2xl shadow-black/40" onSubmit={submit}>
            <div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
                <UserCheck size={24} />
              </div>
              <h2 className="text-2xl font-black">Confirme sua presenca</h2>
              <p className="mt-1 text-sm font-medium text-[#bfb490]">{settings.welcome_text}</p>
            </div>
            <label className="label">
              Nome completo
              <input className="field" value={form.full_name} onChange={(event) => update('full_name', event.target.value)} required />
            </label>
            <label className="label">
              E-mail opcional
              <input className="field" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required={form.send_receipt} />
            </label>
            <label className={`flex items-start gap-3 rounded-lg border p-4 transition ${form.email ? 'cursor-pointer border-[rgb(var(--brand-accent-rgb)/0.2)] bg-[rgb(var(--brand-accent-rgb)/0.07)]' : 'cursor-not-allowed border-white/8 bg-white/[0.025] opacity-55'}`}>
              <input
                className="mt-1 h-4 w-4 accent-[var(--brand-accent)]"
                type="checkbox"
                checked={form.send_receipt}
                disabled={!form.email}
                onChange={(event) => update('send_receipt', event.target.checked)}
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-black text-[#fff8df]"><Mail size={16} className="text-[var(--brand-accent)]" /> Receber comprovante por e-mail</span>
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#9f9479]">Enviaremos os dados desta aula e a confirmacao da sua participacao.</span>
              </span>
            </label>
            <label className="label">
              Observacao
              <textarea className="field min-h-20" value={form.note} onChange={(event) => update('note', event.target.value)} />
            </label>
            <button className="btn btn-primary mt-1" disabled={busy || !session} type="submit">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <UserCheck size={18} />}
              Confirmar presenca
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-xs font-bold text-[#7b6f61]">{settings.footer_text}</p>
      </section>
    </main>
  )
}
