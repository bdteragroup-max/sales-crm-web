export const theme = {
  metrics: {
    budget: 'text-slate-600',
    budgetBorder: 'border-slate-500',
    spend: 'text-red-600',
    spendBorder: 'border-red-500',
    sales: 'text-emerald-600',
    salesBorder: 'border-emerald-500',
    crm: 'text-indigo-600',
    crmBorder: 'border-indigo-500',
    warning: 'text-amber-500',
    warningBorder: 'border-amber-400',
    empty: 'text-gray-400',
    emptyBorder: 'border-gray-300'
  },
  channels: {
    facebook: '#1877F2',
    tiktok: '#EE1D52',
    google: '#4285F4',
    line: '#06C755',
  },
  getChannelColor: (channelName: string, index: number) => {
    const c = channelName.toLowerCase()
    if (c.includes('facebook') || c.includes('fb') || c.includes('meta')) return theme.channels.facebook
    if (c.includes('tiktok') || c.includes('tt')) return theme.channels.tiktok
    if (c.includes('google') || c.includes('adwords') || c.includes('gg')) return theme.channels.google
    if (c.includes('line')) return theme.channels.line
    
    // Fallback palette
    const fallbacks = ['#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1']
    return fallbacks[index % fallbacks.length]
  }
}
