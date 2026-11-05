/* 프론트엔드: 라우터 + 화면 렌더링 + 이벤트 처리 */
(() => {
  const $app = document.getElementById('app');
  const $nav = document.getElementById('nav');

  /* ---------- 유틸 ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const go = p => { if (location.hash === '#' + p) render(); else location.hash = p; };

  const P = {
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c2 .6 3.2 2.4 3.5 5.2"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3M14 9l2 2"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.5-2.4 3.7M6.6 6.7C4.6 8 3.2 10 2.5 12c1 2.8 4.5 7 9.5 7 1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    bell: '<path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17z"/><path d="M10 21h4"/>',
    swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    home: '<path d="M4 11l8-7 8 7v9H4v-9z"/><path d="M10 20v-6h4v6"/>',
    taxi: '<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3H4zM9 9V6.5h6V9"/>',
    bus: '<rect x="4" y="4" width="16" height="13" rx="3"/><path d="M4 11h16M7 20v-3M17 20v-3M8 14.2v.1M16 14.2v.1"/>',
    walk: '<circle cx="13" cy="5" r="2"/><path d="M12 8.5l-2.5 4 3 2.5V21M12 8.5l3.5 3 2.5.5M9.5 12.5L7 15"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4M9 14.2v.1M15 14.2v.1"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-3.5M4 4v4h4M4 13a8 8 0 0 0 14.5 3.5M20 20v-4h-4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  };
  const icon = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  const LOGO = `<span class="brand-mark" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A2A1B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><path d="M8.8 10.2l2.2 2.2 4.2-4.4"/></svg></span>`;

  const STATUS = {
    unregistered: '정보 미등록', ready: '귀가 준비 중', started: '귀가 시작', together: '동행 중',
    arrived: '목적지 도착', check: '귀가 확인 필요',
  };
  const statusOf = x => (x.registered ? x.status : 'unregistered');
  const badge = x => { const s = statusOf(x); return `<span class="badge st-${s}">${STATUS[s]}</span>`; };

  const AV = ['#FFD966', '#FFC9A0', '#F9E4A8', '#FFDDB8', '#EBD9B4', '#F7C873'];
  const avatar = (name, size = 40) => {
    const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
    return `<span class="avatar" style="background:${AV[h % AV.length]};width:${size}px;height:${size}px">${esc(name.slice(0, 1))}</span>`;
  };

  const fmtClock = ts => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const PRIVACY = {
    exact: { t: '정확한 위치 공개', d: '동행자에게 목적지 역·정류장 이름을 보여줘요. (집 주소는 입력하지 않아요)' },
    area: { t: '대략적인 지역만 공개', d: '"○○구 방면"처럼 지역만 보여줘요. 추천 방식이에요.' },
    status: { t: '귀가 상태만 공개', d: '목적지는 숨기고 귀가 시작·도착 상태만 보여줘요.' },
  };
  const MODES = [['지하철', 'train'], ['버스', 'bus'], ['택시', 'taxi'], ['도보', 'walk']];

  function toast(msg) {
    const w = document.createElement('div'); w.className = 'toast-wrap';
    w.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    document.body.appendChild(w); setTimeout(() => w.remove(), 2400);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch {} t.remove();
    }
    toast('복사했어요');
  }

  /** 다른 참여자에게 보이는 목적지 (위치 공개 범위 적용) */
  function destView(viewer, x) {
    if (!x.registered) return '귀가 정보 미등록';
    if (viewer && viewer.id === x.id) return `${x.dest} (나만 정확히 볼 수 있어요)`;
    const eff = x.shareStopped ? 'status' : x.privacy;
    if (eff === 'exact') return x.dest;
    if (eff === 'area') { const s = findStation(x.dest); return s ? `${s.d} 방면` : '지역 비공개'; }
    return '목적지 비공개';
  }

  /* ---------- 공통 레이아웃 ---------- */
  function renderNav() {
    const s = Store.getSession(); const mt = s && Store.getMeeting(s.code);
    const me = mt && mt.members.find(x => x.id === s.memberId);
    $nav.innerHTML = me
      ? `<a class="who" href="#/m/${mt.code}">${icon('users', 16)}${esc(me.name)} · ${esc(mt.name)}</a><button data-act="leave" aria-label="모임에서 나가기">나가기</button>`
      : `<a class="hide-sm" href="#/join">모임 참여</a><a href="#/create">모임 만들기</a>`;
  }

  const shell = (inner, narrow = true) => `<div class="container ${narrow ? 'narrow' : ''} page">${inner}</div>`;
  const back = (href, label) => `<a class="crumb" href="${href}">${icon('back', 16)}${label}</a>`;
  const stepper = n => {
    const L = ['모임', '귀가 정보', '동행 매칭', '귀가 현황'];
    return `<div class="steps" aria-label="진행 단계">${L.map((l, i) => `<div class="s ${i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''}">${l}</div>`).join('')}</div>`;
  };
  const notFound = () => shell(`<div class="card center stack"><h2>모임을 찾을 수 없어요</h2><p class="muted">초대 코드가 올바른지 확인하거나 새 모임을 만들어 보세요.</p><div class="row wrap" style="justify-content:center"><a class="btn btn-primary" href="#/join">초대 코드 입력</a><a class="btn btn-ghost" href="#/create">모임 만들기</a></div></div>`);

  /* ======================================================
   * 메인 페이지
   * ====================================================== */
  function viewLanding() {
    const feat = [
      ['users', '', 'AI 귀가 동행 매칭', '귀가 방향·출발 시간·함께 갈 수 있는 구간을 점수로 계산해 비슷한 사람끼리 묶어요. 왜 묶였는지도 알려드려요.'],
      ['flag', '', '마지막 사람까지 확인', '그룹별 귀가 상태를 한눈에 보고, 마지막 미도착 인원까지 도착 완료로 이어져요.'],
      ['shield', 'g', '목적지 비공개 동행', '정확한 집 주소를 알리지 않아도 돼요. 지역 단위, 상태만 공개 중에서 직접 고르세요.'],
      ['swap', 'o', '귀가 플랜 B', '막차를 놓치거나 환승이 어긋나도 상황을 고르면 대체 이동 방법과 그룹 알림을 한 번에.'],
      ['pin', '', '안전한 분기 지점 추천', '집 앞까지 갈 필요 없어요. 밝고 사람 많은 역·정류장에서 안전하게 헤어질 지점을 추천해요.'],
      ['bell', 'o', '단계별 안부 확인', '도착이 늦어도 바로 위험으로 단정하지 않아요. 본인 → 지정한 사람 순서로 확인해요.'],
    ];
    const problems = [
      '귀가 방향이 비슷한 사람이 있어도 서로 몰라서 각자 돌아가요.',
      '일행이 하나둘 내리다 보면 마지막엔 혼자 남는 사람이 생겨요.',
      '위치 공유 앱은 "어디 있는지"만 알려줄 뿐, 동행을 만들어주진 않아요.',
      '집 주소와 실시간 위치를 모두에게 공개하는 건 부담스러워요.',
    ];
    return `
    <section class="hero"><div class="container hero-grid">
      <div>
        <span class="eyebrow">${icon('sparkle', 16)}AI 기반 귀가 동행 서비스</span>
        <h1>함께 가고,<br><em>무사히 도착하고.</em></h1>
        <p class="lead">모임이 끝난 뒤 비슷한 방향으로 가는 사람들을 연결하고, 마지막 한 사람이 도착할 때까지 귀가 과정을 함께 챙겨요.</p>
        <div class="hero-cta">
          <a class="btn btn-primary btn-lg" href="#/create">${icon('plus')}모임 만들기</a>
          <a class="btn btn-soft btn-lg" href="#/join">${icon('key')}모임 참여하기</a>
        </div>
        <p class="hero-note">${icon('clock', 18)}처음이라면 <a href="#" data-act="showcase" style="font-weight:700">1분 시연 체험하기</a>로 전체 흐름을 바로 볼 수 있어요.</p>
      </div>
      <div class="phone" aria-hidden="true">
        <div class="bar"></div>
        <div class="row between"><b>금요일 동기 모임</b><span class="badge st-together">동행 중</span></div>
        <p class="small muted" style="margin:4px 0 12px">강남역 · 동행 그룹 1 · 함께 이동 약 22분</p>
        <div class="mini-member">${avatar('지우', 36)}<div class="grow"><b>지우</b><div class="small muted">송파구 방면</div></div><span class="badge st-arrived">도착</span></div>
        <div class="mini-member">${avatar('민준', 36)}<div class="grow"><b>민준</b><div class="small muted">잠실역</div></div><span class="badge st-together">동행 중</span></div>
        <div class="mini-member">${avatar('서연', 36)}<div class="grow"><b>서연</b><div class="small muted">목적지 비공개</div></div><span class="badge st-check">확인 필요</span></div>
        <div class="progress" style="margin-top:14px"><i style="width:34%"></i></div>
        <p class="small muted" style="margin-top:8px">남은 사람 2명 · 마지막까지 함께 확인해요</p>
      </div>
    </div></section>

    <section class="section alt"><div class="container">
      <div class="section-head"><div class="kicker">이런 문제, 겪어보셨죠?</div><h2>모임은 끝났지만, 귀가는 아직 끝나지 않았어요</h2></div>
      <div class="problem-list">${problems.map(p => `<div class="problem"><span class="ico">${icon('alert', 20)}</span><span>${p}</span></div>`).join('')}</div>
    </div></section>

    <section class="section"><div class="container">
      <div class="section-head"><div class="kicker">핵심 기능</div><h2>위치 공유가 아니라, 귀가 동행을 관리해요</h2><p>'어디야?'는 모임이 끝난 순간부터 마지막 참여자가 도착할 때까지를 책임지는 서비스예요.</p></div>
      <div class="feature-grid">${feat.map(f => `<div class="card feature ${f[1]}"><div class="ico">${icon(f[0], 24)}</div><h3>${f[2]}</h3><p>${f[3]}</p></div>`).join('')}</div>
    </div></section>

    <section class="section alt"><div class="container">
      <div class="section-head"><div class="kicker">이용 방법</div><h2>네 단계면 충분해요</h2></div>
      <div class="flow">
        <div class="card step"><h3>모임 만들기</h3><p>모임 정보를 입력하고 초대 코드를 친구들에게 보내요.</p></div>
        <div class="card step"><h3>귀가 정보 등록</h3><p>목적지와 출발 시간, 이동 수단, 공개 범위를 골라요.</p></div>
        <div class="card step"><h3>동행 매칭</h3><p>비슷한 방향의 사람들이 그룹으로 추천돼요.</p></div>
        <div class="card step"><h3>함께 귀가</h3><p>도착 완료까지 현황을 보고, 마지막 사람까지 확인해요.</p></div>
      </div>
    </div></section>

    <section class="section"><div class="container">
      <div class="section-head"><div class="kicker">프라이버시</div><h2>동행에 필요한 만큼만 공개해요</h2><p>정확한 집 주소는 본인만 볼 수 있고, 공개 범위는 언제든 바꾸거나 공유를 중단할 수 있어요.</p></div>
      <div class="level-demo">
        <div class="level"><span class="tag y">1단계</span><div class="v">정확한 위치 공개</div><p class="small muted">잠실역</p></div>
        <div class="level"><span class="tag y">2단계 · 추천</span><div class="v">대략적인 지역만</div><p class="small muted">송파구 방면</p></div>
        <div class="level"><span class="tag y">3단계</span><div class="v">귀가 상태만</div><p class="small muted">목적지 비공개 · 동행 중</p></div>
      </div>
    </div></section>

    <section class="section" style="padding-top:0"><div class="container"><div class="cta-band">
      <h2>오늘 모임, 같이 가는 길까지 챙겨요</h2>
      <p>혼자 귀가하는 사람이 없도록. 마지막 한 사람까지.</p>
      <div class="row wrap" style="justify-content:center"><a class="btn btn-primary btn-lg" href="#/create">모임 만들기</a><a class="btn btn-soft btn-lg" href="#/join">초대 코드 입력</a></div>
    </div></div></section>`;
  }

  /* ======================================================
   * 모임 만들기 / 완료 / 참여
   * ====================================================== */
  function viewCreate() {
    return shell(`
      ${back('#/', '처음으로')}
      <div class="page-head"><h2>모임 만들기</h2><p>모임 정보를 입력하면 친구들에게 보낼 초대 코드가 만들어져요.</p></div>
      <form class="card" data-form="create" novalidate>
        <label class="field"><span class="label">내 이름 (주최자)</span><input type="text" name="host" maxlength="12" placeholder="예: 지은" autocomplete="nickname"><div class="err" data-err="host"></div></label>
        <label class="field"><span class="label">모임 이름</span><input type="text" name="name" maxlength="24" placeholder="예: 금요일 동기 모임"><div class="err" data-err="name"></div></label>
        <label class="field"><span class="label">모임 장소 (가까운 역)</span><input type="text" name="place" list="stations" placeholder="예: 강남역" autocomplete="off"><div class="hint">목록에서 가까운 역을 골라 주세요. 모든 귀가 방향 계산의 출발점이 돼요.</div><div class="err" data-err="place"></div></label>
        <div class="grid2">
          <label class="field"><span class="label">예상 해산 시간</span><input type="time" name="end" value="22:00"><div class="err" data-err="end"></div></label>
          <div class="field"><span class="label">참여 인원</span>
            <div class="stepper"><button type="button" data-act="step" data-d="-1" aria-label="인원 줄이기">−</button><output id="capOut">5</output><button type="button" data-act="step" data-d="1" aria-label="인원 늘리기">+</button><input type="hidden" name="cap" value="5"></div>
            <div class="hint">2명이면 2인 동행, 3명 이상이면 그룹 매칭으로 진행돼요.</div>
          </div>
        </div>
        <button class="btn btn-primary btn-lg btn-block" style="margin-top:26px" type="submit">초대 코드 만들기</button>
      </form>`);
  }

  function viewCreated(code) {
    const mt = Store.getMeeting(code); if (!mt) return notFound();
    const link = `${location.origin}${location.pathname}#/join/${mt.code}`;
    const pairMode = mt.capacity === 2;
    return shell(`
      <div class="card center stack" style="padding:32px 24px">
        <div class="medal-sm" style="width:56px;height:56px;border-radius:50%;background:var(--green-100);color:var(--green-700);display:grid;place-items:center;margin:0 auto">${icon('check', 30)}</div>
        <h2>모임이 만들어졌어요!</h2>
        <p class="muted">아래 초대 코드를 친구들에게 보내 주세요.<br><b>${esc(mt.name)}</b> · ${esc(mt.place)} · ${esc(mt.endTime)} 해산 · 최대 ${mt.capacity}명 ${pairMode ? '(2인 동행)' : ''}</p>
        <div class="code-box"><div class="small muted" style="font-weight:700">초대 코드</div><div class="code" id="codeText">${Store.prettyCode(mt.code)}</div></div>
        <div class="row wrap" style="justify-content:center">
          <button class="btn btn-soft" data-act="copy" data-text="${Store.prettyCode(mt.code)}">${icon('copy', 18)}코드 복사</button>
          <button class="btn btn-ghost" data-act="copy" data-text="${esc(link)}">${icon('copy', 18)}초대 링크 복사</button>
        </div>
        <hr class="divider">
        <a class="btn btn-primary btn-lg btn-block" href="#/m/${mt.code}/register">내 귀가 정보 등록하기 ${icon('arrow', 18)}</a>
        <a class="btn btn-ghost btn-block" href="#/m/${mt.code}">모임 현황 보기</a>
        <p class="small muted">발표·시연 중이라면 <a href="#" data-act="addDemo" data-code="${mt.code}" style="font-weight:700">시연용 친구 불러오기</a>로 참여자가 등록된 상태를 만들 수 있어요.</p>
      </div>`);
  }

  function viewJoin(prefill = '') {
    const s = Store.getSession(); const sm = s && Store.getMeeting(s.code);
    return shell(`
      ${back('#/', '처음으로')}
      <div class="page-head"><h2>모임 참여하기</h2><p>친구에게 받은 초대 코드와 내 이름을 입력해 주세요.</p></div>
      <form class="card" data-form="join" novalidate>
        <label class="field"><span class="label">초대 코드</span><input type="text" name="code" value="${esc(prefill ? Store.prettyCode(Store.normCode(prefill)) : '')}" placeholder="예: AB3-K7Q" maxlength="7" autocomplete="off" style="text-transform:uppercase;letter-spacing:.12em;font-weight:700"><div class="err" data-err="code"></div></label>
        <label class="field"><span class="label">내 이름</span><input type="text" name="name" maxlength="12" placeholder="예: 민준" autocomplete="nickname"><div class="hint">같은 이름으로 다시 입력하면 이전에 등록한 내 정보로 이어서 들어가요.</div><div class="err" data-err="name"></div></label>
        <button class="btn btn-primary btn-lg btn-block" style="margin-top:26px" type="submit">모임 들어가기</button>
      </form>
      ${sm ? `<p class="center small muted" style="margin-top:18px">진행 중인 모임: <a href="#/m/${sm.code}" style="font-weight:700">${esc(sm.name)}</a></p>` : ''}`);
  }

  /* ======================================================
   * 귀가 정보 등록
   * ====================================================== */
  function guard(code) {
    const mt = Store.getMeeting(code);
    if (!mt) return { out: notFound() };
    const me = Store.getMe(code);
    if (!me) { setTimeout(() => go(`/join/${mt.code}`), 0); return { out: '' }; }
    return { mt, me };
  }

  function viewRegister(code) {
    const g = guard(code); if (g.out !== undefined) return g.out;
    const { mt, me } = g;
    const defTime = me.departTime || Matching.fmtTime(Matching.toMin(mt.endTime) + 5);
    const mode = me.mode || '지하철';
    const priv = me.privacy || 'area';
    return shell(`
      ${back(`#/m/${mt.code}`, esc(mt.name))}
      ${stepper(2)}
      <div class="page-head"><h2>${me.registered ? '귀가 정보 수정' : '귀가 정보 등록'}</h2><p>비슷한 방향으로 가는 사람을 찾는 데 사용돼요. 집 주소 대신 <b>가까운 역·정류장</b>만 입력하면 충분해요.</p></div>
      <form class="card" data-form="register" data-code="${mt.code}" novalidate>
        <label class="field"><span class="label">현재 출발 위치</span><input type="text" name="origin" list="stations" value="${esc(me.origin || mt.place)}" autocomplete="off"><div class="err" data-err="origin"></div></label>
        <label class="field"><span class="label">귀가 목적지 (가까운 역)</span><input type="text" name="dest" list="stations" value="${esc(me.dest)}" placeholder="예: 잠실역" autocomplete="off"><div class="hint">${icon('lock', 13)} 정확한 목적지는 본인만 볼 수 있어요. 다른 사람에게는 아래 공개 범위만큼만 보여요.</div><div class="err" data-err="dest"></div></label>
        <label class="field"><span class="label">예상 출발 시간</span><input type="time" name="time" value="${esc(defTime)}"><div class="hint">모임 해산 예정 시간은 ${esc(mt.endTime)}이에요.</div><div class="err" data-err="time"></div></label>
        <div class="field"><span class="label">이용 예정 교통수단</span>
          <div class="choice-grid">${MODES.map(([m, ic]) => `<label class="choice"><input type="radio" name="mode" value="${m}" ${m === mode ? 'checked' : ''}><span class="box">${icon(ic, 18)}${m}</span></label>`).join('')}</div>
        </div>
        <div class="field"><span class="label">위치 공개 범위</span>
          <div class="choice-list">${Object.entries(PRIVACY).map(([k, v]) => `<label class="choice"><input type="radio" name="privacy" value="${k}" ${k === priv ? 'checked' : ''}><span class="box"><span class="t">${v.t}</span><span class="d">${v.d}</span></span></label>`).join('')}</div>
        </div>
        <button class="btn btn-primary btn-lg btn-block" style="margin-top:26px" type="submit">귀가 정보 ${me.registered ? '저장' : '등록'}하기</button>
      </form>`);
  }

  /* ======================================================
   * 매칭 결과
   * ====================================================== */
  function viewMatch(code) {
    const g0 = guard(code); if (g0.out !== undefined) return g0.out;
    let { mt, me } = g0;
    if (!me.registered) { setTimeout(() => go(`/m/${mt.code}/register`), 0); return ''; }
    const regCount = mt.members.filter(x => x.registered).length;
    if (!mt.groups || mt.matchStale) { mt = Store.runMatch(mt.code); me = Store.getMe(mt.code); }

    const byId = id => mt.members.find(x => x.id === id);
    const mine = Store.groupOf(mt, me.id);
    const started = mt.members.some(x => x.status !== 'ready');

    if (regCount < 2) {
      return shell(`${back(`#/m/${mt.code}`, esc(mt.name))}${stepper(3)}
        <div class="card center stack"><h3>함께 귀가할 참여자를 기다리고 있어요</h3><p class="muted">귀가 정보를 등록한 참여자가 2명 이상이어야 매칭할 수 있어요. 초대 코드 <b>${Store.prettyCode(mt.code)}</b>를 친구에게 보내 주세요.</p>
        <button class="btn btn-soft" data-act="addDemo" data-code="${mt.code}" data-then="match">시연용 친구 불러오기</button>
        <button class="btn btn-ghost" data-act="copy" data-text="${Store.prettyCode(mt.code)}">${icon('copy', 18)}초대 코드 복사</button></div>`);
    }

    const groupCard = g => {
      const isMine = mine && mine.id === g.id;
      const gm = g.memberIds.map(byId);
      const decided = me.groupDecision;
      return `<article class="card group-card ${isMine ? 'mine' : ''}">
        <div class="group-head">
          <div><div class="row wrap"><h3>동행 그룹 ${g.id.replace('g', '')}</h3>${isMine ? '<span class="tag y">내 추천 그룹</span>' : ''}${g.pairMode ? '<span class="tag">2인 동행</span>' : ''}</div>
            <div class="small muted">${gm.length}명이 함께 귀가해요</div></div>
          <div class="score"><b>${g.score}</b><span>매칭 점수</span></div>
        </div>
        <div class="meta">
          <span class="chip">${icon('users', 16)}${gm.length}명</span>
          <span class="chip">${icon('route', 16)}함께 이동 약 ${g.sharedMin}분</span>
          <span class="chip">${icon('clock', 16)}출발 시간 차 ${g.spread}분</span>
          <span class="chip">${icon('pin', 16)}추천 분기 지점 ${esc(g.splitStation)}역</span>
        </div>
        <ul class="reasons">${g.reasons.map(r => `<li>${icon('check', 16)}<span>${esc(r)}</span></li>`).join('')}</ul>
        <hr class="divider">
        ${gm.map(x => `<div class="member">${avatar(x.name)}<div class="grow"><div class="nm">${esc(x.name)}${x.id === me.id ? ' <span class="tag y">나</span>' : ''}${x.id === mt.hostId ? ' <span class="tag">주최자</span>' : ''}</div><div class="sub">${esc(destView(me, x))} · ${esc(x.departTime)} 출발 · ${esc(x.mode)}</div></div></div>`).join('')}
        ${isMine ? `<div class="row wrap" style="margin-top:14px">
          ${decided === 'joined' ? `<span class="badge st-arrived plain">${icon('check', 14)} 이 그룹에 참여 중</span><button class="btn btn-ghost btn-sm" data-act="decide" data-join="0">혼자 갈래요</button>`
            : decided === 'declined' ? `<span class="badge st-ready plain">혼자 귀가하기로 했어요</span><button class="btn btn-primary btn-sm" data-act="decide" data-join="1">그룹 참여하기</button>`
              : `<button class="btn btn-primary" data-act="decide" data-join="1">${icon('users', 18)}그룹 참여하기</button><button class="btn btn-ghost" data-act="decide" data-join="0">혼자 갈래요</button>`}
        </div>` : ''}
      </article>`;
    };

    const ordered = [...mt.groups].sort((a, b) => (mine && b.id === mine.id) - (mine && a.id === mine.id));
    const solo = mt.soloIds.map(byId);
    const iAmSolo = solo.some(x => x.id === me.id);

    return shell(`
      ${back(`#/m/${mt.code}`, esc(mt.name))}
      ${stepper(3)}
      <div class="page-head row between wrap"><div><h2>동행 매칭 결과</h2><p>방향·출발 시간·함께 이동할 수 있는 구간을 점수로 계산해 추천했어요.</p></div></div>
      ${started ? `<div class="banner warn" style="margin-bottom:16px"><span class="ico">${icon('alert', 20)}</span><div class="small">이미 귀가를 시작한 참여자가 있어요. 다시 매칭하면 그룹이 바뀔 수 있어요.</div></div>` : ''}
      ${iAmSolo ? `<div class="card orange" style="margin-bottom:16px"><div class="card-title">${icon('alert', 22)}<h3>비슷한 방향의 동행을 찾지 못했어요</h3></div><p class="small">출발 시간이나 이동 수단을 조정하면 매칭될 수도 있어요. 혼자 귀가하더라도 도착 완료와 안부 확인으로 챙겨드릴게요.</p><div class="row wrap" style="margin-top:12px"><a class="btn btn-soft btn-sm" href="#/m/${mt.code}/register">귀가 정보 수정하기</a></div></div>` : ''}
      ${ordered.length ? ordered.map(groupCard).join('') : `<div class="card empty">추천할 수 있는 동행 그룹이 아직 없어요.</div>`}
      ${solo.length ? `<article class="card cream group-card" style="margin-top:14px"><div class="card-title">${icon('alert', 20)}<h3>혼자 귀가하게 되는 참여자</h3><span class="tag o">${solo.length}명</span></div>
        ${solo.map(x => `<div class="member">${avatar(x.name)}<div class="grow"><div class="nm">${esc(x.name)}${x.id === me.id ? ' <span class="tag y">나</span>' : ''}</div><div class="sub">${esc(destView(me, x))} · ${esc(x.departTime)} 출발</div></div></div>`).join('')}</article>` : ''}
      <div class="row wrap" style="margin-top:20px">
        <a class="btn btn-primary btn-lg grow" href="#/m/${mt.code}">귀가 현황 보러 가기 ${icon('arrow', 18)}</a>
        <button class="btn btn-ghost" data-act="rematch">${icon('refresh', 18)}다시 매칭</button>
      </div>`);
  }

  /* ======================================================
   * 귀가 현황 대시보드
   * ====================================================== */
  /** 이동 중인 참여자의 도착 예정 (실시간 위치 대신 ETA만 공유) */
  function etaText(x) {
    if (!['started', 'together'].includes(x.status) || !x.etaAt) return '';
    const left = Math.round((x.etaAt - Date.now()) / 60000);
    return left > 0 ? ` · 도착까지 약 ${left}분` : ' · 도착 예정 시간 경과';
  }

  const LEVEL = {
    ok: ['st-arrived', '여유 있음'], warn: ['st-check', '막차 임박'], danger: ['st-check', '막차 놓칠 수 있음'],
  };

  function lastTrainCard(me) {
    if (!me.registered) return '';
    const info = Matching.lastTrainInfo(me);
    if (!info) return `<div class="card"><div class="card-title">${icon('clock', 20)}<h3>막차·출발 권장 시간</h3></div><p class="small muted">${esc(me.mode)}은(는) 막차 제한이 없어요. 이동 시간은 약 ${Matching.travelMin(me.origin, me.dest)}분으로 예상해요.</p></div>`;
    const [cls, label] = LEVEL[info.level];
    const msg = info.level === 'danger' ? `출발 예정(${esc(me.departTime)})이 막차보다 늦어요. 지금 출발하거나 플랜 B를 확인하세요.`
      : info.level === 'warn' ? `막차까지 ${info.slack}분 남았어요. 서두르는 걸 권장해요.` : `막차까지 ${info.slack}분 여유가 있어요.`;
    return `<div class="card ${info.level === 'ok' ? '' : 'orange'}">
      <div class="row between"><div class="card-title" style="margin:0">${icon('clock', 20)}<h3>막차·출발 권장 시간</h3></div><span class="badge ${cls}">${label}</span></div>
      <div class="grid2" style="margin-top:14px;gap:10px"><div class="stat"><div class="n" style="font-size:22px">${info.last}</div><div class="l">${esc(me.mode)} 막차 (시연 기준)</div></div><div class="stat"><div class="n" style="font-size:22px">${info.recommended}</div><div class="l">출발 권장 시간</div></div></div>
      <p class="small" style="margin-top:12px">${msg} 예상 이동 시간은 약 ${info.travel}분이에요.</p>
      ${info.level !== 'ok' && me.status === 'ready' ? `<button class="btn btn-warn btn-sm btn-block" style="margin-top:10px" data-act="applyRec">${icon('clock', 16)}출발 시간을 ${info.recommended}로 변경</button>` : ''}
      <p class="small muted" style="margin-top:8px">※ 실제 서비스에서는 대중교통 API로 막차 시간을 가져와요.</p></div>`;
  }

  function memberRow(mt, me, x) {
    const showAdvance = x.demo && x.status !== 'arrived';
    const canCheck = me.id === mt.hostId && x.id !== me.id && ['started', 'together'].includes(x.status);
    const extra = x.planB ? `<span class="tag o">플랜 B · ${esc(x.planB.title)}</span>` : '';
    return `<div class="member">${avatar(x.name)}
      <div class="grow"><div class="nm">${esc(x.name)}${x.id === me.id ? ' <span class="tag y">나</span>' : ''}${x.id === mt.hostId ? ' <span class="tag">주최자</span>' : ''}${x.demo ? ' <span class="tag">시연</span>' : ''}${x.shareStopped ? ' <span class="tag o">공유 중단</span>' : ''}${x.groupDecision === 'declined' ? ' <span class="tag">혼자 귀가</span>' : ''}${extra}</div>
        <div class="sub">${esc(destView(me, x))}${x.registered ? ` · ${esc(x.departTime)} 출발` : ''}${etaText(x)}</div></div>
      <div style="text-align:right;display:grid;gap:6px;justify-items:end">${badge(x)}
        ${showAdvance ? `<button class="btn btn-ghost btn-sm" data-act="advDemo" data-id="${x.id}">시연: ${x.status === 'ready' ? '귀가 시작' : '도착 처리'}</button>` : ''}
        ${canCheck ? `<button class="btn btn-soft btn-sm" data-act="reqCheck" data-id="${x.id}">안부 확인 요청</button>` : ''}</div></div>`;
  }

  function viewDashboard(code) {
    const g0 = guard(code); if (g0.out !== undefined) return g0.out;
    const { mt, me } = g0;
    const byId = id => mt.members.find(x => x.id === id);
    const regd = mt.members.filter(x => x.registered);
    const unreg = mt.members.filter(x => !x.registered);
    const arrived = regd.filter(x => x.status === 'arrived');
    const onWay = regd.filter(x => ['started', 'together', 'check'].includes(x.status));
    const before = mt.members.length - arrived.length - onWay.length;
    const needCheck = regd.filter(x => x.status === 'check');
    const allDone = mt.members.length >= 2 && mt.members.every(x => x.registered && x.status === 'arrived');
    const soloList = mt.groups ? regd.filter(x => !Store.groupOf(mt, x.id) || x.groupDecision === 'declined') : null;
    const isHost = me.id === mt.hostId;
    const mine = Store.groupOf(mt, me.id);
    const pct = mt.members.length ? Math.round((arrived.length / mt.members.length) * 100) : 0;
    const step = !me.registered ? 2 : (!mt.groups || (mine && !me.groupDecision)) ? 3 : 4;

    /* 내 카드 */
    let mineCard;
    if (!me.registered) {
      mineCard = `<div class="card yellow stack"><div class="card-title" style="margin:0">${icon('route', 24)}<h3>귀가 정보를 등록해 주세요</h3></div><p class="small">목적지와 출발 시간을 알려주시면 비슷한 방향의 동행을 찾아드려요.</p><a class="btn btn-primary btn-lg" href="#/m/${mt.code}/register">귀가 정보 등록 ${icon('arrow', 18)}</a></div>`;
    } else if (me.status === 'arrived') {
      mineCard = `<div class="card green stack"><div class="card-title" style="margin:0">${icon('home', 24)}<h3>도착 완료! 오늘도 수고했어요</h3></div><p class="small">${me.arrivedAt ? fmtClock(me.arrivedAt) + '에 ' : ''}도착을 확인했어요. ${allDone ? '' : '아직 도착하지 않은 사람이 있어요. 끝까지 함께 확인해요.'}</p></div>`;
    } else if (me.status === 'check') {
      mineCard = `<div class="card orange stack"><div class="card-title" style="margin:0">${icon('bell', 24)}<h3>잘 가고 계신가요?</h3></div><p class="small">도착 확인이 필요하다는 요청이 왔어요. 괜찮다면 아래 버튼을 눌러 알려주세요.</p><div class="row wrap"><button class="btn btn-ok btn-lg" data-act="respond">${icon('check', 18)}잘 가고 있어요</button><button class="btn btn-soft btn-lg" data-act="arrive">도착했어요</button></div></div>`;
    } else if (me.status === 'ready') {
      const needMatch = !mt.groups || mt.matchStale || (mine && !me.groupDecision);
      mineCard = `<div class="card yellow stack"><div class="card-title" style="margin:0">${icon('route', 24)}<h3>${needMatch ? '동행 그룹부터 확인해 볼까요?' : '귀가 준비가 끝났어요'}</h3></div>
        <p class="small">${mine && me.groupDecision !== 'declined' ? `동행 그룹 ${mine.id.replace('g', '')}에서 ${mine.splitStation}역까지 함께 이동할 수 있어요.` : '출발할 준비가 되면 귀가 시작을 눌러 주세요.'}</p>
        <div class="row wrap">${needMatch ? `<a class="btn btn-primary btn-lg" href="#/m/${mt.code}/match">${mt.groups && !mt.matchStale ? '내 동행 그룹 확인' : '동행 매칭 보기'} ${icon('arrow', 18)}</a><button class="btn btn-ghost" data-act="start">그냥 귀가 시작</button>` : `<button class="btn btn-primary btn-lg" data-act="start">${icon('flag', 18)}귀가 시작</button>`}</div></div>`;
    } else {
      mineCard = `<div class="card yellow stack"><div class="row between wrap"><div class="card-title" style="margin:0">${icon('route', 24)}<h3>${STATUS[me.status]}</h3></div>${badge(me)}</div>
        <p class="small">${mine && me.status === 'together' ? `${mine.splitStation}역 부근까지 함께 이동하고, 안전한 곳에서 헤어지는 걸 추천해요.` : '목적지에 도착하면 도착 완료를 눌러 알려주세요.'}</p>
        <div class="row wrap"><button class="btn btn-ok btn-lg" data-act="arrive">${icon('check', 18)}도착 완료</button><a class="btn btn-soft btn-lg" href="#/m/${mt.code}/planb">${icon('swap', 18)}귀가 플랜 B</a></div>
        <div class="row wrap"><span class="tag">시연</span><button class="btn btn-ghost btn-sm" data-act="simNear">목적지 근처 자동 감지</button><button class="btn btn-ghost btn-sm" data-act="simOverdue">예상 도착 시간 지난 상황</button></div></div>`;
    }

    /* 단계별 안부 확인 · 자동 도착 감지 배너 */
    const moving = ['started', 'together'].includes(me.status);
    const banners = [];
    if (moving && me.nearDest) banners.push(`<div class="banner warn" style="background:var(--yellow-100);border-color:var(--yellow-300)"><span class="ico" style="color:#9A6B00">${icon('pin', 22)}</span><div class="grow"><b>목적지 근처에 도착한 것 같아요</b><div class="small">위치를 자동으로 감지했어요. 도착 완료로 처리할까요?</div><div class="row wrap" style="margin-top:10px"><button class="btn btn-ok btn-sm" data-act="nearYes">네, 도착했어요</button><button class="btn btn-ghost btn-sm" data-act="nearNo">아직이에요</button></div></div></div>`);
    if (moving && me.checkStage === 1) banners.push(`<div class="banner warn"><span class="ico">${icon('bell', 22)}</span><div class="grow"><b>예상 도착 시간이 지났어요. 괜찮으신가요?</b><div class="small">응답이 없으면 곧 ${esc(Store.buddyOf(mt, me).name)}님에게 안부 확인을 요청해요. 도착이 조금 늦는 것일 수도 있으니 걱정하지 마세요.</div><div class="row wrap" style="margin-top:10px"><button class="btn btn-ok btn-sm" data-act="respond">잘 가고 있어요</button><button class="btn btn-soft btn-sm" data-act="arrive">도착했어요</button></div></div></div>`);
    mt.members.filter(x => x.status === 'check' && x.id !== me.id && Store.buddyOf(mt, x).id === me.id).forEach(x =>
      banners.push(`<div class="banner warn"><span class="ico">${icon('bell', 22)}</span><div class="grow"><b>${esc(x.name)}님의 안부를 확인해 주세요</b><div class="small">${esc(x.name)}님이 확인 알림에 응답하지 않았어요. 연락해 보고 결과를 알려 주세요.</div><div class="row wrap" style="margin-top:10px"><button class="btn btn-ok btn-sm" data-act="buddyOk" data-id="${x.id}">연락했어요, 잘 가고 있대요</button><button class="btn btn-soft btn-sm" data-act="buddyArrived" data-id="${x.id}">도착했대요</button></div></div></div>`));

    /* 그룹 카드 */
    const groupsHtml = (mt.groups || []).map(gr => {
      const gm = gr.memberIds.map(byId).filter(Boolean);
      const left = gm.filter(x => x.status !== 'arrived');
      const done = left.length === 0;
      const someArrived = left.length < gm.length;
      const isMine = mine && mine.id === gr.id;
      return `<article class="card group-card ${isMine ? 'mine' : ''}">
        <div class="group-head"><div><div class="row wrap"><h3>동행 그룹 ${gr.id.replace('g', '')}</h3>${isMine ? '<span class="tag y">내 그룹</span>' : ''}</div>
          <div class="small muted">${gm.length}명 · 함께 이동 약 ${gr.sharedMin}분 · 분기 지점 ${esc(gr.splitStation)}역</div></div>
          ${done ? '<span class="badge st-arrived">그룹 귀가 완료</span>' : `<span class="badge st-started plain">${gm.length - left.length}/${gm.length} 도착</span>`}</div>
        <div class="progress" aria-hidden="true"><i style="width:${Math.round(((gm.length - left.length) / gm.length) * 100)}%"></i></div>
        <div style="margin-top:8px">${gm.map(x => memberRow(mt, me, x)).join('')}</div>
        ${!done && someArrived ? `<p class="small" style="margin-top:8px;color:var(--orange-600);font-weight:700">${icon('flag', 14)} 마지막 미도착: ${left.map(x => esc(x.name)).join(', ')}</p>` : ''}
      </article>`;
    }).join('');

    const soloHtml = soloList && soloList.length ? `<article class="card cream group-card"><div class="card-title">${icon('alert', 20)}<h3>혼자 귀가하는 참여자</h3><span class="tag o">${soloList.length}명</span></div>${soloList.map(x => memberRow(mt, me, x)).join('')}</article>` : '';
    const unregHtml = unreg.length ? `<article class="card cream group-card"><div class="card-title">${icon('clock', 20)}<h3>아직 귀가 정보를 등록하지 않았어요</h3><span class="tag">${unreg.length}명</span></div>${unreg.map(x => memberRow(mt, me, x)).join('')}</article>` : '';
    const noGroups = !mt.groups ? `<div class="card empty"><p>아직 동행 매칭 전이에요.</p><a class="btn btn-primary" style="margin-top:12px" href="#/m/${mt.code}/match">${icon('users', 18)}동행 매칭하기</a></div>` : '';

    const notices = mt.notices.filter(n => !n.groupId || (mine && n.groupId === mine.id) || isHost).slice(0, 8);

    return shell(`
      <div class="page-head row between wrap">
        <div><div class="muted small" style="font-weight:700">${step === 4 ? '귀가 현황' : '모임 홈'}</div><h2>${esc(mt.name)}</h2>
          <div class="meta"><span class="chip">${icon('pin', 16)}${esc(mt.place)}</span><span class="chip">${icon('clock', 16)}${esc(mt.endTime)} 해산</span><span class="chip">${icon('users', 16)}${mt.members.length}/${mt.capacity}명</span><span class="chip">${icon('key', 16)}${Store.prettyCode(mt.code)}</span></div></div>
        <button class="btn btn-soft btn-sm" data-act="copy" data-text="${Store.prettyCode(mt.code)}">${icon('copy', 16)}초대 코드 복사</button>
      </div>
      ${allDone ? `<div class="card green done" style="margin-bottom:20px"><div class="medal">${icon('check', 40)}</div><h2>모두 무사히 도착했어요 🎉</h2><p class="muted" style="margin-top:8px">${mt.members.length}명 전원이 귀가를 마쳤어요.<br>마지막 도착: <b>${esc(mt.members.slice().sort((a, b) => b.arrivedAt - a.arrivedAt)[0].name)}</b>님 · ${fmtClock(Math.max(...mt.members.map(x => x.arrivedAt || 0)))}</p>
        ${isHost ? `<button class="btn btn-ghost btn-sm" style="margin-top:16px" data-act="reset">귀가 상태 초기화 (시연용)</button>` : ''}</div>` : ''}
      ${mt.matchStale ? `<div class="banner warn" style="margin-bottom:16px"><span class="ico">${icon('refresh', 20)}</span><div class="grow small">새로 등록·수정된 귀가 정보가 있어요. 다시 매칭하면 그룹이 갱신돼요.</div><a class="btn btn-soft btn-sm" href="#/m/${mt.code}/match">다시 매칭</a></div>` : ''}
      ${banners.length ? `<div class="stack" style="margin-bottom:20px">${banners.join('')}</div>` : ''}
      <div class="layout-2">
        <div class="stack">
          ${mineCard}
          ${noGroups}${groupsHtml}${soloHtml}${unregHtml}
        </div>
        <aside class="side">
          <div class="card">
            <div class="row between"><h3>전체 귀가 현황</h3><b>${arrived.length}/${mt.members.length}</b></div>
            <div class="progress" style="margin:12px 0 16px" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
            <div class="stats" style="grid-template-columns:1fr 1fr">
              <div class="stat"><div class="n">${before}</div><div class="l">아직 귀가 전</div></div>
              <div class="stat y"><div class="n">${onWay.length}</div><div class="l">귀가 중</div></div>
              <div class="stat ok"><div class="n">${arrived.length}</div><div class="l">도착 완료</div></div>
              <div class="stat warn"><div class="n">${soloList ? soloList.length : '–'}</div><div class="l">혼자 귀가</div></div>
            </div>
            ${needCheck.length ? `<p class="small" style="margin-top:12px;color:var(--orange-600);font-weight:700">${icon('bell', 14)} 확인 필요: ${needCheck.map(x => esc(x.name)).join(', ')}</p>` : ''}
            ${unreg.length ? `<p class="small muted" style="margin-top:10px">정보 미등록 ${unreg.length}명</p>` : ''}
          </div>
          ${lastTrainCard(me)}
          <div class="card">
            <div class="card-title">${icon('bell', 20)}<h3>그룹 알림</h3></div>
            ${notices.length ? notices.map(n => `<div class="notice ${n.kind}"><span class="dot"></span><div><span>${esc(n.text)}</span><time>${fmtClock(n.ts)}</time></div></div>`).join('') : '<p class="small muted">아직 알림이 없어요.</p>'}
          </div>
          <div class="card">
            <div class="card-title">${icon('shield', 20)}<h3>내 설정</h3></div>
            <div class="stack">
              <a class="btn btn-ghost btn-block" href="#/m/${mt.code}/settings">위치 공개·도착 알림 설정</a>
              <a class="btn btn-soft btn-block" href="#/m/${mt.code}/planb">귀가 플랜 B</a>
              ${me.registered ? `<a class="btn btn-ghost btn-block" href="#/m/${mt.code}/register">귀가 정보 수정</a>` : ''}
            </div>
          </div>
          ${isHost ? `<div class="card cream"><div class="card-title">${icon('flag', 20)}<h3>해산 매니저</h3><span class="tag y">주최자</span></div>
            <p class="small muted" style="margin-bottom:12px">참여자 현황을 확인하고 마지막 한 사람까지 챙겨요.</p>
            ${(() => {
              const risky = regd.filter(x => x.status === 'ready').map(x => ({ x, i: Matching.lastTrainInfo(x) })).filter(o => o.i && o.i.level !== 'ok');
              const lastLeft = regd.filter(x => x.status !== 'arrived' && arrived.length > 0);
              const row = (label, names, cls = '') => `<div class="row between" style="padding:9px 0;border-top:1px solid var(--line);align-items:flex-start"><span class="small" style="font-weight:700">${label}</span><span class="small ${cls}" style="text-align:right">${names || '<span class="muted">없음</span>'}</span></div>`;
              return `<div style="margin-bottom:14px">
                ${row('귀가 시작', onWay.map(x => esc(x.name)).join(', '))}
                ${row('도착 완료', arrived.map(x => esc(x.name)).join(', '))}
                ${row('혼자 귀가', soloList ? soloList.map(x => esc(x.name)).join(', ') : '<span class="muted">매칭 전</span>')}
                ${row('도착 확인 필요', needCheck.map(x => esc(x.name)).join(', '), needCheck.length ? 'orange-t' : '')}
                ${row('막차 위험', risky.map(o => `${esc(o.x.name)}(${o.i.slack < 0 ? '놓침' : o.i.slack + '분'})`).join(', '), risky.length ? 'orange-t' : '')}
                ${row('마지막 미도착', arrived.length && lastLeft.length ? lastLeft.map(x => esc(x.name)).join(', ') : '', lastLeft.length && arrived.length ? 'orange-t' : '')}
                ${row('정보 미등록', unreg.map(x => esc(x.name)).join(', '))}</div>`;
            })()}
            <div class="stack">
              ${unreg.length ? `<button class="btn btn-warn btn-block" data-act="nudge">${icon('bell', 18)}미등록 ${unreg.length}명에게 등록 요청</button>` : ''}
              <button class="btn btn-soft btn-block" data-act="addDemo" data-code="${mt.code}">시연용 친구 불러오기</button>
              <button class="btn btn-ghost btn-block" data-act="demoAll">시연: 나 빼고 모두 도착 처리</button>
              <button class="btn btn-ghost btn-block" data-act="reset">귀가 상태 초기화</button>
            </div></div>` : ''}
        </aside>
      </div>`, false);
  }

  /* ======================================================
   * 설정 (위치 공개 / 위치 공유 중단 / 도착 알림 / 안부 확인 대상)
   * ====================================================== */
  function viewSettings(code) {
    const g0 = guard(code); if (g0.out !== undefined) return g0.out;
    const { mt, me } = g0;
    const others = mt.members.filter(x => x.id !== me.id);
    return shell(`
      ${back(`#/m/${mt.code}`, '귀가 현황')}
      <div class="page-head"><h2>내 설정</h2><p>변경 내용은 바로 저장돼요.</p></div>
      <div class="card" data-live="settings">
        <div class="card-title">${icon('lock', 20)}<h3>위치 공개 범위</h3></div>
        <div class="choice-list">${Object.entries(PRIVACY).map(([k, v]) => `<label class="choice"><input type="radio" name="privacy" value="${k}" ${k === me.privacy ? 'checked' : ''}><span class="box"><span class="t">${v.t}</span><span class="d">${v.d}</span></span></label>`).join('')}</div>
        <p class="small muted" style="margin-top:12px">정확한 집 주소는 서비스에 저장되지 않으며, 입력한 목적지는 본인만 정확히 볼 수 있어요.</p>
      </div>
      <div class="card" style="margin-top:16px" data-live="settings">
        <label class="switch"><span><span class="t">귀가 도중 위치 공유 중단</span><br><span class="small muted">켜면 동행자에게 귀가 상태만 보여요.</span></span><span class="toggle"><input type="checkbox" name="shareStopped" ${me.shareStopped ? 'checked' : ''}><i></i></span></label>
        <label class="switch"><span><span class="t">도착 알림</span><br><span class="small muted">도착 완료를 누르면 그룹에 알려요.</span></span><span class="toggle"><input type="checkbox" name="arrivalNotice" ${me.arrivalNotice ? 'checked' : ''}><i></i></span></label>
      </div>
      <div class="card" style="margin-top:16px" data-live="settings">
        <div class="card-title">${icon('bell', 20)}<h3>안부 확인 대상</h3></div>
        <p class="small muted" style="margin-bottom:12px">예상 도착 시간이 지나도 확인되지 않으면 본인에게 먼저 묻고, 응답이 없을 때 이 사람에게 확인을 요청해요.</p>
        <select name="buddy" aria-label="안부 확인 대상">
          <option value="host" ${me.buddy === 'host' ? 'selected' : ''}>모임 주최자 (${esc(mt.members.find(x => x.id === mt.hostId).name)})</option>
          ${others.filter(x => x.id !== mt.hostId).map(x => `<option value="${x.id}" ${me.buddy === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
        </select>
      </div>`);
  }

  /* ======================================================
   * 귀가 플랜 B
   * ====================================================== */
  const SITUATIONS = [
    ['lastTrain', '막차를 놓쳤어요', 'train'], ['busEnd', '버스 운행이 끝났어요', 'bus'], ['transfer', '환승을 놓쳤어요', 'swap'],
    ['buddyLeft', '동행자가 중간에 이탈했어요', 'users'], ['late', '출발이 늦어졌어요', 'clock'],
  ];
  let planSit = null;

  function planOptions(mt, me, sit) {
    const o = findStation(me.origin) || findStation(mt.placeStation), d = findStation(me.dest);
    const dist = o && d ? Matching.km(o, d) : 10;
    const base = Matching.travelMin(me.origin, me.dest);
    const taxiMin = Math.round(6 + dist / 0.6);
    const fare = Math.round((4800 + Math.max(0, dist - 1.6) * 1000) / 100) * 100;
    const mates = (Store.groupOf(mt, me.id)?.memberIds || []).map(i => mt.members.find(x => x.id === i)).filter(x => x && x.id !== me.id && x.status !== 'arrived');
    const split = Store.groupOf(mt, me.id)?.splitStation;
    const won = n => n.toLocaleString('ko-KR') + '원';
    const taxi = { icon: 'taxi', title: '택시로 이동', min: taxiMin, note: `예상 요금 약 ${won(fare)}${mates.length ? ` · 동행자 ${mates.length}명과 합승하면 1인당 약 ${won(Math.round(fare / (mates.length + 1) / 100) * 100)}` : ''}` };
    const night = { icon: 'bus', title: '심야버스(N버스) 이용', min: base + 25, note: '배차 간격 약 20~30분을 포함한 시연용 추정치예요. 실제 운행 여부는 교통 앱에서 확인하세요.' };
    const wait = { icon: 'clock', title: '안전한 곳에서 대기 후 첫차', min: null, note: '24시간 편의점·카페 등 밝고 사람이 많은 곳에서 기다리는 방법이에요. 혼자라면 안부 확인 대상에게 알려 두세요.' };
    switch (sit) {
      case 'lastTrain': return [taxi, night, wait];
      case 'busEnd': return [{ icon: 'walk', title: '가까운 지하철역으로 이동 후 환승', min: base + 12, note: '운행 중인 지하철이 남아 있는지 먼저 확인하세요.' }, taxi, night];
      case 'transfer': return [{ icon: 'train', title: '다음 열차 기다리기', min: base + 8, note: '배차 간격 약 5~10분 기준이에요.' }, { icon: 'swap', title: '다른 노선으로 우회', min: base + 15, note: '환승 횟수가 늘 수 있어요.' }, taxi];
      case 'buddyLeft': return [
        { icon: 'users', title: `남은 동행자와 ${split || '분기 지점'}역까지 함께 이동`, min: null, note: mates.length ? `남은 동행자: ${mates.map(x => x.name).join(', ')}` : '남은 동행자가 없다면 아래 방법을 이용하세요.' },
        { icon: 'bell', title: '안부 확인 대상에게 귀가 시작 알리기', min: null, note: '도착 예정 시간을 공유하고 도착 후 완료를 눌러 주세요.' }, taxi];
      default: return [];
    }
  }

  function viewPlanB(code) {
    const g0 = guard(code); if (g0.out !== undefined) return g0.out;
    const { mt, me } = g0;
    if (!me.registered) return shell(`${back(`#/m/${mt.code}`, '귀가 현황')}<div class="card center stack"><p>귀가 정보를 먼저 등록하면 상황에 맞는 대체 계획을 추천해요.</p><a class="btn btn-primary" href="#/m/${mt.code}/register">귀가 정보 등록</a></div>`);
    const opts = planSit ? planOptions(mt, me, planSit) : [];
    const sitLabel = (SITUATIONS.find(s => s[0] === planSit) || [])[1];
    const g = Store.groupOf(mt, me.id);
    return shell(`
      ${back(`#/m/${mt.code}`, '귀가 현황')}
      <div class="page-head"><h2>귀가 플랜 B</h2><p>계획이 바뀌었나요? 지금 상황을 고르면 대체 방법을 추천해 드려요.</p></div>
      <div class="card"><div class="card-title">${icon('alert', 20)}<h3>현재 발생한 문제</h3></div>
        <div class="choice-list">${SITUATIONS.map(([k, l, ic]) => `<label class="choice"><input type="radio" name="sit" value="${k}" data-act="pickSit" ${k === planSit ? 'checked' : ''}><span class="box" style="flex-direction:row;align-items:center;gap:10px">${icon(ic, 20)}<span class="t">${l}</span></span></label>`).join('')}</div>
      </div>
      ${me.planB ? `<div class="card green" style="margin-top:16px"><div class="row"><span style="color:var(--green-700)">${icon('check', 22)}</span><div><b>적용 중인 계획: ${esc(me.planB.title)}</b><div class="small muted">${esc(me.planB.situation)}</div></div></div></div>` : ''}
      ${planSit === 'late' ? `
        <form class="card" style="margin-top:16px" data-form="late" data-code="${mt.code}">
          <div class="card-title">${icon('clock', 20)}<h3>새 출발 시간</h3></div>
          <input type="time" name="time" value="${esc(Matching.fmtTime(Matching.toMin(me.departTime || mt.endTime) + 20))}" aria-label="새 출발 시간">
          <p class="small muted" style="margin:10px 0 14px">${g ? '변경하면 그룹에 알리고, 동행 매칭을 다시 확인하도록 안내해요.' : '변경한 시간으로 동행 매칭을 다시 할 수 있어요.'}</p>
          <button class="btn btn-primary btn-block" type="submit">변경하고 그룹에 알리기</button>
        </form>` : ''}
      ${planSit && planSit !== 'late' ? `<div style="margin-top:16px"><h3 style="margin-bottom:12px">추천 대체 방법 · ${esc(sitLabel)}</h3>
        ${opts.map((p, i) => `<div class="plan-card ${me.planB && me.planB.title === p.title ? 'sel' : ''}">
          <div class="row between wrap"><div class="row"><span style="color:var(--orange-600)">${icon(p.icon, 22)}</span><b>${esc(p.title)}</b></div>${p.min ? `<span class="time">약 ${p.min}분</span>` : ''}</div>
          <p class="small muted" style="margin:8px 0 12px">${esc(p.note)}</p>
          <button class="btn btn-soft btn-sm" data-act="applyPlan" data-i="${i}">${icon('bell', 16)}이 방법으로 변경하고 그룹에 알리기</button></div>`).join('')}
        <p class="small muted" style="margin-top:12px">※ 시간·요금은 거리 기반 시연용 추정치예요. 실제 서비스에서는 대중교통 API와 연동돼요.</p></div>` : ''}
      ${!planSit ? '<div class="card empty" style="margin-top:16px">상황을 선택하면 대체 이동 방법이 나타나요.</div>' : ''}`);
  }

  /* ======================================================
   * 라우터
   * ====================================================== */
  function render() {
    const h = location.hash.replace(/^#/, '') || '/';
    const p = h.split('/').filter(Boolean);
    if (p[0] === 'm' && p[1] && Store.getMeeting(p[1])) Store.tick(p[1]); // 지연·막차 위험 자동 점검
    let html = '';
    if (!p.length) html = viewLanding();
    else if (p[0] === 'create') html = viewCreate();
    else if (p[0] === 'created') html = viewCreated(p[1]);
    else if (p[0] === 'join') html = viewJoin(p[1]);
    else if (p[0] === 'm' && p[1]) {
      const sub = p[2];
      html = sub === 'register' ? viewRegister(p[1]) : sub === 'match' ? viewMatch(p[1]) : sub === 'settings' ? viewSettings(p[1])
        : sub === 'planb' ? viewPlanB(p[1]) : viewDashboard(p[1]);
    } else html = notFound();
    $app.innerHTML = html;
    renderNav();
    document.title = '어디야? · 함께 가고, 무사히 도착하고.';
    if (!window.__keepScroll) window.scrollTo(0, 0);
    window.__keepScroll = false;
  }

  /* ======================================================
   * 이벤트 처리
   * ====================================================== */
  const curCode = () => (location.hash.match(/#\/m\/([A-Z0-9]+)/) || [])[1];
  const err = (f, name, msg) => { const e = f.querySelector(`[data-err="${name}"]`); if (e) e.textContent = msg || ''; };
  const rerender = () => { window.__keepScroll = true; render(); };

  const actions = {
    copy: el => copy(el.dataset.text),
    step(el) {
      const f = el.closest('form'); const inp = f.querySelector('[name=cap]');
      const v = Math.min(12, Math.max(2, Number(inp.value) + Number(el.dataset.d)));
      inp.value = v; f.querySelector('#capOut').textContent = v;
    },
    showcase() { const c = Store.seedShowcase(); toast('시연용 모임을 만들었어요'); go(`/m/${c}/register`); },
    leave() { Store.leaveSession(); go('/'); },
    start() { Store.startHome(curCode(), Store.getMe(curCode()).id); toast('귀가를 시작했어요. 조심히 가요!'); rerender(); },
    arrive() { Store.arrive(curCode(), Store.getMe(curCode()).id); toast('도착을 확인했어요'); rerender(); },
    respond() { Store.respondCheck(curCode(), Store.getMe(curCode()).id); toast('응답해 주셔서 고마워요'); rerender(); },
    simNear() { Store.setNear(curCode(), Store.getMe(curCode()).id, true); rerender(); },
    nearYes() { Store.arrive(curCode(), Store.getMe(curCode()).id); toast('도착을 확인했어요'); rerender(); },
    nearNo() { Store.setNear(curCode(), Store.getMe(curCode()).id, false); toast('계속 귀가 중으로 유지할게요'); rerender(); },
    simOverdue() { Store.simulateOverdue(curCode(), Store.getMe(curCode()).id); rerender(); },
    buddyOk(el) { Store.respondCheck(curCode(), el.dataset.id, Store.getMe(curCode()).name); toast('확인 결과를 반영했어요'); rerender(); },
    buddyArrived(el) { Store.arrive(curCode(), el.dataset.id); toast('도착으로 업데이트했어요'); rerender(); },
    nudge() { const r = Store.nudgeUnregistered(curCode()); toast(`${r.count}명에게 등록을 요청했어요`); rerender(); },
    applyRec() {
      const code = curCode(); const me = Store.getMe(code); const info = Matching.lastTrainInfo(me);
      Store.registerInfo(code, me.id, { departTime: info.recommended });
      toast(`출발 시간을 ${info.recommended}로 변경했어요`); rerender();
    },
    reqCheck(el) { Store.requestCheck(curCode(), el.dataset.id); toast('안부 확인을 요청했어요'); rerender(); },
    advDemo(el) { Store.advanceDemo(curCode(), el.dataset.id); rerender(); },
    demoAll() {
      const code = curCode(); const mt = Store.getMeeting(code); const me = Store.getMe(code);
      mt.members.filter(x => x.id !== me.id && x.registered && x.status !== 'arrived').forEach((x, i) => {
        if (x.status === 'ready') Store.startHome(code, x.id);
        Store.arrive(code, x.id);
      });
      toast('나를 제외한 참여자가 도착했어요'); rerender();
    },
    reset() { if (confirm('모든 참여자의 귀가 상태를 처음으로 되돌릴까요?')) { Store.resetJourney(curCode()); rerender(); } },
    decide(el) {
      const code = curCode(); Store.decideGroup(code, Store.getMe(code).id, el.dataset.join === '1');
      toast(el.dataset.join === '1' ? '그룹에 참여했어요' : '혼자 귀가로 변경했어요'); rerender();
    },
    rematch() { Store.runMatch(curCode()); toast('다시 매칭했어요'); rerender(); },
    pickSit(el) { planSit = el.value; rerender(); },
    applyPlan(el) {
      const code = curCode(); const mt = Store.getMeeting(code); const me = Store.getMe(code);
      const opt = planOptions(mt, me, planSit)[Number(el.dataset.i)];
      const label = SITUATIONS.find(s => s[0] === planSit)[1];
      const g = Store.groupOf(mt, me.id);
      Store.applyPlanB(code, me.id, { title: opt.title, situation: label }, `${me.name}님이 "${label}" 상황이라 "${opt.title}"(으)로 귀가 계획을 바꿨어요.`, g ? g.id : null);
      toast('귀가 계획을 변경하고 그룹에 알렸어요'); rerender();
    },
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'INPUT') return;
    const a = el.dataset.act;
    if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
    if (a === 'addDemo') {
      e.preventDefault();
      const code = el.dataset.code || curCode();
      const r = Store.addDemoFriends(code);
      toast(r.added ? `시연용 친구 ${r.added}명을 불러왔어요` : '정원이 가득 차서 더 불러올 수 없어요');
      if (el.dataset.then === 'match') Store.runMatch(code);
      if (/^#\/created\//.test(location.hash)) go(`/m/${code}`); else rerender();
      return;
    }
    actions[a] && actions[a](el, e);
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.act === 'pickSit') return actions.pickSit(el);
    const live = el.closest('[data-live="settings"]'); if (!live) return;
    const code = curCode(); const me = Store.getMe(code); if (!me) return;
    const patch = el.type === 'checkbox' ? { [el.name]: el.checked } : { [el.name]: el.value };
    Store.setSetting(code, me.id, patch);
    if (el.name === 'shareStopped') toast(el.checked ? '위치 공유를 중단했어요' : '위치 공유를 다시 시작했어요');
    else toast('저장했어요');
  });

  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f).entries());
    const kind = f.dataset.form;
    f.querySelectorAll('[data-err]').forEach(x => (x.textContent = ''));

    if (kind === 'create') {
      let bad = false;
      if (!fd.host.trim()) { err(f, 'host', '이름을 입력해 주세요.'); bad = true; }
      if (!fd.name.trim()) { err(f, 'name', '모임 이름을 입력해 주세요.'); bad = true; }
      if (!findStation(fd.place)) { err(f, 'place', '목록에 있는 역을 입력해 주세요. 예: 강남역'); bad = true; }
      if (!fd.end) { err(f, 'end', '해산 시간을 선택해 주세요.'); bad = true; }
      if (bad) return;
      const code = Store.createMeeting({ name: fd.name.trim(), place: fd.place.trim(), endTime: fd.end, capacity: fd.cap, hostName: fd.host.trim() });
      go(`/created/${code}`);
    }
    if (kind === 'join') {
      let bad = false;
      if (!fd.name.trim()) { err(f, 'name', '이름을 입력해 주세요.'); bad = true; }
      if (Store.normCode(fd.code).length !== 6) { err(f, 'code', '6자리 초대 코드를 입력해 주세요.'); bad = true; }
      if (bad) return;
      const r = Store.joinMeeting(fd.code, fd.name.trim());
      if (r.error) return err(f, 'code', r.error);
      const me = Store.getMe(r.code);
      go(me.registered ? `/m/${r.code}` : `/m/${r.code}/register`);
    }
    if (kind === 'register') {
      const code = f.dataset.code; const me = Store.getMe(code); let bad = false;
      if (!findStation(fd.origin)) { err(f, 'origin', '목록에 있는 역을 입력해 주세요.'); bad = true; }
      if (!findStation(fd.dest)) { err(f, 'dest', '목록에 있는 역을 입력해 주세요. 예: 잠실역'); bad = true; }
      if (!fd.time) { err(f, 'time', '출발 시간을 선택해 주세요.'); bad = true; }
      if (bad) return;
      Store.registerInfo(code, me.id, {
        origin: findStation(fd.origin).n + '역', dest: findStation(fd.dest).n + '역', departTime: fd.time, mode: fd.mode, privacy: fd.privacy,
      });
      toast('귀가 정보를 등록했어요');
      go(`/m/${code}/match`);
    }
    if (kind === 'late') {
      const code = f.dataset.code; const mt = Store.getMeeting(code); const me = Store.getMe(code); const g = Store.groupOf(mt, me.id);
      Store.registerInfo(code, me.id, { departTime: fd.time });
      Store.applyPlanB(code, me.id, { title: `${fd.time} 출발로 변경`, situation: '출발이 늦어졌어요' }, `${me.name}님의 출발 시간이 ${fd.time}으로 늦어졌어요.`, g ? g.id : null);
      toast('출발 시간을 변경하고 그룹에 알렸어요'); rerender();
    }
  });

  /* 초대 코드 입력 시 자동 하이픈/대문자 */
  document.addEventListener('input', e => {
    if (e.target.name === 'code') {
      const v = Store.normCode(e.target.value).slice(0, 6);
      e.target.value = v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v;
    }
  });

  // 15초마다 자동 점검. 변경이 있으면 화면 갱신 (입력 중인 폼은 건드리지 않음)
  setInterval(() => {
    const c = curCode(); if (!c || !Store.getMeeting(c)) return;
    if (Store.tick(c) && !document.activeElement?.closest('form')) rerender();
  }, 15000);

  window.addEventListener('hashchange', render);
  window.addEventListener('storage', e => { if (e.key === 'eodiya.v1' && !document.activeElement?.closest('form')) rerender(); });
  document.getElementById('stations').innerHTML = stationOptionsHtml();
  document.getElementById('resetData').addEventListener('click', e => {
    e.preventDefault();
    if (confirm('저장된 모든 시연 데이터를 삭제할까요?')) { localStorage.removeItem('eodiya.v1'); go('/'); location.reload(); }
  });
  render();
})();
