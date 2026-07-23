import { headers } from 'next/headers'

export async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '')
  }

  try {
    const headerList = await headers()
    const host = headerList.get('x-forwarded-host') || headerList.get('host')
    const proto = headerList.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http')

    if (host) {
      return `${proto}://${host}`
    }
  } catch (err) {
    // If invoked outside request context
  }

  return 'https://finance.simplificae.online'
}
