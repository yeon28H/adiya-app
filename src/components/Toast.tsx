import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ToastFn = (msg: string) => void
const Ctx = createContext<ToastFn>(() => {})

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])

  const toast = useCallback<ToastFn>((msg) => {
    const id = Date.now() + Math.random()
    setItems((l) => [...l, { id, msg }])
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 2400)
  }, [])

  // .toast-wrap 은 #device(기기 틀) 안쪽 기준으로 배치되므로 그 안에 렌더링한다.
  const host = document.getElementById('device') ?? document.body

  return (
    <Ctx.Provider value={toast}>
      {children}
      {createPortal(
        items.map((t) => (
          <div key={t.id} className="toast-wrap">
            <div className="toast" role="status">
              {t.msg}
            </div>
          </div>
        )),
        host,
      )}
    </Ctx.Provider>
  )
}
