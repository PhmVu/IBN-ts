import { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  description?: string
}

export function Card({ title, description, children }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-3 space-y-1">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {description ? <p className="text-sm text-gray-600">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}
