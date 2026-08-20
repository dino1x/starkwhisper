import type { Metadata } from 'next'
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '../index.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StarkWhisper · Sovereign Private Messaging & Atomic Payments on Starknet',
  description: 'Zero-knowledge end-to-end encrypted messaging, DKSAP stealth addresses, forward secrecy double ratchets, and private STRK payments on Starknet.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}

