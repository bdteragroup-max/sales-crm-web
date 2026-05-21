import { ButtonHTMLAttributes } from 'react'

export function LoadingButton({ 
  loading, children, ...props
}: { loading: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) { 
  return ( 
    <button disabled={loading} {...props}> 
      {loading ? ( 
        <span className="flex items-center justify-center gap-2"> 
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"> 
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /> 
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          กำลังบันทึก...
        </span>
      ) : children}
    </button>
  )
}
