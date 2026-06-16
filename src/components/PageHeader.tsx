import type { ReactNode } from 'react'

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffc400]">{eyebrow}</p>}
        <h1 className="text-3xl font-black tracking-normal text-[#fff8df] md:text-4xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
