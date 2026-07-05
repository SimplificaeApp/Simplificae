import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinanceOS Copiloto Financeiro',
    short_name: 'FinanceOS',
    description: 'Seu copiloto financeiro inteligente e avançado.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#10b981',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
