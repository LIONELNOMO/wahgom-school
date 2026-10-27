import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if (import.meta.env.PROD) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    window.__wamghomInstallPrompt = event
    window.dispatchEvent(new CustomEvent('wamghom:pwa-ready'))
  })

  window.addEventListener('appinstalled', () => {
    window.__wamghomInstallPrompt = null
    window.dispatchEvent(new CustomEvent('wamghom:pwa-installed'))
  })
} else if ('serviceWorker' in navigator) {
  // Un ancien service worker Workbox peut intercepter Vite et provoquer des 404.
  // En développement, l’application fonctionne toujours sans service worker.
  Promise.all([
    navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
    'caches' in window ? caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('wamghomschool-') || key.includes('workbox')).map((key) => caches.delete(key)))) : Promise.resolve(),
  ]).then(() => {
    if (navigator.serviceWorker.controller && sessionStorage.getItem('wamghom_dev_sw_cleaned') !== 'yes') {
      sessionStorage.setItem('wamghom_dev_sw_cleaned', 'yes')
      window.location.reload()
    }
  }).catch(console.error)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Échec de l’enregistrement du service worker', error)
    })
  })
}
