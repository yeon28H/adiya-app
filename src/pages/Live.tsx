import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Avatar, Back, Badge, destView, Shell } from '@/components/ui'
import { useMeeting } from '@/hooks/useMeeting'
import { agoText, getCurrentFix, reverseGeocode } from '@/lib/geo'
import { nearestStation } from '@/lib/matching'
import { findStation } from '@/lib/stations'
import type { MemberView } from '@/types'

const pinIcon = (name: string, mine: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin${mine ? ' me' : ''}">${name.slice(0, 1)}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const placeIcon = L.divIcon({
  className: '',
  html: '<div class="map-pin place">★</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

export default function Live() {
  const { mt, me, shareLocation } = useMeeting()
  const toast = useToast()
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const fitted = useRef(false)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(t)
  }, [])

  const place = findStation(mt.placeStation) ?? findStation(mt.place)

  // 지도에 표시할 사람들 (DB 공개 범위 규칙을 통과한 위치만 내려온다)
  const visible = useMemo(
    () =>
      mt.members
        .map((m) => ({ m, loc: mt.locations[m.id] }))
        .filter((x): x is { m: MemberView; loc: NonNullable<typeof x.loc> } => !!x.loc),
    [mt.members, mt.locations],
  )

  // 지도 생성
  useEffect(() => {
    if (!mapEl.current || map.current) return
    const m = L.map(mapEl.current, { zoomControl: true }).setView([place?.lat ?? 37.5665, place?.lng ?? 126.978], 13)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
      layer.current = null
      fitted.current = false
    }
  }, [place?.lat, place?.lng])

  // 마커 갱신
  useEffect(() => {
    const g = layer.current
    const m = map.current
    if (!g || !m) return
    g.clearLayers()
    const pts: L.LatLngExpression[] = []
    if (place) {
      L.marker([place.lat, place.lng], { icon: placeIcon, title: `모임 장소 ${place.key}` }).addTo(g)
      pts.push([place.lat, place.lng])
    }
    for (const { m: mem, loc } of visible) {
      const mine = mem.id === me.id
      L.marker([loc.lat, loc.lng], { icon: pinIcon(mem.name, mine), title: mem.name })
        .bindTooltip(`${mem.name}${mine ? ' (나)' : ''} · ${agoText(loc.updatedAt)}`)
        .addTo(g)
      if (loc.accuracy && loc.accuracy < 300) {
        L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: '#F5B700', weight: 1, fillOpacity: 0.08 }).addTo(g)
      }
      pts.push([loc.lat, loc.lng])
    }
    if (!fitted.current && pts.length > 1) {
      m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 })
      fitted.current = true
    } else if (!fitted.current && visible.length === 1) {
      m.setView([visible[0].loc.lat, visible[0].loc.lng], 15)
      fitted.current = true
    }
  }, [visible, place, me.id])

  async function refreshMine() {
    setBusy(true)
    try {
      const fix = await getCurrentFix()
      const label = await reverseGeocode(fix.lat, fix.lng)
      await shareLocation({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, label })
      fitted.current = false
      toast('내 위치를 업데이트했어요')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const hidden = mt.members.filter((x) => !mt.locations[x.id])

  const whereText = (m: MemberView) => {
    const loc = mt.locations[m.id]
    if (!loc) return null
    const near = nearestStation(loc)
    const nearText = near ? `${near.station.key} 부근 (약 ${near.km < 1 ? Math.round(near.km * 1000) + 'm' : near.km.toFixed(1) + 'km'})` : ''
    return `${loc.label ? loc.label + ' · ' : ''}${nearText}`
  }

  const whyHidden = (m: MemberView) => {
    if (!m.registered) return '귀가 정보 미등록'
    if (m.status === 'arrived') return '도착 완료'
    if (m.shareStopped) return '위치 공유 중단'
    if (m.privacy !== 'exact') return `${destView(me, m)} · 위치는 비공개`
    return m.status === 'ready' ? '아직 귀가 전 (귀가를 시작하면 위치가 공유돼요)' : '위치 확인 중'
  }

  return (
    <Shell narrow={false}>
      <Back to={`/m/${mt.code}`}>{mt.name}</Back>
      <div className="page-head row between wrap">
        <div>
          <h2>어디까지 왔나요?</h2>
          <p>
            귀가 중인 사람의 실시간 위치가 지도에 표시돼요. <b>정확한 위치 공개</b>를 선택한 사람만 보여요.
          </p>
        </div>
        <Link className="btn btn-primary btn-sm" to={`/m/${mt.code}/chat`}>
          <Icon name="bell" size={16} />모임 채팅
        </Link>
      </div>

      <div ref={mapEl} className="live-map" aria-label="모임 지도" />

      <div className="row wrap" style={{ margin: '12px 0 20px' }}>
        <button className="btn btn-soft" onClick={() => void refreshMine()} disabled={busy}>
          <Icon name="pin" size={18} />
          {busy ? '위치 확인 중...' : '지금 내 위치 업데이트'}
        </button>
        <span className="small muted">귀가를 시작하면 이동하는 동안 자동으로 갱신돼요.</span>
      </div>

      <div className="card">
        <div className="card-title"><Icon name="users" size={20} /><h3>참여자 위치</h3></div>
        {visible.map(({ m, loc }) => (
          <div key={m.id} className="member">
            <Avatar name={m.name} />
            <div className="grow">
              <div className="nm">
                {m.name}
                {m.id === me.id && <> <span className="tag y">나</span></>}
              </div>
              <div className="sub">
                {whereText(m)} · {agoText(loc.updatedAt, now)}
              </div>
            </div>
            <Badge x={m} />
          </div>
        ))}
        {hidden.map((m) => (
          <div key={m.id} className="member">
            <Avatar name={m.name} />
            <div className="grow">
              <div className="nm">{m.name}</div>
              <div className="sub">{whyHidden(m)}</div>
            </div>
            <Badge x={m} />
          </div>
        ))}
      </div>
    </Shell>
  )
}
