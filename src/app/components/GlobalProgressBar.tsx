'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function GlobalProgressBar() { 
  const [loading, setLoading] = useState(false) 
  const pathname = usePathname() 
  const searchParams = useSearchParams() 

  useEffect(() => { 
    setLoading(true) 
    const t = setTimeout(() => setLoading(false), 500) 
    return () => clearTimeout(t) 
  }, [pathname, searchParams]) 

  if (!loading) return null 

  return ( 
    <div className="fixed top-0 left-0 right-0 z-[999] h-1 bg-brand-red/20"> 
      <div 
        className="h-full bg-brand-red" 
        style={{ animation: 'progress 0.5s ease-in-out forwards' }}
      /> 
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { width: 0%; opacity: 1; }
          50% { width: 70%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
      `}} />
    </div> 
  )
}
