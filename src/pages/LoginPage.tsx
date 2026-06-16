import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, Loader2, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { LogoMark } from '../components/LogoMark'
import { defaultHeroUrl } from '../lib/assets'

export function LoginPage() {
  const { signIn, user, profile } = useAuth()
  const { settings } = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (user && profile?.is_admin) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
      toast.success('Login realizado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#060604] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen lg:block">
        <img className="absolute inset-0 h-full w-full object-cover" src={settings.default_banner_url ?? defaultHeroUrl} alt="" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/76 via-[#050505]/28 to-transparent" />
        <div className="absolute inset-x-10 bottom-10 max-w-xl text-white">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffc400]">{settings.church_name}</p>
          <h1 className="mt-4 text-5xl font-black tracking-normal">{settings.platform_name}</h1>
          <p className="mt-4 text-lg font-medium text-white/84">{settings.welcome_text}</p>
        </div>
      </section>

      <section className="grid place-items-center px-5 py-10">
        <div className="w-full max-w-md">
          <LogoMark />
          <div className="glass mt-8 rounded-lg p-6">
            <div className="mb-6">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
                <LockKeyhole size={22} />
              </div>
              <h2 className="text-2xl font-black">Painel administrativo</h2>
          <p className="mt-2 text-sm font-medium text-[#bfb490]">Acesse com uma conta marcada como administradora no Supabase.</p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-5 flex gap-3 rounded-lg border border-[#ffc400]/30 bg-[#ffc400]/10 p-3 text-sm font-semibold text-[#ffe9a3]">
                <AlertTriangle className="shrink-0" size={18} />
                Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para conectar o app.
              </div>
            )}

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="label">
                E-mail
                <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label className="label">
                Senha
                <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <button className="btn btn-primary mt-2" disabled={busy} type="submit">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
                Entrar
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
