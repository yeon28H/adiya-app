import Icon from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Back, PRIVACY, Shell } from '@/components/ui'
import { useMeeting } from '@/hooks/useMeeting'
import type { Privacy } from '@/types'

export default function Settings() {
  const { mt, me, setSetting } = useMeeting()
  const toast = useToast()
  const host = mt.members.find((x) => x.userId === mt.hostUserId)
  const others = mt.members.filter((x) => x.id !== me.id && x.userId !== mt.hostUserId)

  return (
    <Shell>
      <Back to={`/m/${mt.code}`}>귀가 현황</Back>
      <div className="page-head">
        <h2>내 설정</h2>
        <p>변경 내용은 바로 저장돼요.</p>
      </div>
      <div className="card">
        <div className="card-title"><Icon name="lock" size={20} /><h3>위치 공개 범위</h3></div>
        <div className="choice-list">
          {(Object.entries(PRIVACY) as [Privacy, { t: string; d: string }][]).map(([k, v]) => (
            <label key={k} className="choice">
              <input
                type="radio"
                name="privacy"
                value={k}
                checked={k === me.privacy}
                onChange={() => void setSetting({ privacy: k }).then(() => toast('저장했어요'))}
              />
              <span className="box">
                <span className="t">{v.t}</span>
                <span className="d">{v.d}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          정확한 집 주소는 서비스에 저장되지 않으며, 입력한 목적지는 본인만 정확히 볼 수 있어요.
        </p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <label className="switch">
          <span>
            <span className="t">귀가 중 위치 공유</span>
            <br />
            <span className="small muted">켜면 귀가하는 동안 내 위치를 동행자에게 공유해요. 끄면 귀가 상태만 보여요.</span>
          </span>
          <span className="toggle">
            <input
              type="checkbox"
              checked={!me.shareStopped}
              onChange={(e) =>
                void setSetting({ shareStopped: !e.target.checked }).then(() =>
                  toast(e.target.checked ? '위치 공유를 시작했어요' : '위치 공유를 중단했어요'),
                )
              }
            />
            <i />
          </span>
        </label>
        <label className="switch">
          <span>
            <span className="t">도착 알림</span>
            <br />
            <span className="small muted">도착 완료를 누르면 그룹에 알려요.</span>
          </span>
          <span className="toggle">
            <input
              type="checkbox"
              checked={me.arrivalNotice}
              onChange={(e) => void setSetting({ arrivalNotice: e.target.checked }).then(() => toast('저장했어요'))}
            />
            <i />
          </span>
        </label>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title"><Icon name="bell" size={20} /><h3>안부 확인 대상</h3></div>
        <p className="small muted" style={{ marginBottom: 12 }}>
          예상 도착 시간이 지나도 확인되지 않으면 본인에게 먼저 묻고, 응답이 없을 때 이 사람에게 확인을 요청해요.
        </p>
        <select
          aria-label="안부 확인 대상"
          value={me.buddy}
          onChange={(e) => void setSetting({ buddy: e.target.value }).then(() => toast('저장했어요'))}
        >
          <option value="host">모임 주최자 ({host?.name})</option>
          {others.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
    </Shell>
  )
}
