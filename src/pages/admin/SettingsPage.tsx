import { useState, type FormEvent } from 'react'
import { ImagePlus, Loader2, Save, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/PageHeader'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import type { AppSettings } from '../../lib/types'
import { defaultHeroUrl } from '../../lib/assets'

export function SettingsPage() {
  const { settings, reloadSettings } = useSettings()
  const [form, setForm] = useState<AppSettings>(settings)
  const [uploading, setUploading] = useState<string | null>(null)
  const [lastUpload, setLastUpload] = useState<string | null>(null)

  function update(key: keyof AppSettings, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function upload(file: File, field: 'logo_url' | 'default_banner_url') {
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem precisa ter ate 5 MB.')
      return
    }
    setUploading(field)
    setLastUpload(null)
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
    const path = `${field === 'logo_url' ? 'logos' : 'banners'}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) {
      toast.error(`Upload nao realizado: ${error.message}`)
    }
    else {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      update(field, data.publicUrl)
      setLastUpload(field)
      toast.success(`${field === 'logo_url' ? 'Logo' : 'Imagem padrao'} enviada. Clique em Salvar configuracoes.`)
    }
    setUploading(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const payload = {
      id: form.id,
      platform_name: form.platform_name,
      church_name: form.church_name,
      welcome_text: form.welcome_text,
      footer_text: form.footer_text,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      logo_url: form.logo_url || null,
      default_banner_url: form.default_banner_url || null,
    }
    const { error } = await supabase.from('app_settings').upsert(payload)
    if (error) toast.error(error.message)
    else {
      await reloadSettings()
      toast.success('Configuracoes salvas.')
    }
  }

  return (
    <div>
      <PageHeader title="Configuracoes" eyebrow="Customizacao" />
      <form className="grid gap-5 xl:grid-cols-[1fr_380px]" onSubmit={submit}>
        <section className="card grid gap-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="label">
              Nome da plataforma
              <input className="field" value={form.platform_name} onChange={(event) => update('platform_name', event.target.value)} required />
            </label>
            <label className="label">
              Nome da igreja
              <input className="field" value={form.church_name} onChange={(event) => update('church_name', event.target.value)} required />
            </label>
            <label className="label md:col-span-2">
              Texto de boas-vindas
              <textarea className="field min-h-24" value={form.welcome_text} onChange={(event) => update('welcome_text', event.target.value)} />
            </label>
            <label className="label md:col-span-2">
              Rodape
              <input className="field" value={form.footer_text} onChange={(event) => update('footer_text', event.target.value)} />
            </label>
            <label className="label">
              Cor principal
              <input className="field h-12 p-1" type="color" value={form.primary_color} onChange={(event) => update('primary_color', event.target.value)} />
            </label>
            <label className="label">
              Cor de destaque
              <input className="field h-12 p-1" type="color" value={form.accent_color} onChange={(event) => update('accent_color', event.target.value)} />
            </label>
            <label className="label">
              URL do logo
              <input className="field" value={form.logo_url ?? ''} onChange={(event) => update('logo_url', event.target.value)} />
            </label>
            <label className="label">
              URL da imagem padrao
              <input className="field" value={form.default_banner_url ?? ''} onChange={(event) => update('default_banner_url', event.target.value)} />
            </label>
            <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
              <UploadTile
                title="Logo da plataforma"
                description="Clique para escolher PNG, JPG ou WEBP ate 5 MB."
                currentUrl={form.logo_url}
                busy={uploading === 'logo_url'}
                changed={lastUpload === 'logo_url'}
                onPick={(file) => upload(file, 'logo_url')}
              />
              <UploadTile
                title="Imagem padrao"
                description="Use uma capa horizontal. Recomendado: 1600x900."
                currentUrl={form.default_banner_url}
                busy={uploading === 'default_banner_url'}
                changed={lastUpload === 'default_banner_url'}
                onPick={(file) => upload(file, 'default_banner_url')}
              />
            </div>
          </div>
          <button className="btn btn-primary w-fit" type="submit">
            <Save size={18} /> Salvar configuracoes
          </button>
        </section>

        <aside className="card overflow-hidden">
          <div className="h-52 bg-[#050505]">
            <img className="h-full w-full object-cover" src={form.default_banner_url || defaultHeroUrl} alt="" />
          </div>
          <div className="p-5">
            {form.logo_url && <img className="mb-4 h-14 w-14 rounded-lg object-cover" src={form.logo_url} alt="" />}
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: form.primary_color }}>
              {form.church_name}
            </p>
            <h2 className="mt-2 text-3xl font-black">{form.platform_name}</h2>
            <p className="mt-2 text-sm font-medium text-[#bfb490]">{form.welcome_text}</p>
          </div>
        </aside>
      </form>
    </div>
  )
}

function UploadTile({
  title,
  description,
  currentUrl,
  busy,
  changed,
  onPick,
}: {
  title: string
  description: string
  currentUrl: string | null
  busy: boolean
  changed: boolean
  onPick: (file: File) => void
}) {
  return (
    <label className="group relative grid cursor-pointer gap-3 rounded-lg border border-dashed border-[#ffc400]/28 bg-[#ffc400]/8 p-4 transition hover:border-[#ffc400]/70 hover:bg-[#ffc400]/12">
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPick(file)
          event.currentTarget.value = ''
        }}
      />
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
          {busy ? <Loader2 className="animate-spin" size={22} /> : <UploadCloud size={22} />}
        </span>
        <div className="min-w-0">
          <p className="font-black text-[#fff8df]">{title}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#bfb490]">{busy ? 'Enviando para o Supabase Storage...' : description}</p>
          {changed && <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#ffc400]">Enviado. Salve para aplicar.</p>}
        </div>
      </div>
      <div className="relative h-24 overflow-hidden rounded-lg border border-[#ffc400]/12 bg-black/40">
        {currentUrl ? (
          <img className="h-full w-full object-cover transition group-hover:scale-[1.02]" src={currentUrl} alt="" />
        ) : (
          <div className="grid h-full place-items-center text-[#8f8260]">
            <ImagePlus size={24} />
          </div>
        )}
      </div>
    </label>
  )
}
