import { useEffect, useState, type FormEvent } from 'react'
import { Archive, LinkIcon, Loader2, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { supabase } from '../../lib/supabase'
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
              <div className="relative h-48">
                <img className="h-full w-full object-cover" src={course.banner_url || settings.default_banner_url || defaultHeroUrl} alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/92 via-[#050505]/18 to-transparent" />
                <span className="chip absolute left-4 top-4">{course.status}</span>
                <span className="absolute right-4 top-4 h-3 w-3 rounded-full border border-white/40" style={{ background: course.color }} />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="line-clamp-2 text-2xl font-black">{course.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-white/82">{course.owner_name || 'Responsavel nao informado'}</p>
                </div>
              </div>
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
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

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
