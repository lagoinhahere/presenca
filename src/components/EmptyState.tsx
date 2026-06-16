import { Sparkles } from 'lucide-react'

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="card grid min-h-52 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-[#ffc400]/18 text-[#ffc400]">
          <Sparkles size={22} />
        </div>
        <h3 className="text-lg font-black">{title}</h3>
        <p className="mt-2 max-w-md text-sm font-medium text-[#bfb490]">{text}</p>
      </div>
    </div>
  )
}
