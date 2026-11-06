import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getLastMeeting, setLastMeeting } from '@/lib/session'
import { BrandMark } from './Icon'
import { StationDatalist } from './StationPicker'
import { ToastProvider } from './Toast'

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)
  const inMeeting = pathname.startsWith('/m/')

  useEffect(() => {
    window.scrollTo(0, 0)
    scroller.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <ToastProvider>
      <div id="device">
        <div id="scroller" ref={scroller}>
          {/* 오른쪽 상단에는 아무 메뉴도 두지 않는다 */}
          <header className="topbar">
            <div className="container">
              <Link className="brand" to="/" aria-label="어디야? 처음으로">
                <BrandMark />
                어디야?
              </Link>
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

          {/* 모임 화면 맨 아래의 작은 나가기 (홈으로 나가요. 모임 참여 상태는 그대로예요) */}
          {inMeeting && getLastMeeting() && (
            <div className="leave-row">
              <button
                className="leave-btn"
                onClick={() => {
                  setLastMeeting(null)
                  navigate('/')
                }}
              >
                나가기
              </button>
            </div>
          )}
        </div>
      </div>

      <StationDatalist />
    </ToastProvider>
  )
}
