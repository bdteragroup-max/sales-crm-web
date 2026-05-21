export function TableSkeleton({ rows = 5 }: { rows?: number }) { 
  return ( 
    <div className="space-y-3"> 
      {Array.from({ length: rows }).map((_, i) => ( 
        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" /> 
      ))} 
    </div> 
  )
}
