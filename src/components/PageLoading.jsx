import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

export default function PageLoading({ label = 'جاري تجهيز الصفحة...', error = '', onRetry }) {
  if (error) {
    return (
      <div className="page-loading page-loading-error" role="alert">
        <AlertTriangle size={28} />
        <strong>حصلت مشكلة مؤقتة</strong>
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="page-loading-retry" onClick={onRetry}>
            <RefreshCw size={15} /> إعادة المحاولة
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="page-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="page-loading-mark"><Loader2 size={24} /></div>
      <strong>{label}</strong>
      <div className="page-loading-skeletons" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  )
}
