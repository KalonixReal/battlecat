'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The Battle Cats — full-screen game shell.
 * The game is a self-contained canvas app at /game/index.html
 * (engine modules in /public/game/js/*). This wrapper mounts it in a
 * borderless, full-viewport iframe. The engine posts {bc:'booted'}
 * once its first frame is drawn (audio streaming never blocks reveal).
 */
export default function Home() {
  const [booted, setBooted] = useState(false)
  const bootedRef = useRef(false)
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data && e.data.bc === 'booted') {
        bootedRef.current = true
        setBooted(true)
      }
    }
    window.addEventListener('message', onMsg)
    // belt & suspenders: poll the frame for the __BC hook (same-origin)
    const poll = window.setInterval(() => {
      if (bootedRef.current) {
        window.clearInterval(poll)
        return
      }
      try {
        const w = frameRef.current?.contentWindow
        if (w && (w as unknown as { __BC?: unknown }).__BC) {
          bootedRef.current = true
          setBooted(true)
          window.clearInterval(poll)
        }
      } catch {
        /* not ready yet */
      }
    }, 300)
    return () => {
      window.removeEventListener('message', onMsg)
      window.clearInterval(poll)
    }
  }, [])

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#14141a',
      }}
    >
      <iframe
        ref={frameRef}
        src="/game/index.html?v=6"
        title="The Battle Cats"
        allow="autoplay; fullscreen"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: '#14141a',
        }}
      />
      {!booted && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            background: '#14141a',
            color: '#ffd94a',
            fontFamily: '"Trebuchet MS", "Arial Rounded MT Bold", sans-serif',
            pointerEvents: 'none',
            transition: 'opacity .35s ease',
          }}
        >
          <div
            style={{
              width: 86,
              height: 86,
              border: '7px solid #3a2a12',
              borderTopColor: '#ffd94a',
              borderRadius: '50%',
              animation: 'bcspin 0.9s linear infinite',
            }}
          />
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            THE BATTLE CATS
          </div>
          <div style={{ fontSize: 13, color: '#c9b28a', fontWeight: 600 }}>
            Loading the battlefield…
          </div>
          <style>{`@keyframes bcspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </main>
  )
}
