import { useState } from 'react'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import './index.css'

interface UserSession {
  email: string;
  sucursal: string;
  rol: string;
}

function App() {
  const [session, setSession] = useState<UserSession | null>(null);

  const handleLoginSuccess = (user: UserSession) => {
    setSession(user);
  };

  const handleLogout = () => {
    setSession(null);
  };

  return (
    <>
      {!session ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard session={session} onLogout={handleLogout} />
      )}
    </>
  )
}

export default App
