import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#050505]/50 p-4 backdrop-blur-sm">
      <div className="premium-panel max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg p-5 text-[#fff8df] shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black">{title}</h2>
          <button className="btn btn-soft px-3" onClick={onClose} type="button" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
