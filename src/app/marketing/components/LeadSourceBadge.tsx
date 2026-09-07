import React from 'react'
import { Layers, Globe, Store, UserCheck, Megaphone, Radio, HelpCircle } from 'lucide-react'

export interface LeadMarketingInfo {
  leadSource?: string | null
  campaignSource?: string | null
  adCampaign?: {
    id?: string
    name?: string
    internalCode?: string | null
    campaignId?: string | null
    targetAudience?: string | null
    channel?: {
      id?: string
      name?: string
    } | null
  } | null
}

export function FacebookIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export function TikTokIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.3 6.3 0 0 0 1.95-4.52V8.92a8.28 8.28 0 0 0 4.82 1.54V7.01a4.85 4.85 0 0 1-1-.32z" />
    </svg>
  )
}

export function GoogleIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z" />
      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
    </svg>
  )
}

export function LineIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 5.82 2 10.53c0 4.22 3.61 7.74 8.5 8.38.33.07.78.22.89.51.1.26.07.67.03.93l-.15.93c-.05.29-.22 1.13.99.62 1.21-.51 6.54-3.85 8.93-6.6A8.09 8.09 0 0 0 22 10.53C22 5.82 17.52 2 12 2z" />
    </svg>
  )
}

export function parseLeadAttribution(lead: LeadMarketingInfo) {
  // 1. Resolve Channel
  const rawChannel = lead.leadSource?.trim() || lead.adCampaign?.channel?.name?.trim() || null
  
  // 2. Resolve Campaign & Ad Set
  const campaignName = lead.adCampaign?.name?.trim() || null
  const campaignCode = lead.adCampaign?.internalCode?.trim() || lead.adCampaign?.campaignId?.trim() || null
  
  let adSetCode: string | null = null
  let adSetName: string | null = lead.campaignSource?.trim() || null

  // If campaign has targetAudience with adSets, attempt to match or find
  if (lead.adCampaign?.targetAudience && lead.adCampaign.targetAudience.startsWith('{')) {
    try {
      const parsed = JSON.parse(lead.adCampaign.targetAudience)
      if (Array.isArray(parsed.adSets) && parsed.adSets.length > 0) {
        if (adSetName) {
          const match = parsed.adSets.find((s: any) =>
            s.id === adSetName ||
            s.code === adSetName ||
            s.name === adSetName ||
            s.platformAdSetId === adSetName ||
            (s.code && adSetName && s.code.toLowerCase() === adSetName.toLowerCase()) ||
            (s.name && adSetName && s.name.toLowerCase() === adSetName.toLowerCase())
          )
          if (match) {
            adSetCode = match.code || null
            adSetName = match.name || adSetName
          }
        } else if (parsed.adSets.length === 1) {
          adSetCode = parsed.adSets[0].code || null
          adSetName = parsed.adSets[0].name || null
        }
      }
    } catch {
      // JSON parse fallback
    }
  }

  return {
    channel: rawChannel,
    campaignName,
    campaignCode,
    adSetName,
    adSetCode,
  }
}

export function getChannelBadgeStyle(channelName: string | null): {
  bg: string
  icon: React.ReactNode
  label: string
} {
  if (!channelName) {
    return {
      bg: 'bg-gray-100 text-gray-500 border-gray-200',
      icon: <HelpCircle size={12} className="text-gray-400 shrink-0" />,
      label: 'ไม่ระบุช่องทาง'
    }
  }

  const norm = channelName.toLowerCase()

  if (norm.includes('facebook') || norm.includes('fb')) {
    return {
      bg: 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs',
      icon: <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />,
      label: 'Facebook'
    }
  }
  if (norm.includes('tiktok')) {
    return {
      bg: 'bg-slate-900 text-white border-slate-800 shadow-xs',
      icon: <TikTokIcon className="w-3.5 h-3.5 text-white shrink-0" />,
      label: 'TikTok'
    }
  }
  if (norm.includes('google')) {
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs',
      icon: <GoogleIcon className="w-3.5 h-3.5 shrink-0" />,
      label: 'Google Ads'
    }
  }
  if (norm.includes('line')) {
    return {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs',
      icon: <LineIcon className="w-3.5 h-3.5 text-[#06C755] shrink-0" />,
      label: 'LINE'
    }
  }
  if (norm.includes('web') || norm.includes('เว็บไซต์')) {
    return {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs',
      icon: <Globe size={12} className="text-indigo-600 shrink-0" />,
      label: 'Website'
    }
  }
  if (norm.includes('หน้าร้าน') || norm.includes('walk-in') || norm.includes('walk in') || norm.includes('store')) {
    return {
      bg: 'bg-teal-50 text-teal-700 border-teal-200 shadow-xs',
      icon: <Store size={12} className="text-teal-600 shrink-0" />,
      label: 'หน้าร้าน (Walk-in)'
    }
  }
  if (norm.includes('แนะนำ') || norm.includes('referral') || norm.includes('บอกต่อ')) {
    return {
      bg: 'bg-purple-50 text-purple-700 border-purple-200 shadow-xs',
      icon: <UserCheck size={12} className="text-purple-600 shrink-0" />,
      label: 'แนะนำ (Referral)'
    }
  }

  return {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <Radio size={12} className="text-slate-500 shrink-0" />,
    label: channelName
  }
}

export default function LeadSourceBadge({ lead }: { lead: LeadMarketingInfo }) {
  const { channel, campaignName, campaignCode, adSetName, adSetCode } = parseLeadAttribution(lead)
  const channelStyle = getChannelBadgeStyle(channel)

  const hasAnyAttribution = Boolean(channel || campaignName || adSetName)

  if (!hasAnyAttribution) {
    return (
      <span className="text-gray-400 text-xs font-medium italic">
        -
      </span>
    )
  }

  const formattedAdSetLabel = adSetCode && adSetName && adSetCode !== adSetName
    ? `${adSetCode} • ${adSetName}`
    : (adSetCode || adSetName)

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px] max-w-[260px]">
      {/* Channel Badge with Brand Icon */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${channelStyle.bg}`}>
          {channelStyle.icon}
          <span>{channelStyle.label}</span>
        </span>
      </div>

      {/* Ad Set Pill with Layers Icon */}
      {formattedAdSetLabel && (
        <div 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-slate-800 border border-slate-200/90 text-[11px] font-bold w-fit max-w-full shadow-xs"
          title={`ชุดโฆษณา (Ad Set): ${formattedAdSetLabel}`}
        >
          <Layers size={11} className="text-brand-red shrink-0" />
          <span className="truncate">{formattedAdSetLabel}</span>
        </div>
      )}

      {/* Campaign Name / Code with Megaphone Icon */}
      {(campaignName || campaignCode) && (
        <div 
          className="text-[10px] text-gray-500 font-medium truncate max-w-full flex items-center gap-1"
          title={`แคมเปญ: ${campaignCode ? `[${campaignCode}] ` : ''}${campaignName || ''}`}
        >
          <Megaphone size={11} className="text-gray-400 shrink-0" />
          <span className="truncate">
            {campaignCode ? `${campaignCode} • ` : ''}{campaignName || ''}
          </span>
        </div>
      )}

      {/* If only channel is present without adset/campaign */}
      {!formattedAdSetLabel && !campaignName && (
        <span className="text-[10px] text-gray-400 font-medium">
          ไม่ได้ระบุชุดโฆษณา
        </span>
      )}
    </div>
  )
}
