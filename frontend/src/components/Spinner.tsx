type Props = {
  size?: number
}

export function Spinner({ size = 20 }: Props) {
  return (
    <div
      className="inline-block animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  )
}
