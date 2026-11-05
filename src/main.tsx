import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/app.css'

// HashRouter: 프로토타입과 같은 #/m/CODE 주소 형식을 유지하고, Vercel 에서 별도 리라이트 설정이 필요 없다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
