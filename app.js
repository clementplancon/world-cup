(function(){

  /* ============ CONFIG ============ */
  const DATA_URL = "https://world-cup-data.pointvirgule.dev/bracket.json";
  const AUTO_REFRESH_MS = 120000; // re-read the remote JSON feed every two minutes

  const ROUND_COLORS = ["--r1","--r2","--r3","--r4","--r5"];

  /* ============ i18n ============ */
  const I18N = {
    fr: {
      headerTitle:"Mondial 2026", headerSubtitle:"· Phases finales",
      subtitle: "Arbre circulaire — des 32<sup>es</sup> de finale à la Finale",
      round32:"32es de finale", round16:"8es de finale", roundQF:"Quarts de finale", roundSF:"Demi-finales", roundF:"Finale",
      statusFinal:"Terminé", statusLive:"En direct", eliminated:"Éliminé", estimate:"estimation",
      following:"Suivi : ",
      groupStage:"Phase de groupes",
      notifyEnable:"🔔 Activer les notifications", notifyEnabled:"🔔 Notifications activées",
      notifyBlocked:"Notifications bloquées dans le navigateur", notifyUnsupported:"Notifications non supportées sur cet appareil",
      notifyError:"Impossible d'activer les notifications",
      zoomHint:"Pince ou molette pour zoomer",
      installBtn:"Installer l'application", exportBtn:"Télécharger l'image",
      iosInstall:"Pour installer : appuie sur le bouton Partager de Safari (le carré avec une flèche), puis « Sur l'écran d'accueil ».",
      androidInstall:"Pour installer : ouvre le menu de ton navigateur (⋮) puis choisis « Ajouter à l'écran d'accueil » ou « Installer l'application ».",
      emptyWaitTitle:"En attente de la première synchronisation",
      emptyWaitText:"Le flux distant <code>world-cup-data.pointvirgule.dev/bracket.json</code> n'a pas encore publié de tableau exploitable. Réessaie dans quelques instants.",
      emptyErrTitle:"Impossible de récupérer les données",
      emptyErrText:"La requête vers <code>world-cup-data.pointvirgule.dev/bracket.json</code> a échoué (réseau, service indisponible ou cache). Réessaie dans quelques instants ou recharge la page en navigation privée pour écarter un souci de cache.",
      retry:"Réessayer", finale:"FINALE", today:"Aujourd'hui !", kickoff:"⏱ Coup d'envoi…", live:"🔴 En direct", tbd:"À déterminer",
      halfTime:"Mi-temps", stoppageTime:"Arrêts de jeu", extraTime:"Prolongations", penalties:"Tirs au but",
      topScorers:"Meilleurs buteurs", topAssists:"Meilleures passes décisives", bestTeams:"Meilleures équipes",
      recentMatches:"Derniers matchs", goals:"Buts", assistsShort:"Passes", played:"J", wins:"V", draws:"N", losses:"D", diff:"Diff",
      close:"Fermer", noStats:"Statistiques pas encore disponibles.", statsUpdated:"Mis à jour",
      themeSwitchToDark:"Passer au thème sombre", themeSwitchToLight:"Passer au thème clair",
      dIn:"dans", jShort:"j", hShort:"h", minShort:"min",
      city:"Ville",
      probabilityNote:"Pourcentages = estimation de victoire calculée avec une note pondérée (Elo 60 %, classement FIFA 25 %, forme récente 15 %), puis limitée entre 5 % et 95 %.",
    },
    en: {
      headerTitle:"2026 World Cup", headerSubtitle:"· Knockout stage",
      subtitle: "Circular bracket — from the Round of 32 to the Final",
      round32:"Round of 32", round16:"Round of 16", roundQF:"Quarter-finals", roundSF:"Semi-finals", roundF:"Final",
      statusFinal:"Finished", statusLive:"Live", eliminated:"Eliminated", estimate:"estimate",
      following:"Following: ",
      groupStage:"Group stage",
      notifyEnable:"🔔 Enable notifications", notifyEnabled:"🔔 Notifications on",
      notifyBlocked:"Notifications blocked in the browser", notifyUnsupported:"Notifications not supported on this device",
      notifyError:"Couldn't enable notifications",
      zoomHint:"Pinch or scroll to zoom",
      installBtn:"Install app", exportBtn:"Download image",
      iosInstall:"To install: tap Safari's Share button (the square with an arrow), then \"Add to Home Screen\".",
      androidInstall:"To install: open your browser's menu (⋮) then choose \"Add to Home screen\" or \"Install app\".",
      emptyWaitTitle:"Waiting for the first sync",
      emptyWaitText:"The remote feed <code>world-cup-data.pointvirgule.dev/bracket.json</code> hasn't published a usable bracket yet. Please try again shortly.",
      emptyErrTitle:"Couldn't fetch the data",
      emptyErrText:"The request to <code>world-cup-data.pointvirgule.dev/bracket.json</code> failed (network, service outage, or cache). Please try again shortly or reload the page in a private window to rule out caching.",
      retry:"Retry", finale:"FINAL", today:"Today!", kickoff:"⏱ Kicking off…", live:"🔴 Live", tbd:"TBD",
      halfTime:"Half-time", stoppageTime:"Stoppage time", extraTime:"Extra time", penalties:"Penalties",
      topScorers:"Top scorers", topAssists:"Top assists", bestTeams:"Best teams",
      recentMatches:"Recent matches", goals:"Goals", assistsShort:"Assists", played:"P", wins:"W", draws:"D", losses:"L", diff:"Diff",
      close:"Close", noStats:"Stats not available yet.", statsUpdated:"Updated",
      themeSwitchToDark:"Switch to dark theme", themeSwitchToLight:"Switch to light theme",
      dIn:"in", jShort:"d", hShort:"h", minShort:"m",
      city:"City",
      probabilityNote:"Percentages are win estimates based on a weighted rating (Elo 60%, FIFA ranking 25%, recent form 15%), then capped between 5% and 95%.",
    },
    es: {
      headerTitle:"Mundial 2026", headerSubtitle:"· Fase final",
      subtitle: "Cuadro circular — de los dieciseisavos a la Final",
      round32:"Dieciseisavos", round16:"Octavos de final", roundQF:"Cuartos de final", roundSF:"Semifinales", roundF:"Final",
      statusFinal:"Finalizado", statusLive:"En vivo", eliminated:"Eliminado", estimate:"estimación",
      following:"Siguiendo: ",
      groupStage:"Fase de grupos",
      notifyEnable:"🔔 Activar notificaciones", notifyEnabled:"🔔 Notificaciones activas",
      notifyBlocked:"Notificaciones bloqueadas en el navegador", notifyUnsupported:"Notificaciones no compatibles en este dispositivo",
      notifyError:"No se pudieron activar las notificaciones",
      zoomHint:"Pellizca o usa la rueda para hacer zoom",
      installBtn:"Instalar la aplicación", exportBtn:"Descargar imagen",
      iosInstall:"Para instalar: toca el botón Compartir de Safari (el cuadrado con una flecha) y luego «Añadir a pantalla de inicio».",
      androidInstall:"Para instalar: abre el menú de tu navegador (⋮) y elige «Añadir a pantalla de inicio» o «Instalar aplicación».",
      emptyWaitTitle:"Esperando la primera sincronización",
      emptyWaitText:"El feed remoto <code>world-cup-data.pointvirgule.dev/bracket.json</code> aún no ha publicado un cuadro utilizable. Vuelve a intentarlo en unos instantes.",
      emptyErrTitle:"No se pudieron obtener los datos",
      emptyErrText:"La solicitud a <code>world-cup-data.pointvirgule.dev/bracket.json</code> falló (red, servicio no disponible o caché). Vuelve a intentarlo en unos instantes o recarga la página en una ventana privada para descartar un problema de caché.",
      retry:"Reintentar", finale:"FINAL", today:"¡Hoy!", kickoff:"⏱ Empieza pronto…", live:"🔴 En vivo", tbd:"Por determinar",
      halfTime:"Descanso", stoppageTime:"Descuento", extraTime:"Prórroga", penalties:"Penaltis",
      topScorers:"Máximos goleadores", topAssists:"Máximas asistencias", bestTeams:"Mejores equipos",
      recentMatches:"Últimos partidos", goals:"Goles", assistsShort:"Asist.", played:"J", wins:"G", draws:"E", losses:"P", diff:"Dif",
      close:"Cerrar", noStats:"Estadísticas aún no disponibles.", statsUpdated:"Actualizado",
      themeSwitchToDark:"Cambiar al tema oscuro", themeSwitchToLight:"Cambiar al tema claro",
      dIn:"en", jShort:"d", hShort:"h", minShort:"min",
      city:"Ciudad",
      probabilityNote:"Los porcentajes son estimaciones de victoria basadas en una valoración ponderada (Elo 60 %, ranking FIFA 25 %, forma reciente 15 %) y limitadas entre 5 % y 95 %.",
    },
  };
  let lang = localStorage.getItem("wc2026-lang") || "fr";
  function t(key){ return (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key; }
  const THEME_COLORS = { light:"#edf4e8", dark:"#0a1512" };
  let theme = localStorage.getItem("wc2026-theme") === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;

  // FIFA code -> flagcdn.com country code (some UK nations use flagcdn's
  // subdivision flags). Covers the 48 qualified nations, with a few common
  // alternate codes as a safety net in case football-data.org's tla differs.
  const FLAG_MAP = {
    MEX:"mx", RSA:"za", KOR:"kr", CZE:"cz",
    SUI:"ch", CHE:"ch", CAN:"ca", BIH:"ba", QAT:"qa",
    BRA:"br", MAR:"ma", SCO:"gb-sct", HTI:"ht",
    USA:"us", AUS:"au", PAR:"py", TUR:"tr",
    GER:"de", CIV:"ci", CTI:"ci", ECU:"ec", CUW:"cw",
    NED:"nl", HOL:"nl", JPN:"jp", SWE:"se", TUN:"tn",
    BEL:"be", EGY:"eg", IRN:"ir", NZL:"nz",
    ESP:"es", CPV:"cv", CAV:"cv", URU:"uy", KSA:"sa", SAU:"sa",
    FRA:"fr", NOR:"no", SEN:"sn", IRQ:"iq",
    ARG:"ar", AUT:"at", DZA:"dz", ALG:"dz", JOR:"jo",
    COL:"co", POR:"pt", COD:"cd", ZAI:"cd", UZB:"uz",
    ENG:"gb-eng", CRO:"hr", GHA:"gh", PAN:"pa",
    WAL:"gb-wls", NIR:"gb-nir"
  };
  function flagUrl(code){
    if(!code) return null;
    const iso = FLAG_MAP[code.toUpperCase()];
    return iso ? `https://flagcdn.com/w80/${iso}.png` : null;
  }

  /* ============ STATE ============ */
  let rounds = [];
  let groupStage = {};
  let eliminated = new Set(); // team codes knocked out
  let followedCode = localStorage.getItem("wc2026-follow") || null; // team the user is "following" (path highlight + push)
  let followGroupExpanded = false;
  let hasPlayedEntrance = false; // only animate the very first time real data loads

  function computeEliminated(){
    eliminated = new Set();
    rounds.forEach(round=>{
      round.forEach(m=>{
        if(m.status === "final" && m.winner){
          const loser = m.winner === "home" ? m.away : m.home;
          if(loser && loser.code) eliminated.add(loser.code);
        }
      });
    });
  }

  // Given a team code, returns { leafIdx, matchIndices, eliminatedRound } describing
  // its exact path through the bracket: which of the 32 leaf slots it starts in,
  // which match index it occupies at every subsequent round, and — if the team has
  // lost — the round index at which it was knocked out. Bracket pairing is always
  // "match i draws from leaves/matches 2i and 2i+1", so the whole path can be
  // derived with simple integer halving — no need to search each round's match list.
  function computePath(code){
    if(!code || !rounds.length) return null;
    const round0 = rounds[0];
    let leafIdx = -1;
    for(let i=0;i<round0.length;i++){
      if(round0[i].home && round0[i].home.code === code){ leafIdx = i*2; break; }
      if(round0[i].away && round0[i].away.code === code){ leafIdx = i*2+1; break; }
    }
    if(leafIdx === -1) return null;
    const matchIndices = [];
    let eliminatedRound = -1; // -1 = still alive (or won it all)
    let idx = Math.floor(leafIdx/2);
    for(let k=0;k<rounds.length;k++){
      matchIndices.push(idx);
      const m = rounds[k][idx];
      if(m && m.status === "final" && m.winner){
        const loser = m.winner === "home" ? m.away : m.home;
        if(loser && loser.code === code){ eliminatedRound = k; break; }
      }
      idx = Math.floor(idx/2);
    }
    return { leafIdx, matchIndices, eliminatedRound };
  }

  function setFollowedCode(code){
    followedCode = code;
    if(code){ localStorage.setItem("wc2026-follow", code); }
    else { localStorage.removeItem("wc2026-follow"); }
  }

  function followTeam(code){
    setFollowedCode(followedCode === code ? null : code);
    followGroupExpanded = false;
    render();
    updateFollowChip();
    // A newly followed team should push notifications there too, if the user
    // already opted in — re-subscribe so the server points at the new team.
    if(followedCode && notificationsEnabled()){ subscribePush(followedCode).catch(()=>{}); }
  }

  function updateFollowChip(){
    const chip = document.getElementById("followChip");
    if(!followedCode){
      chip.style.display = "none";
      renderFollowGroupStage();
      return;
    }
    const img = document.getElementById("followFlag");
    const label = document.getElementById("followLabel");
    const url = flagUrl(followedCode);
    if(url){ img.src = url; img.style.display = "block"; } else { img.style.display = "none"; }
    label.textContent = t("following") + getTeamName(followedCode);
    chip.style.display = "flex";
    chip.setAttribute("aria-expanded", followGroupExpanded ? "true" : "false");
    updateNotifyButton();
    renderFollowGroupStage();
  }
  function resultColor(result){
    if(result === "W") return "var(--r1)";
    if(result === "D") return "var(--r3)";
    return "var(--r5)";
  }
  function escapeHtml(value){
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function renderFollowGroupStage(){
    const panel = document.getElementById("followGroupStage");
    if(!panel) return;
    const matches = followedCode && groupStage ? groupStage[followedCode] : null;
    if(!followedCode || !followGroupExpanded || !matches || matches.length === 0){
      panel.style.display = "none";
      panel.innerHTML = "";
      return;
    }
    const rows = matches.map((m) => {
      const opponent = m.opponent || {};
      const url = flagUrl(opponent.code);
      const flag = url
        ? `<img src="${url}" alt="">`
        : `<span class="group-stage-flag-fallback">${escapeHtml(opponent.code ? opponent.code[0] : "?")}</span>`;
      return `
        <div class="match-node group-stage-match">
          ${flag}
          <span class="group-stage-opponent">${escapeHtml(opponent.name || opponent.code || t("tbd"))}</span>
          <span class="group-stage-score">${escapeHtml(m.teamScore)} – ${escapeHtml(m.opponentScore)}</span>
          <span class="group-stage-result" style="background:${resultColor(m.result)}">${escapeHtml(m.result)}</span>
        </div>`;
    }).join("");
    panel.innerHTML = `<div class="group-stage-title">${t("groupStage")}</div><div class="group-stage-list">${rows}</div>`;
    panel.style.display = "block";
  }
  function getTeamName(code){
    // Pull the display name from whatever's currently loaded, falling back to the code itself.
    for(const round of rounds){
      for(const m of round){
        if(m.home && m.home.code === code) return m.home.name || code;
        if(m.away && m.away.code === code) return m.away.name || code;
      }
    }
    return code;
  }
  document.getElementById("followChip").addEventListener("click", ()=>{
    const matches = followedCode && groupStage ? groupStage[followedCode] : null;
    if(!matches || matches.length === 0) return;
    followGroupExpanded = !followGroupExpanded;
    updateFollowChip();
  });
  document.getElementById("followClearBtn").addEventListener("click", (e)=>{ e.stopPropagation(); followGroupExpanded = false; setFollowedCode(null); render(); updateFollowChip(); });

  /* ============ Web Push notifications (Phase 2) ============ */
  // The data server (same origin as DATA_URL) can send a system notification to
  // the followers of a team on kickoff and full-time. The user opts in per
  // browser via the 🔔 button on the follow chip.
  const API_BASE = DATA_URL.replace(/\/bracket\.json$/, "");

  function pushSupported(){
    return ("serviceWorker" in navigator) && ("PushManager" in window) && ("Notification" in window);
  }
  function notificationsEnabled(){
    return pushSupported() && Notification.permission === "granted";
  }

  // Standard conversion of a base64url VAPID key into the Uint8Array that
  // pushManager.subscribe() expects as applicationServerKey.
  function urlBase64ToUint8Array(base64String){
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++){ output[i] = raw.charCodeAt(i); }
    return output;
  }

  // Subscribe (or re-subscribe) this browser for the given team and register it
  // with the server. Reuses the existing PushSubscription if the browser already
  // has one, so switching the followed team just updates followedTeam server-side.
  async function subscribePush(teamCode){
    if(!teamCode || !pushSupported()) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      const keyRes = await fetch(API_BASE + "/api/vapid-public-key");
      const publicKey = (await keyRes.text()).trim();
      if(!publicKey) throw new Error("No VAPID public key");
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = sub.toJSON();
    await fetch(API_BASE + "/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys, followedTeam: teamCode }),
    });
    return true;
  }

  async function enableNotifications(){
    if(!followedCode) return;
    if(!pushSupported()){ alert(t("notifyUnsupported")); return; }
    if(Notification.permission === "denied"){ alert(t("notifyBlocked")); return; }
    try{
      const permission = await Notification.requestPermission();
      if(permission !== "granted"){ updateNotifyButton(); return; }
      await subscribePush(followedCode);
      updateNotifyButton();
    }catch(err){
      console.error("enableNotifications failed:", err);
      alert(t("notifyError"));
    }
  }

  function updateNotifyButton(){
    const btn = document.getElementById("followNotifyBtn");
    if(!btn) return;
    if(!pushSupported()){ btn.style.display = "none"; return; }
    btn.style.display = "inline-flex";
    const enabled = notificationsEnabled();
    const blocked = Notification.permission === "denied";
    btn.classList.toggle("is-on", enabled);
    btn.classList.toggle("is-blocked", blocked);
    btn.setAttribute("aria-disabled", blocked ? "true" : "false");
    btn.title = enabled ? t("notifyEnabled") : (blocked ? t("notifyBlocked") : t("notifyEnable"));
  }
  document.getElementById("followNotifyBtn").addEventListener("click", (e)=>{ e.stopPropagation(); enableNotifications(); });

  /* ============ DOM ============ */
  const svg = document.getElementById("bracket");
  const emptyOverlay = document.getElementById("emptyOverlay");
  const legendEl = document.getElementById("legend");
  const zoomWrap = document.getElementById("zoomWrap");
  const zoomHint = document.getElementById("zoomHint");
  const tooltip = document.getElementById("tooltip");
  const bottomBar = document.querySelector(".bottom-bar");

  function updateBottomBarOffset(){
    if(!bottomBar) return;
    const height = Math.ceil(bottomBar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--bottom-bar-height", height + "px");
  }
  if("ResizeObserver" in window && bottomBar){
    new ResizeObserver(updateBottomBarOffset).observe(bottomBar);
  }
  window.addEventListener("resize", updateBottomBarOffset);

  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent){
    const e = document.createElementNS(NS, tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    if(parent) parent.appendChild(e);
    return e;
  }

  let flagUid = 0;
  function drawFlag(parent, x, y, r, code){
    const isFollowed = code && followedCode === code;
    const g = el("g", {class:"flag-bubble" + (code && eliminated.has(code) ? " eliminated" : "") + (isFollowed ? " followed" : "")}, parent);
    el("circle", {class:"ring", cx:x, cy:y, r: r+1.5}, g);
    const url = flagUrl(code);
    if(url){
      const uid = "flagclip" + (flagUid++);
      const clip = el("clipPath", {id: uid}, g);
      el("circle", {cx:x, cy:y, r}, clip);
      el("image", {
        href:url, "xlink:href":url,
        x:x-r, y:y-r, width:r*2, height:r*2,
        preserveAspectRatio:"xMidYMid slice",
        "clip-path": `url(#${uid})`
      }, g);
    } else {
      const t = el("text", {x, y:y+3, "text-anchor":"middle", "font-size":r, fill:"var(--text-faint)"}, g);
      t.textContent = code ? code[0] : "?";
    }
    if(code){
      g.style.cursor = "pointer";
      g.addEventListener("click", (e)=>{ e.stopPropagation(); followTeam(code); });
    }
    return g;
  }

  /* ============ Trophy easter egg ============ */
  let trophyClickCount = 0;
  let trophyClickTimer = null;
  const TROPHY_MESSAGES = ["⚽ GOOOAL !", "🏆 Presque…", "🎉 Allez !", "🐐 Qui gagnera ?", "🔥 Chaud chaud !"];
  function setupTrophyEasterEgg(badgeEl){
    badgeEl.style.cursor = "pointer";
    badgeEl.addEventListener("click", (e)=>{
      e.stopPropagation();
      trophyClickCount++;
      clearTimeout(trophyClickTimer);
      trophyClickTimer = setTimeout(()=>{ trophyClickCount = 0; }, 1200);
      if(trophyClickCount >= 5){
        trophyClickCount = 0;
        badgeEl.classList.remove("egg-pop");
        void badgeEl.offsetWidth;
        badgeEl.classList.add("egg-pop");
        const label = badgeEl.querySelector("text");
        if(label){
          const original = label.textContent;
          label.textContent = TROPHY_MESSAGES[Math.floor(Math.random()*TROPHY_MESSAGES.length)];
          setTimeout(()=>{ label.textContent = original; badgeEl.classList.remove("egg-pop"); }, 1400);
        }
      }
    });
  }

  /* ============ Round labels from match counts ============ */
  function roundLabel(count){
    switch(count){
      case 16: return t("round32");
      case 8:  return t("round16");
      case 4:  return t("roundQF");
      case 2:  return t("roundSF");
      case 1:  return t("roundF");
      default: return count + " " + t("played");
    }
  }

  /* ============ Geometry helpers ============ */
  function polar(cx, cy, r, angleDeg){
    const a = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  function arcPath(cx, cy, r, a1, a2){
    const p1 = polar(cx, cy, r, a1);
    const p2 = polar(cx, cy, r, a2);
    const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    const sweep = a2 > a1 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} ${sweep} ${p2.x} ${p2.y}`;
  }

  /* ============ Build tree geometry & render ============ */
  const ENTRANCE_STEP_MS = 170; // time between each round's reveal
  function render(animateIn){
    svg.innerHTML = "";
    legendEl.innerHTML = "";

    if(!rounds.length){
      emptyOverlay.style.display = "flex";
      return;
    }
    emptyOverlay.style.display = "none";
    computeEliminated();
    const pathInfo = followedCode ? computePath(followedCode) : null;
    const eliminatedPaths = new Map();
    eliminated.forEach((code)=>{
      const info = computePath(code);
      if(info && info.eliminatedRound !== -1) eliminatedPaths.set(code, info);
    });
    const DIM = 0.15;
    const ELIMINATED_LEAF_DIM = 0.55;
    const ELIMINATED_EDGE_OPACITY = 0.5;

    const revealQueue = []; // { el, prop, target } — flipped to target state on the next frame

    // Fades a group in from invisible, after `delayMs`, to whatever opacity
    // it was already going to have (path-dim state included).
    function revealFade(node, delayMs){
      if(!animateIn) return;
      const target = node.style.opacity || "1";
      node.style.opacity = "0";
      node.style.transition = `opacity .32s ease-out ${delayMs}ms`;
      revealQueue.push({ el:node, prop:"opacity", target });
    }
    // "Draws" a line/arc in via stroke-dasharray, like a pen tracing it.
    function revealDraw(node, delayMs){
      if(!animateIn) return;
      let len;
      try{ len = node.getTotalLength(); }catch(e){ len = 220; }
      node.style.strokeDasharray = len;
      node.style.strokeDashoffset = len;
      node.style.transition = `stroke-dashoffset .42s ease-out ${delayMs}ms`;
      revealQueue.push({ el:node, prop:"strokeDashoffset", target:"0" });
    }

    const cx = 480, cy = 480;
    const outerR = 400;
    const innerR = 62;
    const firstNodeR = 355;

    const N = rounds.length;
    const nodeRadii = [];
    for(let k=0;k<N;k++){
      nodeRadii.push( firstNodeR - (firstNodeR - innerR) * (k/(Math.max(N-1,1))) );
    }

    const leafCount = rounds[0].length * 2;
    const leafAngles = [];
    for(let i=0;i<leafCount;i++) leafAngles.push( i * 360/leafCount );

    let currentAngles = leafAngles;
    const roundAngles = [];

    for(let k=0;k<N;k++){
      const matches = rounds[k];
      const angles = [];
      for(let i=0;i<matches.length;i++){
        const a1 = currentAngles[i*2];
        const a2 = currentAngles[i*2+1];
        let diff = a2 - a1;
        while(diff > 180) diff -= 360;
        while(diff < -180) diff += 360;
        angles.push(a1 + diff/2);
      }
      roundAngles.push(angles);
      currentAngles = angles;
    }

    el("circle", {class:"ring-guide", cx, cy, r: outerR, style:"stroke:var(--line);stroke-width:1;opacity:.35"}, svg);

    function edgeVisual(colorVar, onPath, eliminatedSegment){
      return {
        width: onPath ? 3 : 1,
        stroke: eliminatedSegment ? "--text-faint" : colorVar,
        opacity: onPath ? (eliminatedSegment ? ELIMINATED_EDGE_OPACITY : 1) : DIM
      };
    }
    function pathEl(d, colorVar, onPath, eliminatedSegment){
      const p = document.createElementNS(NS,"path");
      p.setAttribute("class","edge");
      p.setAttribute("d", d);
      const { width, stroke, opacity } = edgeVisual(colorVar, onPath, eliminatedSegment);
      p.setAttribute("style", `stroke:var(${stroke});stroke-width:${width};opacity:${opacity}`);
      return p;
    }
    function leafCodeAt(idx){
      const m = rounds[0] && rounds[0][Math.floor(idx/2)];
      const team = m && (idx % 2 === 0 ? m.home : m.away);
      return team && team.code ? team.code : null;
    }
    function matchWinnerCode(roundIdx, matchIdx){
      const m = rounds[roundIdx] && rounds[roundIdx][matchIdx];
      if(!m || m.status !== "final" || !m.winner) return null;
      const team = m.winner === "home" ? m.home : m.away;
      return team && team.code ? team.code : null;
    }
    function eliminatedSegmentInfo(code, childRoundIdx, childPos, parentRoundIdx, parentPos){
      const info = code ? eliminatedPaths.get(code) : null;
      if(!info || parentRoundIdx > info.eliminatedRound) return null;
      const isOwnSegment = childRoundIdx === -1
        ? info.leafIdx === childPos && info.matchIndices[0] === parentPos
        : info.matchIndices[childRoundIdx] === childPos && info.matchIndices[parentRoundIdx] === parentPos;
      return isOwnSegment ? info : null;
    }
    function drawEdges(childAngles, childR, matches, parentAngles, parentR, colorVar, childRoundIdx){
      const parentRoundIdx = childRoundIdx + 1;
      const delay = ENTRANCE_STEP_MS * (parentRoundIdx + 1);
      for(let i=0;i<matches.length;i++){
        const a1 = childAngles[i*2];
        const a2 = childAngles[i*2+1];
        const parentA = parentAngles[i];
        [a1,a2].forEach((a,c)=>{
          const childPos = i*2+c;
          const childOnPath = !pathInfo || (childRoundIdx === -1
            ? pathInfo.leafIdx === childPos
            : (pathInfo.matchIndices[childRoundIdx] === childPos && pathInfo.matchIndices[parentRoundIdx] === i));
          const segmentCode = childRoundIdx === -1 ? leafCodeAt(childPos) : matchWinnerCode(childRoundIdx, childPos);
          const eliminatedSegment = eliminatedSegmentInfo(segmentCode, childRoundIdx, childPos, parentRoundIdx, i);
          const p1 = polar(cx,cy,childR,a);
          const p2 = polar(cx,cy,parentR,a);
          const { width, stroke, opacity } = edgeVisual(colorVar, childOnPath, eliminatedSegment);
          const lineEl = el("line", {class:"edge", x1:p1.x, y1:p1.y, x2:p2.x, y2:p2.y, style:`stroke:var(${stroke});stroke-width:${width};opacity:${opacity}`}, svg);
          revealDraw(lineEl, delay);
          const arcD = c === 0 ? arcPath(cx,cy,parentR,a,parentA) : arcPath(cx,cy,parentR,parentA,a);
          const arcElNode = pathEl(arcD, colorVar, childOnPath, eliminatedSegment);
          svg.appendChild(arcElNode);
          revealDraw(arcElNode, delay);
        });
      }
    }

    drawEdges(leafAngles, outerR, rounds[0], roundAngles[0], nodeRadii[0], ROUND_COLORS[0], -1);
    for(let k=0;k<N-1;k++){
      const colorVar = ROUND_COLORS[Math.min(k+1, ROUND_COLORS.length-1)];
      drawEdges(roundAngles[k], nodeRadii[k], rounds[k+1], roundAngles[k+1], nodeRadii[k+1], colorVar, k);
    }

    const round0 = rounds[0];
    for(let i=0;i<round0.length;i++){
      const m = round0[i];
      [ [m.home, i*2], [m.away, i*2+1] ].forEach(([team, idx])=>{
        const isEliminated = team && team.code && eliminated.has(team.code);
        const a = leafAngles[idx];
        const flip = a >= 180; // bottom half of the circle: rotate 180° more so text isn't upside down
        const onPath = !pathInfo || pathInfo.leafIdx === idx;
        const flagP = polar(cx, cy, outerR + 10, a);
        const labelP = polar(cx, cy, outerR + 24, a);

        const leafG = el("g", {
          class: "leaf-group" + (isEliminated ? " eliminated" : ""),
          style: `opacity:${onPath ? (isEliminated ? ELIMINATED_LEAF_DIM : 1) : DIM};${team && team.code ? "cursor:pointer" : ""}`
        }, svg);

        // One generous invisible hit target covering flag + label together,
        // so tapping the visible text works just as well as tapping the flag icon.
        const hitCenter = polar(cx, cy, outerR + 17, a);
        el("circle", {cx:hitCenter.x, cy:hitCenter.y, r:26, fill:"transparent"}, leafG);

        const flagG = drawFlag(leafG, flagP.x, flagP.y, 9, team && team.code);

        const t = el("text", {
          class: "leaf-label" + (team && team.name ? "" : " empty") + (isEliminated ? " eliminated" : ""),
          x: labelP.x, y: labelP.y,
          "text-anchor": flip ? "end" : "start",
          transform: `rotate(${a-90+(flip?180:0)}, ${labelP.x}, ${labelP.y})`
        }, leafG);
        t.textContent = team && team.code ? team.code : "—";
        revealFade(leafG, 0);

        if(team && team.code){
          leafG.addEventListener("click", (e)=>{ e.stopPropagation(); followTeam(team.code); });
        }
      });
    }

    const boxW = 128, boxH = 34;
    for(let k=0;k<N;k++){
      const matches = rounds[k];
      const colorVar = ROUND_COLORS[Math.min(k, ROUND_COLORS.length-1)];
      const li = document.createElement("div");
      li.className = "legend-item";
      li.innerHTML = `<span class="legend-dot" style="background:var(${colorVar})"></span>${roundLabel(matches.length)}`;
      legendEl.appendChild(li);

      for(let i=0;i<matches.length;i++){
        const m = matches[i];
        const a = roundAngles[k][i];
        const r = nodeRadii[k];
        const p = polar(cx, cy, r, a);
        const onPath = !pathInfo || pathInfo.matchIndices[k] === i;

        const g = el("g", {
          class: "match-node" + (m.status==="live" ? " live" : "") +
                  (m.winner==="home" ? " winner-home" : "") +
                  (m.winner==="away" ? " winner-away" : ""),
          transform: `translate(${p.x - boxW/2}, ${p.y - boxH/2})`,
          style: `opacity:${onPath ? 1 : DIM}`,
          "data-round": k,
          "data-idx": i
        }, svg);

        el("rect", {class:"node-bg", x:0, y:0, width:boxW, height:boxH, rx:8, stroke: `var(${colorVar})`}, g);
        revealFade(g, ENTRANCE_STEP_MS * (k + 1) + 180);

        const homeCode = m.home && m.home.code ? m.home.code : null;
        const awayCode = m.away && m.away.code ? m.away.code : null;
        const homeScore = m.score && m.score.home!=null ? m.score.home : "";
        const awayScore = m.score && m.score.away!=null ? m.score.away : "";
        const homePen = m.penalties && m.penalties.home!=null ? `(${m.penalties.home})` : "";
        const awayPen = m.penalties && m.penalties.away!=null ? `(${m.penalties.away})` : "";
        const homeProbability = m.probabilities && m.probabilities.home != null ? `${m.probabilities.home}%` : "";
        const awayProbability = m.probabilities && m.probabilities.away != null ? `${m.probabilities.away}%` : "";

        drawFlag(g, 12, 10, 8, homeCode);
        drawFlag(g, 12, 24, 8, awayCode);

        const t1 = el("text", {class:"home", x:26, y:13}, g); t1.textContent = homeCode || "—";
        const t2 = el("text", {class:"away", x:26, y:27}, g); t2.textContent = awayCode || "—";

        const probabilityX = homeScore !== "" || awayScore !== "" ? boxW-34 : boxW-10;
        const s1 = el("text", {class:"score", x:boxW-10, y:13, "text-anchor":"end"}, g); s1.textContent = homeScore;
        const s2 = el("text", {class:"score", x:boxW-10, y:27, "text-anchor":"end"}, g); s2.textContent = awayScore;
        if(homeProbability || awayProbability){
          const pr1 = el("text", {class:"probability", x:probabilityX, y:13, "text-anchor":"end"}, g); pr1.textContent = homeProbability;
          const pr2 = el("text", {class:"probability", x:probabilityX, y:27, "text-anchor":"end"}, g); pr2.textContent = awayProbability;
        }

        if(homePen || awayPen){
          const pn1 = el("text", {class:"pen", x:boxW-10-16, y:13, "text-anchor":"end"}, g); pn1.textContent = homePen;
          const pn2 = el("text", {class:"pen", x:boxW-10-16, y:27, "text-anchor":"end"}, g); pn2.textContent = awayPen;
        }

        g.addEventListener("mouseenter", (e)=> showTooltip(e, m));
        g.addEventListener("mousemove", moveTooltip);
        g.addEventListener("mouseleave", hideTooltip);
        g.addEventListener("click", (e)=> showTooltip(e, m));
      }
    }

    const badge = el("g", {class:"center-badge"}, svg);
    el("circle", {cx, cy, r: innerR-14}, badge);
    const champ = rounds[N-1][0];
    const label = el("text", {x:cx, y: champ && champ.status!=="final" ? cy-2 : cy+4, "text-anchor":"middle", "font-size":"12"}, badge);
    if(champ && champ.status === "final" && champ.winner){
      label.textContent = (champ.winner==="home" ? champ.home.code : champ.away.code) + " 🏆";
    } else {
      label.textContent = t("finale");
      if(champ){
        let sub = "";
        if(champ.status === "live"){
          sub = t("live");
        } else {
          const finalTime = matchTimeMs(champ.date);
          const daysLeft = finalTime == null ? null : Math.ceil((finalTime - Date.now()) / 86400000);
          sub = daysLeft == null ? "" : (daysLeft > 0 ? `${t("dIn")} ${daysLeft}${t("jShort")}` : t("today"));
        }
        if(sub){
          const subEl = el("text", {x:cx, y:cy+14, "text-anchor":"middle", "font-size":"9", fill:"var(--text-dim)"}, badge);
          subEl.textContent = sub;
        }
      }
    }
    revealFade(badge, ENTRANCE_STEP_MS * (N + 1) + 220);
    setupTrophyEasterEgg(badge);

    if(animateIn && revealQueue.length){
      // Two frames: the first commits the "hidden" state to the page, the
      // second flips everything to its target — this is what actually makes
      // the CSS transitions (with their staggered delays) fire correctly.
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          revealQueue.forEach(({el:node, prop, target})=>{ node.style[prop] = target; });
        });
      });
    }
  }

  /* ============ Tooltip ============ */
  function currentLocale(){
    return lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "fr-FR";
  }
  function parseMatchDate(value){
    if(!value) return null;
    const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
      ? value + "Z"
      : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function matchTimeMs(value){
    const date = parseMatchDate(value);
    return date ? date.getTime() : null;
  }
  function formatLocalMatchDate(value){
    const date = parseMatchDate(value);
    if(!date) return null;
    try{
      return date.toLocaleString(currentLocale(), {
        day:"2-digit",
        month:"short",
        hour:"2-digit",
        minute:"2-digit",
        timeZoneName:"short",
      });
    }catch(e){
      return date.toLocaleString(currentLocale());
    }
  }
  function fmtStatus(m){
    if(m.status === "final") return t("statusFinal");
    if(m.status === "live") return formatLiveMatchStatus(m);
    const localDate = formatLocalMatchDate(m.date);
    if(localDate) return localDate;
    return t("tbd");
  }
  function escapeHTML(value){
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
    })[ch]);
  }
  function showTooltip(e, m){
    const homeName = m.home && m.home.name ? m.home.name : t("tbd");
    const awayName = m.away && m.away.name ? m.away.name : t("tbd");
    let scoreLine = "";
    if(m.score && m.score.home!=null){
      const hp = m.penalties && m.penalties.home!=null ? ` (${m.penalties.home})` : "";
      const ap = m.penalties && m.penalties.away!=null ? ` (${m.penalties.away})` : "";
      scoreLine = `<div class="tt-meta">${m.score.home}${hp} – ${m.score.away}${ap}</div>`;
    }
    let probabilityLine = "";
    if(m.probabilities && m.probabilities.home != null && m.probabilities.away != null){
      probabilityLine = `<div class="tt-meta">${m.probabilities.home}% – ${m.probabilities.away}% (${t("estimate")})</div>`;
    }
    const cityLine = m.city ? `<div class="tt-meta">${escapeHTML(t("city"))}: ${escapeHTML(m.city)}</div>` : "";
    tooltip.innerHTML = `<div class="tt-teams">${escapeHTML(homeName)} vs ${escapeHTML(awayName)}</div>${scoreLine}${probabilityLine}${cityLine}<div class="tt-meta">${escapeHTML(fmtStatus(m))}</div>`;
    tooltip.classList.add("show");
    moveTooltip(e);
  }
  function moveTooltip(e){
    tooltip.style.left = (e.clientX + 14) + "px";
    tooltip.style.top = (e.clientY + 14) + "px";
  }
  function hideTooltip(){ tooltip.classList.remove("show"); }

  /* ============ Load static JSON ============ */
  function setEmptyMessage(title, html){
    const titleEl = document.getElementById("emptyTitle");
    const textEl = document.getElementById("emptyText");
    if(titleEl) titleEl.textContent = title;
    if(textEl) textEl.innerHTML = html;
  }

  // Apply a freshly received bracket payload to the UI. Shared by the periodic
  // fetch() fallback and the SSE stream so both paths render identically.
  function applyBracket(data){
    rounds = (data && data.rounds) || [];
    groupStage = (data && data.groupStage) || {};
    const shouldAnimate = !hasPlayedEntrance && rounds.length > 0;
    if(!rounds.length){
      setEmptyMessage(t("emptyWaitTitle"), t("emptyWaitText"));
    }
    render(shouldAnimate);
    if(shouldAnimate) hasPlayedEntrance = true;
    updateFollowChip();
    refreshNextMatch();
  }

  async function loadData(){
    try{
      const res = await fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
      if(!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      applyBracket(data);
    }catch(err){
      console.error(err);
      if(!rounds.length){
        setEmptyMessage(t("emptyErrTitle"), t("emptyErrText"));
        emptyOverlay.style.display = "flex";
      }
    }
  }
  document.getElementById("retryBtn").addEventListener("click", loadData);

  /* ============ Real-time updates (SSE) ============ */
  // The persistent data server pushes bracket changes over Server-Sent Events,
  // so a score update lands in a few seconds instead of waiting for the next
  // poll. We keep the periodic fetch() above as a safety net in case the stream
  // drops (proxy timeout, server restart, browser without EventSource, ...).
  let sseSource = null;
  function connectEvents(){
    if(!("EventSource" in window)) return;
    try{
      // Derive the /events endpoint from DATA_URL (same origin, different path).
      const eventsUrl = DATA_URL.replace(/\/bracket\.json$/, "/events");
      sseSource = new EventSource(eventsUrl);
      sseSource.addEventListener("update", (e)=>{
        try{ applyBracket(JSON.parse(e.data)); }
        catch(err){ console.error("Bad SSE payload:", err); }
      });
      // On error EventSource reconnects on its own; the fetch() fallback covers
      // the gap in the meantime, so nothing more is needed here.
      sseSource.addEventListener("error", ()=>{ /* auto-reconnect handled by browser */ });
    }catch(err){
      console.warn("SSE unavailable, falling back to polling only:", err);
    }
  }

  /* ============ Next match + countdown ============ */
  let nextMatchRef = null;
  let nextMatchLoc = null; // { round, idx } — lets the chip locate the node in the circle

  function hasMatchScore(m){
    return !!(m && m.score && m.score.home != null && m.score.away != null);
  }

  function isActiveMatch(m){
    return !!(m && (m.status === "live" || (m.status === "scheduled" && hasMatchScore(m))));
  }

  function numberOrNull(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function getLiveDuration(m){
    return (m && m.live && m.live.duration ? String(m.live.duration) : "").toUpperCase();
  }

  function getLiveApiStatus(m){
    return (m && m.live && m.live.apiStatus ? String(m.live.apiStatus) : "").toUpperCase();
  }

  // The fallback minute estimate below is only used when the API doesn't send
  // an explicit live.minute. It derives the minute from wall-clock time since
  // kickoff, which would otherwise keep counting through half-time (and any
  // other break in play) and overshoot the real elapsed playing time. The
  // paused duration (m.live.pausedMs) is computed server-side — not tracked
  // in the browser — precisely so that a client opening the page mid-second-
  // half (with no history of the half-time break) still gets the correct
  // value: the server has been polling since kickoff and already knows it.
  function estimatedLiveMinute(m){
    const explicitMinute = numberOrNull(m && m.live && m.live.minute);
    if(explicitMinute != null && explicitMinute > 0) return explicitMinute;
    const kickoff = matchTimeMs(m && m.date);
    if(kickoff == null) return null;
    const pausedMs = numberOrNull(m && m.live && m.live.pausedMs) || 0;
    const elapsed = Math.floor((Date.now() - kickoff - pausedMs) / 60000) + 1;
    if(elapsed < 1) return null;
    return Math.min(elapsed, getLiveDuration(m) === "EXTRA_TIME" ? 120 : 90);
  }

  function stoppageBase(minute){
    if(minute <= 45) return 45;
    if(minute <= 90) return 90;
    if(minute <= 105) return 105;
    return 120;
  }

  function formatLiveMinute(minute, injuryTime){
    if(minute == null) return "";
    if(injuryTime && injuryTime > 0){
      return `${stoppageBase(minute)}+${injuryTime}′`;
    }
    return `${minute}′`;
  }

  function formatLiveMatchStatus(m){
    if(!m || m.status !== "live") return t("live");
    if(getLiveApiStatus(m) === "PAUSED") return t("halfTime");

    const duration = getLiveDuration(m);
    if(duration === "PENALTY_SHOOTOUT") return t("penalties");

    const minute = estimatedLiveMinute(m);
    const injuryTime = numberOrNull(m.live && m.live.injuryTime);
    const minuteText = formatLiveMinute(minute, injuryTime);
    const phases = [];
    if(duration === "EXTRA_TIME" || (minute != null && minute > 90)) phases.push(t("extraTime"));
    if(injuryTime && injuryTime > 0) phases.push(t("stoppageTime"));
    if(phases.length) return minuteText ? `${minuteText} · ${phases.join(" · ")}` : phases.join(" · ");
    return minuteText || t("live");
  }

  function formatLiveScore(m){
    const hs = m.score && m.score.home!=null ? m.score.home : 0;
    const as = m.score && m.score.away!=null ? m.score.away : 0;
    if(m.penalties && m.penalties.home!=null && m.penalties.away!=null){
      return `${hs} – ${as} · ${m.penalties.home}–${m.penalties.away}`;
    }
    return `${hs} – ${as}`;
  }

  function refreshNextMatch(){
    const all = [];
    rounds.forEach((round,k)=> round.forEach((m,i)=> all.push({m,k,i})));
    const live = all.find(x => isActiveMatch(x.m));
    const upcoming = all
      .map(x => ({...x, time: matchTimeMs(x.m.date)}))
      .filter(x => x.m.status === "scheduled" && !hasMatchScore(x.m) && x.time != null)
      .sort((a,b)=> a.time - b.time)[0];
    const chosen = live || upcoming || null;
    nextMatchRef = chosen ? chosen.m : null;
    nextMatchLoc = chosen ? { round: chosen.k, idx: chosen.i } : null;

    const chip = document.getElementById("nextMatchChip");
    const img1 = document.getElementById("nextMatchFlag1");
    const img2 = document.getElementById("nextMatchFlag2");
    const label = document.getElementById("nextMatchLabel");
    if(!nextMatchRef){ chip.style.display = "none"; return; }

    const homeName = nextMatchRef.home && nextMatchRef.home.name ? nextMatchRef.home.name : "?";
    const awayName = nextMatchRef.away && nextMatchRef.away.name ? nextMatchRef.away.name : "?";
    label.textContent = `${homeName} – ${awayName}`;
    const localDate = isActiveMatch(nextMatchRef) ? formatLiveMatchStatus(nextMatchRef) : formatLocalMatchDate(nextMatchRef.date);
    chip.title = localDate ? `${homeName} – ${awayName} · ${localDate}` : `${homeName} – ${awayName}`;

    const url1 = nextMatchRef.home && flagUrl(nextMatchRef.home.code);
    if(url1){ img1.src = url1; img1.style.display = "block"; } else { img1.style.display = "none"; }
    const url2 = nextMatchRef.away && flagUrl(nextMatchRef.away.code);
    if(url2){ img2.src = url2; img2.style.display = "block"; } else { img2.style.display = "none"; }

    chip.classList.toggle("is-live", isActiveMatch(nextMatchRef));
    chip.style.display = "flex";
    tickCountdown();
  }

  function pingNextMatch(){
    if(!nextMatchLoc) return;
    const node = svg.querySelector(`.match-node[data-round="${nextMatchLoc.round}"][data-idx="${nextMatchLoc.idx}"]`);
    if(!node) return;
    node.classList.remove("ping");
    void node.offsetWidth; // restart the animation if it's already running
    node.classList.add("ping");
    setTimeout(()=> node.classList.remove("ping"), 2400);
  }
  document.getElementById("nextMatchChip").addEventListener("click", pingNextMatch);

  function tickCountdown(){
    const el2 = document.getElementById("nextMatchCountdown");
    const scoreEl = document.getElementById("nextMatchScore");
    if(!nextMatchRef){ return; }
    if(isActiveMatch(nextMatchRef)){
      el2.textContent = formatLiveMatchStatus(nextMatchRef);
      scoreEl.textContent = formatLiveScore(nextMatchRef);
      return;
    }
    scoreEl.textContent = "";
    const nextMatchTime = matchTimeMs(nextMatchRef.date);
    if(nextMatchTime == null){ el2.textContent = ""; return; }
    const diff = nextMatchTime - Date.now();
    if(diff <= 0){ el2.textContent = t("kickoff"); return; }
    const totalSec = Math.floor(diff/1000);
    const d = Math.floor(totalSec/86400);
    const h = Math.floor((totalSec%86400)/3600);
    const mnt = Math.floor((totalSec%3600)/60);
    const s = totalSec%60;
    const inW = t("dIn"), j = t("jShort"), hh = t("hShort"), mm = t("minShort");
    el2.textContent = d>0 ? `${inW} ${d}${j} ${h}${hh}` : (h>0 ? `${inW} ${h}${hh} ${mnt}${mm}` : `${inW} ${mnt}${mm} ${String(s).padStart(2,"0")}s`);
  }
  setInterval(tickCountdown, 1000);

  /* ============ Export as PNG ============ */
  async function fetchAsDataURL(url){
    const res = await fetch(url, { mode:"cors" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function exportPng(){
    const btn = document.getElementById("exportBtn");
    try{
      btn.style.opacity = ".5";
      const size = 1600;
      const clone = svg.cloneNode(true);
      clone.setAttribute("data-theme", theme);
      clone.setAttribute("width", size);
      clone.setAttribute("height", size);
      clone.setAttribute("viewBox", "0 0 960 960");
      // Required for the serialized markup to be valid standalone XML — without
      // these, xlink:href on the flag <image> elements is an undefined
      // namespace prefix once outside the HTML document, and the browser
      // silently fails to parse/load the resulting SVG (img "error" event).
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

      const bg = document.createElementNS(NS, "rect");
      bg.setAttribute("x","-40"); bg.setAttribute("y","-40");
      bg.setAttribute("width","1040"); bg.setAttribute("height","1040");
      bg.setAttribute("fill", getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || THEME_COLORS[theme]);
      clone.insertBefore(bg, clone.firstChild);

      // Embed the page's stylesheet inside the SVG itself. Standalone SVG
      // documents (which is what this becomes once rasterized via <img>)
      // don't have access to the host page's <style> — every var(--xxx)
      // color used by class rules AND inline styles would otherwise fail to
      // resolve, which is exactly what produced the all-black export. Since
      // the stylesheet's ":root{...}" block becomes the SVG's own root once
      // parsed standalone, copying it verbatim fixes every var() at once.
      const styleEl = document.createElementNS(NS, "style");
      styleEl.textContent = getPageCssText() +
        `\nsvg{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Helvetica,Arial,sans-serif;}`;
      clone.insertBefore(styleEl, clone.firstChild);

      // Inline every flag as base64 so the rasterized image has zero external
      // references left — this is what actually avoids canvas tainting,
      // rather than relying on flagcdn's CORS headers being respected by the
      // browser's SVG image decoder (which many browsers don't do reliably).
      const images = Array.from(clone.querySelectorAll("image"));
      await Promise.all(images.map(async (imgEl)=>{
        const href = imgEl.getAttribute("href") || imgEl.getAttribute("xlink:href");
        if(!href || !href.startsWith("http")) return;
        try{
          const dataUrl = await fetchAsDataURL(href);
          imgEl.setAttribute("href", dataUrl);
          imgEl.setAttribute("xlink:href", dataUrl);
        }catch(err){
          console.warn("Drapeau non intégré à l'export (retiré, le reste du cercle reste exporté) :", href, err);
          imgEl.remove();
        }
      }));

      const svgText = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgText], {type:"image/svg+xml;charset=utf-8"});
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise((resolve, reject)=>{ img.onload = resolve; img.onerror = reject; img.src = url; });

      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      await new Promise((resolve, reject)=>{
        canvas.toBlob(async (blob)=>{
          try{
            if(!blob){ throw new Error("toBlob failed"); }
            await downloadPng(blob);
            resolve();
          }catch(err){ reject(err); }
        }, "image/png");
      });
    }catch(err){
      console.error("Export PNG échoué :", err);
      alert("L'export a échoué même après intégration des drapeaux en base64 — ouvre la console (F12) pour voir l'erreur exacte, ça m'aidera à corriger.");
    }finally{
      btn.style.opacity = "";
    }
  }

  function downloadPng(blob){
    const fileName = "mondial-2026-arbre.png";
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>{ URL.revokeObjectURL(blobUrl); }, 30000);
  }
  document.getElementById("exportBtn").addEventListener("click", exportPng);

  function getPageCssText(){
    return Array.from(document.styleSheets).map(sheet=>{
      try{ return Array.from(sheet.cssRules).map(rule=> rule.cssText).join("\n"); }
      catch(err){ return ""; }
    }).join("\n");
  }

  /* ============ Pinch / pan / wheel zoom ============ */
  const zoomState = { scale: 1, x: 0, y: 0 };
  const MIN_SCALE = 1, MAX_SCALE = 5;

  function applyZoom(){
    zoomWrap.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
  }

  function clampAndApply(){
    zoomState.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoomState.scale));
    // Keep the panning within bounds so the chart can never be dragged
    // fully off-screen (which would make it impossible to recover, since
    // the stage clips overflow and the drag/pinch target would be gone).
    const rect = zoomWrap.parentElement.getBoundingClientRect();
    const maxX = Math.max(0, (zoomState.scale - 1) * rect.width / 2);
    const maxY = Math.max(0, (zoomState.scale - 1) * rect.height / 2);
    zoomState.x = Math.min(maxX, Math.max(-maxX, zoomState.x));
    zoomState.y = Math.min(maxY, Math.max(-maxY, zoomState.y));
    applyZoom();
  }

  // Zoom while keeping the point under (clientX, clientY) visually fixed.
  function zoomAt(clientX, clientY, newScale){
    const rect = zoomWrap.parentElement.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width/2;
    const cy = clientY - rect.top - rect.height/2;
    const factor = newScale / zoomState.scale;
    zoomState.x = cx - (cx - zoomState.x) * factor;
    zoomState.y = cy - (cy - zoomState.y) * factor;
    zoomState.scale = newScale;
    clampAndApply();
  }

  document.getElementById("zoomInBtn").addEventListener("click", ()=>{
    const rect = zoomWrap.parentElement.getBoundingClientRect();
    zoomAt(rect.left+rect.width/2, rect.top+rect.height/2, zoomState.scale*1.5);
  });
  document.getElementById("zoomOutBtn").addEventListener("click", ()=>{
    const rect = zoomWrap.parentElement.getBoundingClientRect();
    zoomAt(rect.left+rect.width/2, rect.top+rect.height/2, zoomState.scale/1.5);
  });

  // Wheel zoom (desktop trackpad/mouse), centered on the cursor.
  zoomWrap.parentElement.addEventListener("wheel", (e)=>{
    e.preventDefault();
    const delta = -e.deltaY * 0.0025;
    zoomAt(e.clientX, e.clientY, zoomState.scale * (1 + delta));
  }, { passive: false });

  // Pointer-based pan + pinch (works for touch and mouse/pen alike).
  const activePointers = new Map();
  let pinchStartDist = 0, pinchStartScale = 1, panStart = null;
  let pinchOccurred = false; // guards against a pinch-release being mistaken for a double-tap
  const DRAG_THRESHOLD = 6; // px — below this, treat it as a tap/click, not a drag

  function dist(a, b){ return Math.hypot(a.x-b.x, a.y-b.y); }
  function midpoint(a, b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }

  zoomWrap.addEventListener("pointerdown", (e)=>{
    activePointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
    zoomHint.classList.remove("show");
    if(activePointers.size === 1){
      pinchOccurred = false; // start of a fresh gesture
      // Don't capture yet — a stationary tap needs to reach the actual
      // element underneath (e.g. a flag) so its click handler still fires.
      panStart = { x:e.clientX, y:e.clientY, ox:zoomState.x, oy:zoomState.y, captured:false, pointerId:e.pointerId };
    } else if(activePointers.size === 2){
      pinchOccurred = true;
      // Capture both fingers so a pinch stays tracked even if one drifts
      // over another UI element (zoom buttons, export button, etc.).
      for(const id of activePointers.keys()) zoomWrap.setPointerCapture(id);
      const pts = [...activePointers.values()];
      pinchStartDist = dist(pts[0], pts[1]);
      pinchStartScale = zoomState.scale;
      panStart = null;
    }
  });

  zoomWrap.addEventListener("pointermove", (e)=>{
    if(!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

    if(activePointers.size === 2){
      const pts = [...activePointers.values()];
      const d = dist(pts[0], pts[1]);
      if(pinchStartDist > 0){
        const mid = midpoint(pts[0], pts[1]);
        zoomAt(mid.x, mid.y, pinchStartScale * (d / pinchStartDist));
      }
    } else if(activePointers.size === 1 && panStart){
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      if(!panStart.captured){
        if(Math.hypot(dx,dy) < DRAG_THRESHOLD) return; // still just a potential tap
        panStart.captured = true;
        zoomWrap.setPointerCapture(panStart.pointerId);
        zoomWrap.classList.add("dragging");
      }
      zoomState.x = panStart.ox + dx;
      zoomState.y = panStart.oy + dy;
      clampAndApply();
    }
  });

  function endPointer(e){
    activePointers.delete(e.pointerId);
    zoomWrap.classList.remove("dragging");
    if(activePointers.size < 2) pinchStartDist = 0;
    if(activePointers.size === 0) panStart = null;
  }
  zoomWrap.addEventListener("pointerup", endPointer);
  zoomWrap.addEventListener("pointercancel", endPointer);
  zoomWrap.addEventListener("pointerleave", endPointer);

  // Double-click / double-tap to toggle between 1x and 2.5x.
  let lastTap = 0;
  zoomWrap.addEventListener("pointerup", (e)=>{
    const now = Date.now();
    if(now - lastTap < 300 && activePointers.size === 0 && !pinchOccurred){
      if(zoomState.scale > 1.2){
        zoomState.scale = 1; zoomState.x = 0; zoomState.y = 0; applyZoom();
      } else {
        zoomAt(e.clientX, e.clientY, 2.5);
      }
    }
    lastTap = now;
  });

  clampAndApply();
  setTimeout(()=>{ zoomHint.classList.add("show"); setTimeout(()=> zoomHint.classList.remove("show"), 3500); }, 600);

  /* ============ Init ============ */
  render();
  loadData();
  setInterval(loadData, AUTO_REFRESH_MS);
  connectEvents();

  if("serviceWorker" in navigator){
    window.addEventListener("load", ()=>{
      navigator.serviceWorker.register("./service-worker.js")
        .then(()=>{
          // If the user already opted into notifications and follows a team,
          // refresh the server-side subscription (endpoints can rotate and the
          // server may have restarted) so pushes keep flowing.
          if(followedCode && notificationsEnabled()){ subscribePush(followedCode).catch(()=>{}); }
          updateNotifyButton();
        })
        .catch(err=> console.warn("SW registration failed:", err));
    });
  }

  /* ============ Install button ============ */
  const installBtn = document.getElementById("installBtn");
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferredInstallPrompt = null;

  if(!isStandalone){
    // Always offer the button on mobile (CSS restricts it to small screens),
    // instead of waiting for "beforeinstallprompt" — Chrome only fires that
    // event once its own engagement heuristics are satisfied, which can take
    // several visits, so relying on it alone left the button never showing.
    installBtn.classList.add("show");
    // Android/Chrome: fires when the browser judges the site installable,
    // letting us trigger the native install prompt instead of the fallback.
    window.addEventListener("beforeinstallprompt", (e)=>{
      e.preventDefault();
      deferredInstallPrompt = e;
      installBtn.classList.add("show");
    });
  }

  installBtn.addEventListener("click", async ()=>{
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.classList.remove("show");
    } else if(isIOS){
      alert(t("iosInstall"));
    } else {
      alert(t("androidInstall"));
    }
  });

  window.addEventListener("appinstalled", ()=>{
    installBtn.classList.remove("show");
    deferredInstallPrompt = null;
  });

  /* ============ Language toggle ============ */
  const LANG_ORDER = ["fr", "en", "es"];
  function applyStaticTranslations(){
    document.getElementById("langBtn").textContent = lang.toUpperCase();
    applyTheme();
    document.getElementById("headerTitleText").textContent = t("headerTitle");
    document.getElementById("headerSubtitleText").textContent = t("headerSubtitle");
    document.getElementById("subtitleText").innerHTML = t("subtitle");
    document.getElementById("zoomHint").textContent = t("zoomHint");
    document.getElementById("installBtnLabel").textContent = t("installBtn");
    document.getElementById("exportBtnLabel").textContent = t("exportBtn");
    document.getElementById("probabilityNote").textContent = t("probabilityNote");
    document.getElementById("retryBtn").textContent = t("retry");
    document.documentElement.lang = lang;
    if(!rounds.length){
      // Only refresh the empty-state copy if it's currently showing the
      // generic "waiting" message (don't clobber an active error message).
      setEmptyMessage(t("emptyWaitTitle"), t("emptyWaitText"));
    }
  }
  function setLang(newLang){
    lang = newLang;
    localStorage.setItem("wc2026-lang", lang);
    applyStaticTranslations();
    render();
    updateFollowChip();
    refreshNextMatch();
  }
  document.getElementById("langBtn").addEventListener("click", ()=>{
    const next = LANG_ORDER[(LANG_ORDER.indexOf(lang) + 1) % LANG_ORDER.length];
    setLang(next);
  });
  function applyTheme(){
    document.documentElement.dataset.theme = theme;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if(metaTheme) metaTheme.setAttribute("content", THEME_COLORS[theme]);
    const btn = document.getElementById("themeBtn");
    if(btn){
      const label = t(theme === "dark" ? "themeSwitchToLight" : "themeSwitchToDark");
      btn.textContent = theme === "dark" ? "☀️" : "🌙";
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
  }
  document.getElementById("themeBtn").addEventListener("click", ()=>{
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("wc2026-theme", theme);
    applyTheme();
  });
  applyTheme();
  applyStaticTranslations();
  updateBottomBarOffset();

})();
