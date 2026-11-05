/* 데이터 계층 (백엔드 역할): localStorage 기반 목업 API
 * 실제 서비스에서는 이 파일의 함수들이 서버 API 호출로 대체된다.
 */
const Store = (() => {
  const KEY = 'eodiya.v1';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { meetings: {}, session: null }; }
    catch { return { meetings: {}, session: null }; }
  };
  const write = s => localStorage.setItem(KEY, JSON.stringify(s));
  const uid = () => Math.random().toString(36).slice(2, 10);

  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prettyCode = c => c.slice(0, 3) + '-' + c.slice(3);

  function genCode(s) {
    for (;;) {
      let c = '';
      for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!s.meetings[c]) return c;
    }
  }

  const getMeeting = code => read().meetings[normCode(code)] || null;
  const getSession = () => read().session;
  const getMe = code => {
    const s = read(); const m = s.meetings[normCode(code)];
    if (!m || !s.session || s.session.code !== m.code) return null;
    return m.members.find(x => x.id === s.session.memberId) || null;
  };

  /** 한 번에 읽고-수정-저장 */
  function mutate(code, fn) {
    const s = read(); const m = s.meetings[normCode(code)];
    if (!m) return null;
    const r = fn(m, s);
    write(s);
    return r === undefined ? m : r;
  }

  const newMember = (name, extra = {}) => ({
    id: uid(), name, registered: false, status: 'ready', origin: '', dest: '', departTime: '', mode: '지하철',
    privacy: 'area', shareStopped: false, arrivalNotice: true, buddy: 'host', groupDecision: null,
    startedAt: null, arrivedAt: null, planB: null, demo: false, ...extra,
  });

  function notify(m, text, groupId = null, kind = 'info') {
    m.notices.unshift({ id: uid(), ts: Date.now(), text, groupId, kind });
    m.notices = m.notices.slice(0, 40);
  }

  /* ---------- 모임 ---------- */
  function createMeeting({ name, place, endTime, capacity, hostName }) {
    const s = read();
    const code = genCode(s);
    const host = newMember(hostName);
    s.meetings[code] = {
      code, name, place, placeStation: findStation(place).n, endTime, capacity: Number(capacity),
      hostId: host.id, createdAt: Date.now(), members: [host], groups: null, soloIds: [], matchedAt: null, notices: [],
    };
    s.session = { code, memberId: host.id };
    write(s);
    return code;
  }

  function joinMeeting(codeInput, name) {
    const s = read(); const code = normCode(codeInput); const m = s.meetings[code];
    if (!m) return { error: '초대 코드를 찾을 수 없어요. 코드를 다시 확인해 주세요.' };
    let me = m.members.find(x => x.name === name && !x.demo);
    if (!me) {
      if (m.members.length >= m.capacity) return { error: `이 모임은 정원(${m.capacity}명)이 가득 찼어요.` };
      me = newMember(name);
      m.members.push(me);
      if (m.groups) notify(m, `${name}님이 모임에 참여했어요.`, null);
    }
    s.session = { code, memberId: me.id };
    write(s);
    return { code };
  }

  function leaveSession() { const s = read(); s.session = null; write(s); }

  /* ---------- 귀가 정보 / 매칭 ---------- */
  function registerInfo(code, id, info) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      Object.assign(me, info, { registered: true });
      if (m.groups) m.matchStale = true; // 새 등록/수정 → 재매칭 필요
    });
  }

  function runMatch(code) {
    return mutate(code, m => {
      const { groups, soloIds } = Matching.run(m.members, m.placeStation);
      m.groups = groups; m.soloIds = soloIds; m.matchedAt = Date.now(); m.matchStale = false;
      m.members.forEach(x => { x.groupDecision = null; });
      // 혼자 귀가하는 사람은 별도 결정이 필요 없음
    });
  }

  const groupOf = (m, id) => (m.groups || []).find(g => g.memberIds.includes(id)) || null;

  function decideGroup(code, id, join) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      me.groupDecision = join ? 'joined' : 'declined';
      const g = groupOf(m, id);
      if (g && join) notify(m, `${me.name}님이 동행 그룹 ${g.id.replace('g', '')}에 참여했어요.`, g.id);
      if (g && !join) notify(m, `${me.name}님은 혼자 귀가하기로 했어요.`, g.id);
    });
  }

  /* ---------- 귀가 상태 ---------- */
  function startHome(code, id) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      const g = groupOf(m, id);
      const together = g && me.groupDecision !== 'declined' && g.memberIds.length > 1;
      me.status = together ? 'together' : 'started';
      me.startedAt = Date.now();
      me.etaAt = me.startedAt + Matching.travelMin(me.origin, me.dest) * 60000;
      me.checkStage = 0; me.nearDest = false;
      notify(m, `${me.name}님이 귀가를 시작했어요.`, g ? g.id : null);
    });
  }

  function arrive(code, id) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      me.status = 'arrived'; me.arrivedAt = Date.now(); me.checkStage = 0; me.nearDest = false;
      const g = groupOf(m, id);
      if (me.arrivalNotice) {
        notify(m, `${me.name}님이 목적지에 도착했어요.`, g ? g.id : null, 'ok');
      }
      if (g) {
        const left = g.memberIds.map(i => m.members.find(x => x.id === i)).filter(x => x.status !== 'arrived');
        if (left.length === 0) notify(m, `동행 그룹 ${g.id.replace('g', '')}의 모든 구성원이 무사히 도착했어요.`, g.id, 'ok');
      }
    });
  }

  function requestCheck(code, id) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      if (me.status === 'arrived' || me.status === 'check') return;
      me.prevStatus = me.status; me.status = 'check';
      notify(m, `${me.name}님의 도착 확인이 필요해요. 안부를 물어봐 주세요.`, null, 'warn');
    });
  }

  /** 안부 응답. by가 있으면 지정 대상이 대신 확인한 경우 */
  function respondCheck(code, id, by = null) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      me.status = me.prevStatus && me.prevStatus !== 'ready' ? me.prevStatus : 'started';
      me.checkStage = 0; me.etaAt = Date.now() + 15 * 60000; // 15분 더 기다림
      notify(m, by ? `${by}님이 ${me.name}님의 안부를 확인했어요. 잘 가고 있대요.` : `${me.name}님이 "잘 가고 있어요"라고 응답했어요.`, null, 'ok');
    });
  }

  /* ---------- 자동 점검 (예상 도착 지연 · 막차 위험) ---------- */
  const GRACE_MIN = 5;
  const buddyOf = (m, me) => (me.buddy && me.buddy !== 'host' && m.members.find(x => x.id === me.buddy)) || m.members.find(x => x.id === m.hostId);

  /** 주기적으로 호출. 변경이 있으면 true */
  function tick(code) {
    let changed = false;
    mutate(code, m => {
      const now = Date.now();
      m.members.forEach(me => {
        // 막차 위험 사전 알림 (귀가 시작 전)
        if (me.registered && me.status === 'ready') {
          const info = Matching.lastTrainInfo(me);
          const key = info && info.level !== 'ok' ? info.level + info.last + me.departTime : '';
          if (key && me.riskKey !== key) {
            me.riskKey = key; changed = true;
            notify(m, info.level === 'danger'
              ? `${me.name}님은 출발 예정(${me.departTime})이 막차(${info.last})보다 늦어요. 지금 출발하거나 플랜 B를 확인하세요.`
              : `${me.name}님은 막차(${info.last})까지 여유가 ${info.slack}분뿐이에요. ${info.recommended}까지는 출발하는 걸 권장해요.`, null, 'warn');
          }
        }
        // 단계별 안부 확인: 1) 본인에게 알림 → 2) 응답 없으면 지정 대상/주최자에게 요청
        if (['started', 'together'].includes(me.status) && me.etaAt) {
          const stage = me.checkStage || 0;
          if (now > me.etaAt + GRACE_MIN * 60000 && stage < 2) {
            me.checkStage = 2; me.prevStatus = me.status; me.status = 'check'; changed = true;
            const b = buddyOf(m, me);
            notify(m, `${me.name}님이 확인 알림에 응답하지 않았어요. ${b.name}님, 안부를 확인해 주세요. (도착이 늦는 것일 뿐일 수 있어요)`, null, 'warn');
          } else if (now > me.etaAt && stage < 1) {
            me.checkStage = 1; changed = true;
            notify(m, `${me.name}님에게 예상 도착 시간이 지났다는 확인 알림을 보냈어요.`, null, 'info');
          }
        }
      });
    });
    return changed;
  }

  /** 시연용: 예상 도착 시간이 지난 상황을 만든다. 누르는 횟수에 따라 1단계 → 2단계 */
  function simulateOverdue(code, id) {
    mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      me.etaAt = (me.checkStage || 0) < 1 ? Date.now() - 1000 : Date.now() - (GRACE_MIN * 60000 + 1000);
    });
    tick(code);
  }

  /** 자동 도착 감지(시뮬레이션): 목적지 근처 진입 → 사용자 확인 대기 */
  function setNear(code, id, near) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      me.nearDest = near;
      if (near) notify(m, `${me.name}님이 목적지 근처에 도착한 것 같아요. 본인 확인을 기다리고 있어요.`, null, 'info');
    });
  }

  function nudgeUnregistered(code) {
    return mutate(code, m => {
      const names = m.members.filter(x => !x.registered).map(x => x.name);
      if (names.length) notify(m, `${names.join(', ')}님, 귀가 정보를 등록하면 동행을 찾아드려요. (주최자 요청)`, null, 'info');
      return { count: names.length };
    });
  }

  function resetJourney(code) {
    return mutate(code, m => {
      m.members.forEach(x => { x.status = 'ready'; x.startedAt = null; x.arrivedAt = null; x.planB = null; x.etaAt = null; x.checkStage = 0; x.nearDest = false; x.riskKey = null; });
      m.notices = [];
      notify(m, '귀가 상태를 처음으로 되돌렸어요 (시연용).', null);
    });
  }

  /* ---------- 설정 ---------- */
  const setSetting = (code, id, patch) => mutate(code, m => {
    Object.assign(m.members.find(x => x.id === id), patch);
  });

  function applyPlanB(code, id, plan, text, groupId) {
    return mutate(code, m => {
      const me = m.members.find(x => x.id === id);
      if (plan) me.planB = plan;
      if (text) notify(m, text, groupId, 'warn');
    });
  }

  /* ---------- 시연 도우미 ---------- */
  const DEMO_NAMES = ['지우', '민준', '서연', '도윤', '하은', '현우', '수아', '지호'];

  function pickDemoDestinations(place, seed) {
    const o = findStation(place);
    const cand = STATIONS.filter(s => s.n !== o.n).map(s => ({ s, d: Matching.km(o, s), b: Matching.bearing(o, s) }))
      .filter(x => x.d >= 4 && x.d <= 30).sort((a, b) => a.b - b.b);
    const anchor = cand[seed % cand.length];
    const same = cand.filter(x => x !== anchor && Matching.angDiff(x.b, anchor.b) <= 22)
      .sort((a, b) => Matching.km(a.s, anchor.s) - Matching.km(b.s, anchor.s));
    const opposite = cand.filter(x => Matching.angDiff(x.b, anchor.b) >= 120);
    const side = cand.filter(x => { const d = Matching.angDiff(x.b, anchor.b); return d >= 60 && d < 120; });
    const rest = cand.filter(x => x !== anchor);
    const pick = (arr, i) => (arr[i % Math.max(arr.length, 1)] || rest[(i * 3) % rest.length]).s.n;
    return [anchor.s.n, pick(same, 0), pick(same, 1), pick(opposite, seed), pick(side, seed), pick(rest, seed + 2), pick(opposite, seed + 1), pick(same, 2)];
  }

  function addDemoFriends(code) {
    return mutate(code, m => {
      const room = m.capacity - m.members.length;
      if (room <= 0) return { added: 0 };
      const seed = m.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const dests = pickDemoDestinations(m.placeStation, seed);
      const end = Matching.toMin(m.endTime);
      const offsets = [3, 6, 9, 12, 25, 8, 14, 5];
      const modes = ['지하철', '지하철', '버스', '지하철', '택시', '버스', '지하철', '지하철'];
      const privs = ['area', 'exact', 'area', 'status', 'area', 'exact', 'area', 'status'];
      const used = new Set(m.members.map(x => x.name));
      const names = DEMO_NAMES.filter(n => !used.has(n));
      let added = 0;
      for (let i = 0; i < Math.min(room, names.length, 8); i++) {
        m.members.push(newMember(names[i], {
          registered: true, demo: true, origin: m.placeStation, dest: dests[i] + '역',
          departTime: Matching.fmtTime(end + offsets[i]), mode: modes[i], privacy: privs[i],
        }));
        added++;
      }
      if (m.groups) m.matchStale = true;
      notify(m, `시연용 친구 ${added}명이 귀가 정보를 등록했어요.`, null);
      return { added };
    });
  }

  function advanceDemo(code, id) {
    const m = getMeeting(code); const x = m.members.find(y => y.id === id);
    if (x.status === 'arrived') return;
    if (x.status === 'ready') return startHome(code, id);
    return arrive(code, id);
  }

  function seedShowcase() {
    const code = createMeeting({ name: '금요일 동기 모임', place: '강남역', endTime: '22:30', capacity: 6, hostName: '나' });
    addDemoFriends(code);
    return code;
  }

  return {
    read, getMeeting, getSession, getMe, normCode, prettyCode, createMeeting, joinMeeting, leaveSession,
    registerInfo, runMatch, groupOf, decideGroup, startHome, arrive, requestCheck, respondCheck, resetJourney,
    setSetting, applyPlanB, addDemoFriends, advanceDemo, seedShowcase, mutate, notify,
    tick, simulateOverdue, setNear, nudgeUnregistered, buddyOf,
  };
})();
