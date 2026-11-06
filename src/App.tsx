import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import { Loading, NotFound } from '@/components/ui'
import { MeetingRoute } from '@/hooks/useMeeting'
import Chat from '@/pages/Chat'
import Created from '@/pages/Created'
import Create from '@/pages/Create'
import Dashboard from '@/pages/Dashboard'
import Join from '@/pages/Join'
import Landing from '@/pages/Landing'
import Nearby from '@/pages/Nearby'
import Match from '@/pages/Match'
import PlanB from '@/pages/PlanB'
import Register from '@/pages/Register'
import Settings from '@/pages/Settings'

// 지도(Leaflet)는 무거워서 지도 화면에 들어갈 때만 불러온다
const Live = lazy(() => import('@/pages/Live'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="create" element={<Create />} />
        <Route path="created/:code" element={<Created />} />
        <Route path="join" element={<Join />} />
        <Route path="join/:code" element={<Join />} />
        <Route path="nearby" element={<Nearby />} />
        <Route path="m/:code" element={<MeetingRoute />}>
          <Route index element={<Dashboard />} />
          <Route path="register" element={<Register />} />
          <Route path="match" element={<Match />} />
          <Route path="settings" element={<Settings />} />
          <Route path="planb" element={<PlanB />} />
          <Route
            path="live"
            element={
              <Suspense fallback={<Loading />}>
                <Live />
              </Suspense>
            }
          />
          <Route path="chat" element={<Chat />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
