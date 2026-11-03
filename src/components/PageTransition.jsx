import { useLocation } from 'react-router-dom'

export default function PageTransition({ children }) {
  const location = useLocation()
  const transitionKey = `${location.pathname}${location.search}`

  return (
    <div className="page-transition" key={transitionKey}>
      {children}
    </div>
  )
}
