import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from './Icon'
import { StationDatalist } from './StationPicker'
import { ToastProvider } from './Toast'

export default function Layout() {
  const { pathname } = useLocation()
  const scroller = useRef<HTMLDivElement>(null)

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
        </div>
      </div>

      <StationDatalist />
    </ToastProvider>
  )
}
