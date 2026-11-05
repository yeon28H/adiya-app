import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: '홈' },
  { to: '/groups', label: '귀가모임' },
  { to: '/groups/new', label: '만들기' },
  { to: '/join', label: '참여' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-white shadow-sm">
      <header className="bg-brand-500 px-4 py-3 text-lg font-bold text-neutral-900">
        아디야 <span className="text-sm font-medium">안심귀가</span>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
      <nav className="grid grid-cols-4 border-t border-neutral-200 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              `py-3 text-center text-sm font-medium ${isActive ? 'text-brand-700' : 'text-neutral-500'}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
