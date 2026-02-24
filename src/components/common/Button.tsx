import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  children: ReactNode
}

// 버튼 변형별 스타일
const variantStyles = {
  primary: 'bg-money-600 hover:bg-money-700 text-white',
  secondary: 'bg-slate-600 hover:bg-slate-700 text-slate-100',
  danger: 'bg-danger-600 hover:bg-danger-700 text-white',
} as const

// 버튼 크기별 스타일
const sizeStyles = {
  sm: 'text-sm px-3 py-1',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-6 py-3',
} as const

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-1.5
        rounded-lg font-medium transition-colors
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `.trim()}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}
