import type { ReactNode } from 'react'
import './globals.css'

/**
 * The root layout holds no <html>: the locale layout does, because it needs
 * the lang and dir attributes, which only it knows.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
