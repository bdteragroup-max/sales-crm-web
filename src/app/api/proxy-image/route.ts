import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
  <rect width="400" height="400" fill="#F8FAFC"/>
  <rect x="20" y="20" width="360" height="360" rx="16" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="2"/>
  <circle cx="200" cy="170" r="32" fill="#CBD5E1"/>
  <path d="M140 260C140 230 165 215 200 215C235 215 260 230 260 260" stroke="#94A3B8" stroke-width="8" stroke-linecap="round"/>
  <text x="200" y="300" text-anchor="middle" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600">Ad Creative</text>
</svg>`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl || !imageUrl.startsWith('http')) {
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  // If it's a known non-image URL like Facebook ad preview permalink, return clean placeholder immediately without upstream 400
  if (imageUrl.includes('fb.me') || imageUrl.includes('adspreview') || imageUrl.includes('facebook.com/ads/preview')) {
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    })

    if (!res.ok) {
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const arrayBuffer = await res.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error: any) {
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

