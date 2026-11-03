import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UserRoleProvider } from './context/UserRoleContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import SplashLoader from './components/SplashLoader.jsx'

import './index.css'
import App from './App.jsx'

function Root() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {loading && <SplashLoader />}

      <BrowserRouter>
        <AuthProvider>
          <UserRoleProvider>
            <App />
          </UserRoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)