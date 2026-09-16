import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function Avatar({ className, children, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface AvatarImageProps extends Omit<React.ComponentProps<typeof Image>, 'alt'> {
  alt?: string
}

export function AvatarImage({ className, alt = "", ...props }: AvatarImageProps) {
  return (
    <Image
      alt={alt}
      className={cn('object-cover w-full h-full', className)}
      {...props}
    />
  )
} 