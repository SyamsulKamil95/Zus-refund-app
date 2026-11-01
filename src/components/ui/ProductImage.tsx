import { useState } from 'react'
import { PackageOpen } from 'lucide-react'

type ProductImageProps = {
  src?: string
  name: string
}

export function ProductImage({ src, name }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || src === failedSrc) {
    return <PackageOpen size={22} strokeWidth={1.65} aria-hidden="true" />
  }

  return (
    <img
      src={src}
      alt={name}
      width={42}
      height={42}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      className="size-full min-h-0 min-w-0 rounded-[inherit] object-contain"
      onError={() => setFailedSrc(src)}
    />
  )
}
