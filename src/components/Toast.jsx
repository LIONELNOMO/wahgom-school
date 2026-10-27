import { useEffect } from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi'

const styles = {
  success: ['bg-emerald-700', FiCheckCircle],
  error: ['bg-red-700', FiAlertCircle],
  info: ['bg-brand', FiInfo],
}

export default function Toast({ toast, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3200)
    return () => clearTimeout(timer)
  }, [onDone])

  const [color, Icon] = styles[toast.type] || styles.info
  return (
    <div className={`toast-enter flex min-w-72 max-w-sm items-start gap-3 rounded-xl px-4 py-3.5 text-white shadow-2xl ${color}`}>
      <Icon className="mt-0.5 shrink-0" size={18} />
      <div><b className="block text-xs">{toast.title}</b>{toast.message && <span className="mt-0.5 block text-[10px] text-white/75">{toast.message}</span>}</div>
    </div>
  )
}
