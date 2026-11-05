/* 규칙 기반 귀가 동행 매칭 엔진
 * 점수 = 방향 유사도(40) + 목적지 간 거리(25) + 출발 시간 차이(20) + 함께 이동 가능한 구간(15)
 * 모든 점수에는 사용자에게 보여줄 "매칭 이유"가 함께 생성된다.
 */
const Matching = (() => {
  const SPEED_KM_PER_MIN = 0.5; // 지하철/버스 평균 약 30km/h
  const GROUP_THRESHOLD = 60;
  const PAIR_MIN = 45;
  const MAX_GROUP = 5;

  const rad = d => (d * Math.PI) / 180;
  const deg = r => (r * 180) / Math.PI;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  function km(a, b) {
    const R = 6371;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function bearing(a, b) {
    const dLng = rad(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLng);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }
  function angDiff(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  function destPoint(o, brg, dist) {
    const R = 6371, d = dist / R, b = rad(brg), la1 = rad(o.lat), lo1 = rad(o.lng);
    const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
    const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
    return { lat: deg(la2), lng: deg(lo2) };
  }
  function meanBearing(list) {
    const x = list.reduce((s, b) => s + Math.cos(rad(b)), 0), y = list.reduce((s, b) => s + Math.sin(rad(b)), 0);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }
  const toMin = t => { const [h, m] = String(t || '00:00').split(':').map(Number); return h * 60 + m; };
  const fmtTime = min => { const v = ((Math.round(min) % 1440) + 1440) % 1440; return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'); };
  const timeDiff = (a, b) => { const d = Math.abs(toMin(a) - toMin(b)); return Math.min(d, 1440 - d); };

  const modeGroup = m => (m === '지하철' || m === '버스') ? '대중교통' : m;
  function modeFactor(a, b) {
    if (a === b) return 1;
    if (modeGroup(a) === modeGroup(b)) return 0.9;
    return 0.3;
  }

  /** 참여자 한 명의 이동 정보를 계산 */
  function profile(m, placeStation) {
    const o = findStation(m.origin) || findStation(placeStation);
    const d = findStation(m.dest);
    if (!o || !d) return null;
    return { m, o, d, dist: km(o, d), brg: bearing(o, d) };
  }

  function pairScore(a, b) {
    const dirDiff = angDiff(a.brg, b.brg);
    const destKm = km(a.d, b.d);
    const tDiff = timeDiff(a.m.departTime, b.m.departTime);
    const overlapKm = dirDiff < 90 ? Math.min(a.dist, b.dist) * Math.cos(rad(dirDiff)) : 0;
    const mf = modeFactor(a.m.mode, b.m.mode);
    const sharedMin = Math.round((overlapKm / SPEED_KM_PER_MIN) * mf);

    const dir = clamp(1 - (dirDiff - 10) / 70) * 40;
    const dist = clamp(1 - (destKm - 2) / 14) * 25;
    const time = clamp(1 - (tDiff - 10) / 35) * 20;
    const shared = clamp(sharedMin / 20) * 15;
    return { total: Math.round(dir + dist + time + shared), dirDiff, destKm, tDiff, sharedMin };
  }

  /** 그룹 단위 요약과 매칭 이유 생성 */
  function summarize(profiles, placeStation, idx) {
    const origin = findStation(placeStation) || profiles[0].o;
    const brg = meanBearing(profiles.map(p => p.brg));
    const sharedKm = Math.min(...profiles.map(p => p.dist * Math.max(0, Math.cos(rad(angDiff(p.brg, brg))))));
    const sharedMin = Math.round(sharedKm / SPEED_KM_PER_MIN);
    const times = profiles.map(p => toMin(p.m.departTime));
    const spread = Math.min(Math.max(...times) - Math.min(...times), 1440);
    let maxDest = 0, pairSum = 0, pairN = 0, maxDir = 0;
    for (let i = 0; i < profiles.length; i++) for (let j = i + 1; j < profiles.length; j++) {
      const s = pairScore(profiles[i], profiles[j]);
      maxDest = Math.max(maxDest, s.destKm); maxDir = Math.max(maxDir, s.dirDiff);
      pairSum += s.total; pairN++;
    }
    const score = pairN ? Math.round(pairSum / pairN) : 0;

    const pt = destPoint(origin, brg, Math.max(sharedKm, 1));
    const split = STATIONS.filter(s => s.n !== origin.n)
      .map(s => ({ s, d: km(pt, s) })).sort((a, b) => a.d - b.d)[0].s;

    const modes = [...new Set(profiles.map(p => p.m.mode))];
    const reasons = [];
    reasons.push(maxDir <= 25 ? '귀가 방향이 유사합니다.' : '귀가 방향이 어느 정도 비슷합니다.');
    if (sharedMin >= 5) reasons.push(`약 ${sharedMin}분 동안 함께 이동할 수 있습니다.`);
    reasons.push(spread <= 10 ? '출발 시간이 비슷합니다.' : `출발 시간 차이는 최대 ${spread}분입니다.`);
    if (maxDest <= 6) reasons.push(`목적지 사이 거리가 가깝습니다 (최대 약 ${maxDest.toFixed(1)}km).`);
    if (modes.length === 1) reasons.push(`모두 ${modes[0]}을(를) 이용합니다.`);

    return {
      id: 'g' + (idx + 1), memberIds: profiles.map(p => p.m.id), score, sharedMin, spread,
      splitStation: split.n, splitDistrict: split.d, reasons, bearing: Math.round(brg), originStation: origin.n,
    };
  }

  /** 등록된 참여자를 그룹화한다. 반환: { groups, soloIds, unmatchable } */
  function run(members, placeStation) {
    const profiles = members.filter(m => m.registered).map(m => profile(m, placeStation)).filter(Boolean)
      .sort((a, b) => a.brg - b.brg);

    // 2인 모임: 비교 없이 한 팀으로 묶는다
    if (profiles.length === 2) {
      const g = summarize(profiles, placeStation, 0);
      g.pairMode = true;
      g.reasons.unshift('두 명이 함께 귀가하는 2인 동행입니다.');
      return { groups: [g], soloIds: [] };
    }

    const buckets = [];
    for (const p of profiles) {
      let best = null, bestAvg = -1;
      for (const b of buckets) {
        if (b.length >= MAX_GROUP) continue;
        const scores = b.map(x => pairScore(p, x).total);
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        if (Math.min(...scores) >= PAIR_MIN && avg >= GROUP_THRESHOLD && avg > bestAvg) { best = b; bestAvg = avg; }
      }
      if (best) best.push(p); else buckets.push([p]);
    }
    const groups = [], soloIds = [];
    buckets.forEach(b => {
      if (b.length > 1) groups.push(summarize(b, placeStation, groups.length));
      else soloIds.push(b[0].m.id);
    });
    groups.sort((a, b) => b.memberIds.length - a.memberIds.length || b.score - a.score);
    groups.forEach((g, i) => (g.id = 'g' + (i + 1)));
    return { groups, soloIds };
  }

  /** 시연용 추정치: 남은 거리 기반 이동 시간(분) */
  const travelMin = (originName, destName) => {
    const o = findStation(originName), d = findStation(destName);
    if (!o || !d) return 30;
    return Math.round(8 + km(o, d) / SPEED_KM_PER_MIN);
  };

  /** 막차 정보 (시연용 목업 기준: 실제 서비스에서는 대중교통 API로 대체) */
  const LAST_SERVICE = { 지하철: '00:20', 버스: '23:40' };
  const night = t => { let v = toMin(t); if (v < 360) v += 1440; return v; }; // 새벽 시간은 다음 날로 취급
  /** 반환: null(막차 없는 수단) 또는 { last, recommended, slack, level, travel } */
  function lastTrainInfo(m) {
    const lastStr = LAST_SERVICE[m.mode];
    if (!lastStr || !m.departTime) return null;
    const last = night(lastStr), depart = night(m.departTime), buffer = 20; // 승강장까지 이동 여유
    const slack = last - depart;
    const level = slack < buffer ? (slack < 0 ? 'danger' : 'warn') : 'ok';
    return { last: lastStr, recommended: fmtTime(last - buffer), slack, level, travel: travelMin(m.origin, m.dest) };
  }

  return { run, km, bearing, angDiff, toMin, fmtTime, timeDiff, travelMin, pairScore, profile, lastTrainInfo };
})();
