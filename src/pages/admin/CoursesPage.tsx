import { useEffect, useState, type FormEvent } from 'react'
import { Archive, CalendarDays, ImagePlus, LinkIcon, Loader2, Pencil, Plus, Sparkles, Trash2, UploadCloud, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { configuredSupabaseAnonKey, configuredSupabaseUrl, supabase } from '../../lib/supabase'
import type { Course, CourseStatus } from '../../lib/types'
import { formatDate } from '../../lib/utils'
import { useSettings } from '../../contexts/SettingsContext'
import { brandCoverUrl, defaultHeroUrl } from '../../lib/assets'

const blankCourse = {
  name: '',
  description: '',
  owner_name: '',
  event_date: '',
  status: 'active' as CourseStatus,
  location: '',
  banner_url: '',
  color: '#ffc400',
  notes: '',
}

export function CoursesPage() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [editing, setEditing] = useState<Course | null>(null)
  const [creating, setCreating] = useState(false)

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    setCourses(data ?? [])
  }

  useEffect(() => {
    loadCourses()
  }, [])

  async function removeCourse(course: Course) {
    if (!confirm(`Excluir "${course.name}"?`)) return
    const { error } = await supabase.from('courses').delete().eq('id', course.id)
    if (error) toast.error(error.message)
    else {
      toast.success('Curso excluido.')
      loadCourses()
    }
  }

  async function archiveCourse(course: Course) {
    const { error } = await supabase.from('courses').update({ status: 'archived' }).eq('id', course.id)
    if (error) toast.error(error.message)
    else {
      toast.success('Curso arquivado.')
      loadCourses()
    }
  }

  return (
    <div>
      <PageHeader title="Cursos e eventos" eyebrow="Programacao">
        <button className="btn btn-primary" onClick={() => setCreating(true)} type="button">
          <Plus size={18} /> Novo
        </button>
      </PageHeader>

      {courses.length === 0 ? (
        <EmptyState title="Nenhum curso cadastrado" text="Crie o primeiro curso, palestra ou evento para liberar aulas e check-ins." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {courses.map((course) => (
            <article key={course.id} className="card overflow-hidden transition hover:-translate-y-0.5 hover:border-[#ffc400]/28">
              <button
                className="group relative block h-48 w-full cursor-pointer overflow-hidden text-left"
                onClick={() => navigate(`/sessions?course=${course.id}`)}
                type="button"
                aria-label={`Abrir aulas de ${course.name}`}
              >
                <img className="h-full w-full object-cover" src={course.banner_url || settings.default_banner_url || defaultHeroUrl} alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/92 via-[#050505]/18 to-transparent transition group-hover:from-[#050505]/82" />
                <span className="chip absolute left-4 top-4">{course.status}</span>
                <span className="absolute right-4 top-4 h-3 w-3 rounded-full border border-white/40" style={{ background: course.color }} />
                <span className="absolute right-4 bottom-4 hidden items-center gap-2 rounded-lg border border-[#ffc400]/24 bg-black/58 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#ffc400] backdrop-blur sm:flex">
                  <CalendarDays size={15} /> Ver aulas
                </span>
                <div className="absolute bottom-4 left-4 right-4 text-white sm:right-36">
                  <h2 className="line-clamp-2 text-2xl font-black">{course.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-white/82">{course.owner_name || 'Responsavel nao informado'}</p>
                </div>
              </button>
              <div className="p-4">
                <p className="line-clamp-2 min-h-10 text-sm font-medium text-[#bfb490]">{course.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="chip" style={{ borderColor: course.color }}>
                    {formatDate(course.event_date)}
                  </span>
                  {course.location && <span className="chip">{course.location}</span>}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#ffc400]/10 pt-4 sm:flex sm:flex-wrap">
                  <button className="btn btn-soft" onClick={() => setEditing(course)} type="button">
                    <Pencil size={16} /> Editar
                  </button>
                  <button className="btn btn-soft" onClick={() => archiveCourse(course)} type="button">
                    <Archive size={16} /> Arquivar
                  </button>
                  <button className="btn btn-danger col-span-2 sm:col-span-1" onClick={() => removeCourse(course)} type="button">
                    <Trash2 size={16} /> Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CourseModal
          course={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            loadCourses()
          }}
        />
      )}
    </div>
  )
}

function CourseModal({ course, onClose, onSaved }: { course: Course | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...blankCourse, ...(course ?? {}) })
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [aiForm, setAiForm] = useState({
    description: '',
    areaText: 'lado esquerdo',
    focusVisual: 'lado direito ou centro-direita',
  })

  function update(key: keyof typeof blankCourse, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha uma imagem valida.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Use uma imagem de ate 5 MB.')
      return
    }
    setUploading(true)
    setSelectedFile(file.name)
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
    const path = `banners/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false })
    if (error) toast.error(error.message)
    else {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      update('banner_url', data.publicUrl)
      toast.success('Banner enviado.')
    }
    setUploading(false)
  }

  function updateAi(key: keyof typeof aiForm, value: string) {
    setAiForm((current) => ({ ...current, [key]: value }))
  }

  async function generateBanner() {
    if (!aiForm.description.trim()) {
      toast.error('Descreva o banner que deseja gerar.')
      return
    }

    setGenerating(true)
    setGeneratedUrl(null)

    try {
      const data = await invokeGenerateBanner({
        description: aiForm.description,
        courseName: form.name || 'Curso ou evento cristao',
        areaText: aiForm.areaText,
        focusVisual: aiForm.focusVisual,
      })
      setGeneratedUrl(data.banner_url)
      update('banner_url', data.banner_url)
      toast.success('Banner gerado e aplicado ao curso.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel gerar o banner.')
    }
    setGenerating(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const payload = {
      name: form.name,
      description: form.description || null,
      owner_name: form.owner_name || null,
      event_date: form.event_date || null,
      status: form.status,
      location: form.location || null,
      banner_url: form.banner_url || null,
      color: form.color,
      notes: form.notes || null,
    }
    const result = course
      ? await supabase.from('courses').update(payload).eq('id', course.id)
      : await supabase.from('courses').insert(payload)
    if (result.error) toast.error(result.error.message)
    else {
      toast.success(course ? 'Curso atualizado.' : 'Curso criado.')
      onSaved()
    }
  }

  return (
    <Modal title={course ? 'Editar curso/evento' : 'Novo curso/evento'} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="relative overflow-hidden rounded-lg border border-[#ffc400]/18 bg-[#050505]">
              <img
                className="h-56 w-full object-cover opacity-90"
                src={form.banner_url || brandCoverUrl}
                alt="Previa do banner do curso"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/24 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffc400]">Previa do curso</p>
                <h3 className="mt-1 line-clamp-1 text-2xl font-black text-white">{form.name || 'Nome do curso/evento'}</h3>
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/72">{form.location || 'Local do encontro'}</p>
              </div>
            </div>
          </div>
          <label className="label md:col-span-2">
            Nome
            <input className="field" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label className="label md:col-span-2">
            Descricao
            <textarea className="field min-h-24" value={form.description ?? ''} onChange={(event) => update('description', event.target.value)} />
          </label>
          <label className="label">
            Responsavel
            <input className="field" value={form.owner_name ?? ''} onChange={(event) => update('owner_name', event.target.value)} />
          </label>
          <label className="label">
            Data
            <input className="field" type="date" value={form.event_date ?? ''} onChange={(event) => update('event_date', event.target.value)} />
          </label>
          <label className="label">
            Status
            <select className="field" value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option value="active">Ativo</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
          <label className="label">
            Local
            <input className="field" value={form.location ?? ''} onChange={(event) => update('location', event.target.value)} />
          </label>
          <label className="label">
            Cor personalizada
            <input className="field h-12 p-1" type="color" value={form.color} onChange={(event) => update('color', event.target.value)} />
          </label>
          <div className="md:col-span-2 grid gap-3">
            <div className="rounded-lg border border-[#ffc400]/18 bg-[#ffc400]/7 p-4">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
                  <Sparkles size={22} />
                </span>
                <div>
                  <p className="font-black text-[#fff8df]">Gerar banner com IA</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-[#bfb490]">
                    Descreva o tema e o sistema gera um banner 16:9 sem texto, pronto para usar no curso.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="label md:col-span-2">
                  Descricao do banner
                  <textarea
                    className="field min-h-24"
                    placeholder="Ex.: batalha espiritual e libertacao, Biblia aberta, luz dourada, atmosfera reverente e moderna"
                    value={aiForm.description}
                    onChange={(event) => updateAi('description', event.target.value)}
                  />
                </label>
                <label className="label">
                  Area livre para texto
                  <select className="field" value={aiForm.areaText} onChange={(event) => updateAi('areaText', event.target.value)}>
                    <option value="lado esquerdo">Lado esquerdo</option>
                    <option value="lado direito">Lado direito</option>
                    <option value="centro com respiro nas laterais">Centro com respiro nas laterais</option>
                    <option value="terco inferior">Terco inferior</option>
                  </select>
                </label>
                <label className="label">
                  Foco visual
                  <select className="field" value={aiForm.focusVisual} onChange={(event) => updateAi('focusVisual', event.target.value)}>
                    <option value="lado direito ou centro-direita">Lado direito / centro-direita</option>
                    <option value="lado esquerdo ou centro-esquerda">Lado esquerdo / centro-esquerda</option>
                    <option value="centro da imagem">Centro</option>
                    <option value="fundo com profundidade, sem elemento dominante">Fundo profundo sem foco dominante</option>
                  </select>
                </label>
              </div>

              {generatedUrl && (
                <div className="mt-4 overflow-hidden rounded-lg border border-[#ffc400]/15 bg-black/38">
                  <img className="aspect-video w-full object-cover" src={generatedUrl} alt="Banner gerado por IA" />
                </div>
              )}

              <div className="mt-4 grid gap-2 sm:flex sm:items-center">
                <button className="btn btn-primary" disabled={generating} onClick={generateBanner} type="button">
                  {generating ? <Loader2 className="animate-spin" size={18} /> : <ImagePlus size={18} />}
                  {generating ? 'Gerando banner...' : 'Gerar e aplicar banner'}
                </button>
                {generatedUrl && (
                  <button className="btn btn-soft" onClick={() => update('banner_url', generatedUrl)} type="button">
                    <Sparkles size={16} /> Usar esta imagem
                  </button>
                )}
              </div>
            </div>

            <label className="label">
              Banner do curso
              <span className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#ffc400]/35 bg-[#ffc400]/8 p-5 text-center transition hover:border-[#ffc400]/70 hover:bg-[#ffc400]/12">
                <input
                  className="absolute inset-0 cursor-pointer opacity-0"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}
                />
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
                  {uploading ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                </span>
                <span className="mt-3 text-sm font-black text-[#fff8df]">
                  {uploading ? 'Enviando para o Supabase Storage...' : 'Arraste ou clique para enviar um banner'}
                </span>
                <span className="mt-1 text-xs font-semibold text-[#bfb490]">PNG, JPG ou WEBP ate 5 MB. Recomendado: 1600x900.</span>
                {selectedFile && <span className="mt-3 chip">{selectedFile}</span>}
              </span>
            </label>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <label className="label">
                URL do banner
                <span className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bfb490]" size={16} />
                  <input className="field pl-10" value={form.banner_url ?? ''} onChange={(event) => update('banner_url', event.target.value)} />
                </span>
              </label>
              <button className="btn btn-soft self-end" onClick={() => update('banner_url', '')} type="button">
                <X size={16} /> Limpar
              </button>
            </div>
          </div>
          <label className="label md:col-span-2">
            Observacoes
            <textarea className="field min-h-20" value={form.notes ?? ''} onChange={(event) => update('notes', event.target.value)} />
          </label>
        </div>
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

async function invokeGenerateBanner(body: { description: string; courseName: string; areaText: string; focusVisual: string }) {
  if (!configuredSupabaseUrl || !configuredSupabaseAnonKey) {
    throw new Error('Supabase nao configurado no front-end.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    throw new Error('Sessao administrativa expirada. Faca login novamente.')
  }

  const response = await fetch(`${configuredSupabaseUrl.replace(/\/$/, '')}/functions/v1/generate-course-banner`, {
    method: 'POST',
    headers: {
      apikey: configuredSupabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let payload: { banner_url?: string; error?: string } | null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error || text || `Erro ${response.status} ao gerar o banner.`)
  }

  if (!payload?.banner_url) {
    throw new Error('A funcao nao retornou a URL do banner.')
  }

  return { banner_url: payload.banner_url }
}
