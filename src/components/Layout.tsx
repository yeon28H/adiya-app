import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getLastMeeting, setLastMeeting } from '@/lib/session'
import Icon, { BrandMark } from './Icon'
import { StationDatalist } from './StationPicker'
import { ToastProvider } from './Toast'

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)
  const [last, setLast] = useState(getLastMeeting)

  useEffect(() => {
    const sync = () => setLast(getLastMeeting())
    window.addEventListener('eodiya-session', sync)
    return () => window.removeEventListener('eodiya-session', sync)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    scroller.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <ToastProvider>
      <div id="device">
        <div id="scroller" ref={scroller}>
          <header className="topbar">
            <div className="container">
              <Link className="brand" to="/" aria-label="어디야? 처음으로">
                <BrandMark />
                어디야?
              </Link>
              <nav className="nav" id="nav" aria-label="주 메뉴">
                {last ? (
                  <>
                    <Link className="who" to={`/m/${last.code}`}>
                      <Icon name="users" size={16} />
                      <span className="who-t">{last.name}</span>
                    </Link>
                    <button
                      aria-label="모임에서 나가기"
                      onClick={() => {
                        setLastMeeting(null)
                        navigate('/')
                      }}
                    >
                      나가기
                    </button>
                  </>
                ) : (
                  <>
                    <Link className="hide-sm" to="/join">
                      모임 참여
                    </Link>
                    <Link to="/create">모임 만들기</Link>
                  </>
                )}
              </nav>
            </div>
          </header>

          <main id="app">
            <Outlet />
          </main>

          <footer className="footer">
            <div className="container row between wrap">
              <span>어디야? · 함께 가고, 무사히 도착하고.</span>
              <span>귀가 동행 서비스 · 베타 · 역 데이터 © OpenStreetMap contributors</span>
            </div>
          </footer>
        </div>
      </div>

      <StationDatalist />
    </ToastProvider>
  )
}
