import type { ReactNode } from 'react'

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffc400]">{eyebrow}</p>}
        <h1 className="text-2xl font-black tracking-normal text-[#fff8df] sm:text-3xl md:text-4xl">{title}</h1>
      </div>
      {children && <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">{children}</div>}
    </div>
  )
}
