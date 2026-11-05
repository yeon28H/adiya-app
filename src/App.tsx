import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import GroupCreate from '@/pages/GroupCreate'
import GroupDetail from '@/pages/GroupDetail'
import GroupList from '@/pages/GroupList'
import Home from '@/pages/Home'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="groups" element={<GroupList />} />
        <Route path="groups/new" element={<GroupCreate />} />
        <Route path="groups/:id" element={<GroupDetail />} />
      </Route>
    </Routes>
  )
}
