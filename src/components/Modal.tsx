import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid items-end bg-[#050505]/62 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="premium-panel max-h-[94svh] w-full max-w-3xl overflow-y-auto rounded-t-lg p-4 text-[#fff8df] shadow-2xl sm:max-h-[92vh] sm:rounded-lg sm:p-5">
        <div className="sticky -top-4 z-10 mb-5 flex items-center justify-between gap-4 border-b border-[#ffc400]/10 bg-[#0a0a08]/95 pb-3 pt-1 backdrop-blur sm:static sm:border-b-0 sm:bg-transparent sm:pb-0 sm:pt-0">
          <h2 className="text-lg font-black sm:text-xl">{title}</h2>
          <button className="btn btn-soft px-3" onClick={onClose} type="button" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
