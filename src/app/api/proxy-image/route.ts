import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl || !imageUrl.startsWith('http')) {
    return new NextResponse('Invalid or missing image URL', { status: 400 })
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
      return new NextResponse(`Failed to fetch upstream image (${res.status})`, {
        status: res.status
      })
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
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
    console.error('Image proxy error:', error?.message)
    return new NextResponse('Error proxying image', { status: 500 })
  }
}
