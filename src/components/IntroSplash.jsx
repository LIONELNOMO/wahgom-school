import { useCallback, useEffect, useRef, useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'

const INTRO_DURATION = 14000

export default function IntroSplash({ onComplete }) {
  const [closing, setClosing] = useState(false)
  const completed = useRef(false)

  const finish = useCallback(() => {
    if (completed.current) return
    completed.current = true
    setClosing(true)
    window.setTimeout(onComplete, 420)
  }, [onComplete])

  useEffect(() => {
    const fallback = window.setTimeout(finish, INTRO_DURATION + 1800)
    const receive = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'wamghom:intro-complete') finish()
    }
    const keydown = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') finish()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('message', receive)
    window.addEventListener('keydown', keydown)
    return () => {
      window.clearTimeout(fallback)
      window.removeEventListener('message', receive)
      window.removeEventListener('keydown', keydown)
      document.body.style.overflow = previousOverflow
    }
  }, [finish])

  return (
    <section className={`intro-splash ${closing ? 'intro-splash--closing' : ''}`} aria-label="Introduction de WamghomSchool">
      <iframe
        className="size-full border-0"
        src="/intro/wamghomschool_intro_animatic.html"
        title="Introduction animée de WamghomSchool"
        sandbox="allow-scripts allow-same-origin"
      />
      <button className="intro-skip" type="button" onClick={finish} aria-label="Passer l’introduction">
        Passer <FiArrowRight aria-hidden="true" />
      </button>
      <div className="intro-progress" aria-hidden="true"><span /></div>
    </section>
  )
}
