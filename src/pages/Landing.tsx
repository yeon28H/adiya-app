import { Link } from 'react-router-dom'
import Icon from '@/components/Icon'
import { Avatar } from '@/components/ui'

const FEATURES: [string, string, string, string][] = [
  ['users', '', 'AI 귀가 동행 매칭', '귀가 방향·출발 시간·함께 갈 수 있는 구간을 점수로 계산해 비슷한 사람끼리 묶어요. 왜 묶였는지도 알려드려요.'],
  ['flag', '', '마지막 사람까지 확인', '그룹별 귀가 상태를 한눈에 보고, 마지막 미도착 인원까지 도착 완료로 이어져요.'],
  ['shield', 'g', '목적지 비공개 동행', '정확한 집 주소를 알리지 않아도 돼요. 지역 단위, 상태만 공개 중에서 직접 고르세요.'],
  ['swap', 'o', '귀가 플랜 B', '막차를 놓치거나 환승이 어긋나도 상황을 고르면 대체 이동 방법과 그룹 알림을 한 번에.'],
  ['pin', '', '안전한 분기 지점 추천', '집 앞까지 갈 필요 없어요. 밝고 사람 많은 역·정류장에서 안전하게 헤어질 지점을 추천해요.'],
  ['bell', 'o', '단계별 안부 확인', '도착이 늦어도 바로 위험으로 단정하지 않아요. 본인 → 지정한 사람 순서로 확인해요.'],
]

const PROBLEMS = [
  '귀가 방향이 비슷한 사람이 있어도 서로 몰라서 각자 돌아가요.',
  '일행이 하나둘 내리다 보면 마지막엔 혼자 남는 사람이 생겨요.',
  '위치 공유 앱은 "어디 있는지"만 알려줄 뿐, 동행을 만들어주진 않아요.',
  '집 주소와 실시간 위치를 모두에게 공개하는 건 부담스러워요.',
]

export default function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">
              <Icon name="sparkle" size={16} />
              AI 기반 귀가 동행 서비스
            </span>
            <h1>
              함께 가고,
              <br />
              <em>무사히 도착하고.</em>
            </h1>
            <p className="lead">
              모임이 끝난 뒤 비슷한 방향으로 가는 사람들을 연결하고, 마지막 한 사람이 도착할 때까지 귀가 과정을 함께 챙겨요.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" to="/create">
                <Icon name="plus" />
                모임 만들기
              </Link>
              <Link className="btn btn-soft btn-lg" to="/join">
                <Icon name="key" />
                모임 참여하기
              </Link>
            </div>
            <p className="hero-note">
              <Icon name="clock" size={18} />
              <span>초대 코드를 받았다면 <b>모임 참여하기</b>에서 코드를 입력해 주세요.</span>
            </p>
          </div>
          <div className="phone" aria-hidden="true">
            <div className="bar" />
            <div className="row between">
              <b>금요일 동기 모임</b>
              <span className="badge st-together">동행 중</span>
            </div>
            <p className="small muted" style={{ margin: '4px 0 12px' }}>
              강남역 · 동행 그룹 1 · 함께 이동 약 22분
            </p>
            <div className="mini-member">
              <Avatar name="지우" size={36} />
              <div className="grow">
                <b>지우</b>
                <div className="small muted">송파구 방면</div>
              </div>
              <span className="badge st-arrived">도착</span>
            </div>
            <div className="mini-member">
              <Avatar name="민준" size={36} />
              <div className="grow">
                <b>민준</b>
                <div className="small muted">잠실역</div>
              </div>
              <span className="badge st-together">동행 중</span>
            </div>
            <div className="mini-member">
              <Avatar name="서연" size={36} />
              <div className="grow">
                <b>서연</b>
                <div className="small muted">목적지 비공개</div>
              </div>
              <span className="badge st-check">확인 필요</span>
            </div>
            <div className="progress" style={{ marginTop: 14 }}>
              <i style={{ width: '34%' }} />
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              남은 사람 2명 · 마지막까지 함께 확인해요
            </p>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <div className="kicker">이런 문제, 겪어보셨죠?</div>
            <h2>모임은 끝났지만, 귀가는 아직 끝나지 않았어요</h2>
          </div>
          <div className="problem-list">
            {PROBLEMS.map((p) => (
              <div key={p} className="problem">
                <span className="ico">
                  <Icon name="alert" />
                </span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="kicker">핵심 기능</div>
            <h2>위치 공유가 아니라, 귀가 동행을 관리해요</h2>
            <p>'어디야?'는 모임이 끝난 순간부터 마지막 참여자가 도착할 때까지를 책임지는 서비스예요.</p>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div key={f[2]} className={`card feature ${f[1]}`}>
                <div className="ico">
                  <Icon name={f[0]} size={24} />
                </div>
                <h3>{f[2]}</h3>
                <p>{f[3]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <div className="kicker">이용 방법</div>
            <h2>네 단계면 충분해요</h2>
          </div>
          <div className="flow">
            <div className="card step"><h3>모임 만들기</h3><p>모임 정보를 입력하고 초대 코드를 친구들에게 보내요.</p></div>
            <div className="card step"><h3>귀가 정보 등록</h3><p>목적지와 출발 시간, 이동 수단, 공개 범위를 골라요.</p></div>
            <div className="card step"><h3>동행 매칭</h3><p>비슷한 방향의 사람들이 그룹으로 추천돼요.</p></div>
            <div className="card step"><h3>함께 귀가</h3><p>도착 완료까지 현황을 보고, 마지막 사람까지 확인해요.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="kicker">프라이버시</div>
            <h2>동행에 필요한 만큼만 공개해요</h2>
            <p>정확한 집 주소는 본인만 볼 수 있고, 공개 범위는 언제든 바꾸거나 공유를 중단할 수 있어요.</p>
          </div>
          <div className="level-demo">
            <div className="level"><span className="tag y">1단계</span><div className="v">정확한 위치 공개</div><p className="small muted">잠실역</p></div>
            <div className="level"><span className="tag y">2단계 · 추천</span><div className="v">대략적인 지역만</div><p className="small muted">송파구 방면</p></div>
            <div className="level"><span className="tag y">3단계</span><div className="v">귀가 상태만</div><p className="small muted">목적지 비공개 · 동행 중</p></div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <h2>오늘 모임, 같이 가는 길까지 챙겨요</h2>
            <p>혼자 귀가하는 사람이 없도록. 마지막 한 사람까지.</p>
            <div className="row wrap" style={{ justifyContent: 'center' }}>
              <Link className="btn btn-primary btn-lg" to="/create">모임 만들기</Link>
              <Link className="btn btn-soft btn-lg" to="/join">초대 코드 입력</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
