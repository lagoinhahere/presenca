import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogoMark } from './LogoMark'
import { cn } from '../lib/utils'

const nav = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/courses', label: 'Cursos', icon: BookOpen },
  { to: '/sessions', label: 'Aulas', icon: CalendarDays },
  { to: '/attendance', label: 'Frequencia', icon: GraduationCap },
  { to: '/reports', label: 'Relatorios', icon: ClipboardList },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#060604] text-[#fff8df]">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-[#ffc400]/15 bg-[#090907]/88 px-5 py-5 backdrop-blur-xl lg:block">
        <LogoMark />
        <div className="mt-8 rounded-lg border border-[#ffc400]/12 bg-[#ffc400]/8 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffc400]">Controle de presenca</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#bfb490]">Cursos, aulas e check-ins organizados para a Lagoinha Americana.</p>
        </div>
        <nav className="mt-7 grid gap-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-extrabold text-[#bfb490] transition hover:bg-white/6 hover:text-white',
                  isActive && 'bg-[#ffc400] text-[#050505] shadow-lg shadow-[#ffc400]/16',
                )
              }
            >
              <item.icon className="transition group-hover:scale-105" size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-[#ffc400]/15 bg-white/5 p-4">
          <p className="text-sm font-black">{profile?.full_name ?? 'Administrador'}</p>
          <p className="mt-1 truncate text-xs font-semibold text-[#bfb490]">Sessao administrativa</p>
          <button className="btn btn-soft mt-4 w-full" onClick={logout} type="button">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#ffc400]/15 bg-[#090907]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <LogoMark compact />
          <button className="btn btn-soft px-3" onClick={() => setOpen((value) => !value)} type="button">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {open && (
          <nav className="mt-4 grid gap-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-extrabold text-[#bfb490]', isActive && 'bg-[#ffc400] text-[#050505]')
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="min-h-screen px-4 pb-28 pt-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="pointer-events-none fixed right-0 top-0 h-80 w-80 rounded-full bg-[#ffc400]/10 blur-3xl" />
        <Outlet />
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-lg border border-[#ffc400]/18 bg-[#090907]/92 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl lg:hidden">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'grid min-h-14 place-items-center gap-1 rounded-lg px-1 text-[0.6rem] font-black text-[#bfb490] transition',
                isActive && 'bg-[#ffc400] text-[#050505] shadow-lg shadow-[#ffc400]/18',
              )
            }
          >
            <item.icon size={18} />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
