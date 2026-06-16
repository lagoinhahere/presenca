import { useState, type FormEvent } from 'react'
import { ImagePlus, Save } from 'lucide-react'
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

  function update(key: keyof AppSettings, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function upload(file: File, field: 'logo_url' | 'default_banner_url') {
    setUploading(field)
    const path = `${field === 'logo_url' ? 'logos' : 'banners'}/${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('media').upload(path, file)
    if (error) toast.error(error.message)
    else {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      update(field, data.publicUrl)
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
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <span className="btn btn-soft">
                <ImagePlus size={16} /> {uploading === 'logo_url' ? 'Enviando logo...' : 'Upload logo'}
                <input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], 'logo_url')} />
              </span>
              <span className="btn btn-soft">
                <ImagePlus size={16} /> {uploading === 'default_banner_url' ? 'Enviando imagem...' : 'Upload imagem'}
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], 'default_banner_url')}
                />
              </span>
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
