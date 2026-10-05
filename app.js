/* V6 FIX - Overlay based on Good count visible to user + debug toast - FIXED AUTO RELOAD + CHART ENABLE */
const tg = window.Telegram?.WebApp || null;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#071426'); tg.setBackgroundColor?.('#071426'); }
const userId = tg?.initDataUnsafe?.user?.id || null;
let BOT_API;
if (location.pathname.includes('/app/')) { BOT_API = new URL('../bot.php', window.location.href).href; } 
else { BOT_API = window.location.origin + window.location.pathname; if (BOT_API.endsWith('/')) BOT_API = BOT_API.slice(0,-1); if (!BOT_API.includes('.php') && !BOT_API.match(/\/\d+$/)) { BOT_API = new URL('./bot.php', window.location.href).href; } if (location.pathname.match(/\/bots\/\d+/)) { BOT_API = window.location.origin + window.location.pathname; } }
const screen = document.getElementById('screen');
const toastEl = document.getElementById('toast');
const telegramUser = tg?.initDataUnsafe?.user || null;
let state = {
 user: telegramUser ? { id: telegramUser.id, name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'User', photo_url: telegramUser.photo_url || '', username: telegramUser.username || '', balance: 0 } : null,
 ads: [], top_referrers: [], top_earners: [], ref_link: '', min_withdraw: 100,
 allowed_countries: ['BD'], allowed_country_names: 'Bangladesh',
 earnings_history: []
};
let currentTab='home'; let selectedMethod=''; let topMode='referrers';
let cachedCountry = null;

function initData(){ return tg?.initData || ''; }
async function api(action,data={}){
 try{
  const _photo = tg?.initDataUnsafe?.user?.photo_url || '';
  const body=new URLSearchParams({action,initData:initData(),start_param:tg?.initDataUnsafe?.start_param||'',photo_url:_photo,...data});
  const r=await fetch(`${BOT_API}?api=1`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Telegram-Init-Data':initData()},body});
  const text=await r.text();
  if(!text.trim().startsWith('{') && !text.trim().startsWith('[')){ if(text.includes('<!doctype')||text.includes('<html')){ const fallbackUrl=new URL('./bot.php?api=1', window.location.href).href; const r2=await fetch(fallbackUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Telegram-Init-Data':initData()},body}); const text2=await r2.text(); try{return JSON.parse(text2);}catch{return{ok:false,message:'Server error'};} } }
  try{return JSON.parse(text);}catch{return{ok:false,message:'Invalid response'};}
 }catch(e){return{ok:false,message:'Network error'};}
}
function toast(msg){ if(!toastEl)return; toastEl.textContent=msg||'Done'; toastEl.style.display='block'; clearTimeout(window._toast); window._toast=setTimeout(()=>{toastEl.style.display='none';},3500); }
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function money(n){return Number(n||0).toFixed(2);}
function userName(){return(state.user?.name||'User');}
function userBalance(){return Number(state.user?.balance||0);}
function userTodayViews(){return Number(state.user?.today_views||0);}
function userMaxDaily(){return Number(state.user?.max_daily||0);}
function userReferrals(){return Number(state.user?.referrals||0);}
function userEarned(){return Number(state.user?.earned||0);}
function userFakeCount(){return Number(state.user?.fake_count||0);}
function userGoodCount(){return Number(state.user?.good_count||0);}

// === Separate Poro/Lijent Counters - Fixed to work instantly ===
let _poroMem = null;
let _lijentMem = null;
function getPoroViews(){
  if(_poroMem !== null) return _poroMem;
  try{
    const v = localStorage.getItem('poro_views_v2');
    const num = v ? parseInt(v)||0 : 0;
    _poroMem = num;
    return num;
  }catch(e){ return _poroMem||0; }
}
function getLijentViews(){
  if(_lijentMem !== null) return _lijentMem;
  try{
    const v = localStorage.getItem('lijent_views_v2');
    const num = v ? parseInt(v)||0 : 0;
    _lijentMem = num;
    return num;
  }catch(e){ return _lijentMem||0; }
}
function savePoroViews(n){
  _poroMem = n;
  try{ localStorage.setItem('poro_views_v2', String(n)); }catch(e){}
}
function saveLijentViews(n){
  _lijentMem = n;
  try{ localStorage.setItem('lijent_views_v2', String(n)); }catch(e){}
}
function incPoroViews(){
  const cur = getPoroViews()+1;
  savePoroViews(cur);
  console.log('Poro inc', cur);
  return cur;
}
function incLijentViews(){
  const cur = getLijentViews()+1;
  saveLijentViews(cur);
  console.log('Lijent inc', cur);
  return cur;
}
function getPoroMax(){ return 70; }
function getLijentMax(){ return 37; }

function getLocalCounts(){ try{ const uid = userId || state.user?.id || 'guest'; const key = 'earn_counts_'+uid; const raw = localStorage.getItem(key); if(raw){ const d = JSON.parse(raw); return {fake: Number(d.fake||0), good: Number(d.good||0)}; } }catch(e){} return {fake:0, good:0}; }
function saveLocalCounts(fake, good){ try{ const uid = userId || state.user?.id || 'guest'; const key = 'earn_counts_'+uid; localStorage.setItem(key, JSON.stringify({fake:fake, good:good, updated:Date.now()})); }catch(e){} }
function incLocalFake(){ const c = getLocalCounts(); c.fake += 1; saveLocalCounts(c.fake, c.good); if(state.user) state.user.fake_count = (Number(state.user.fake_count||0)+1); updateBoxUI(); }
function incLocalGood(){ const c = getLocalCounts(); c.good += 1; saveLocalCounts(c.fake, c.good); if(state.user) state.user.good_count = (Number(state.user.good_count||0)+1); updateBoxUI(); }
function updateTaskCounts(){
  try{
    const poroViews = getPoroViews();
    const lijentViews = getLijentViews();
    const poroMax = getPoroMax();
    const lijentMax = getLijentMax();
    const poroLeft = Math.max(0, poroMax - poroViews);
    const lijentLeft = Math.max(0, lijentMax - lijentViews);
    const pc = document.getElementById('poroCount');
    const lc = document.getElementById('lijentCount');
    const pl = document.getElementById('poroLeft');
    const ll = document.getElementById('lijentLeft');
    if(pc) pc.textContent = `${poroViews}/${poroMax} Left`;
    if(lc) lc.textContent = `${lijentViews}/${lijentMax} Left`;
    if(pl) pl.textContent = `${poroLeft} Left`;
    if(ll) ll.textContent = `${lijentLeft} Left`;
    const homeSmall = document.getElementById('homeTodaySmall');
    if(homeSmall) homeSmall.innerHTML = `<span style="font-size:13px;font-weight:800;">${lijentViews}/${lijentMax} AD</span><br><span style="font-size:13px;font-weight:800;">${poroViews}/${poroMax} MG</span>`;
  }catch(e){ console.log(e); }
}
function updateHomeStatsInstant(){
  try{
    const poroViews = getPoroViews();
    const lijentViews = getLijentViews();
    const poroMax = getPoroMax();
    const lijentMax = getLijentMax();
    const adLijent = document.getElementById('homeAdLijent');
    const adPoro = document.getElementById('homeAdPoro');
    if(adLijent) adLijent.textContent = `${lijentViews}/${lijentMax} AD`;
    if(adPoro) adPoro.textContent = `${poroViews}/${poroMax} MG`;
    const todayEl = document.getElementById('homeTodayAds');
    // fallback for old structure
    if(todayEl && !adLijent){
      todayEl.innerHTML = `<span>${lijentViews}/${lijentMax} AD</span><br><span style="font-size:15px;opacity:0.85;">${poroViews}/${poroMax} MG</span>`;
    }
    const totalEl = document.getElementById('homeTotal');
    if(totalEl) totalEl.textContent = `${userTodayViews()}`;
    const earnedEl = document.getElementById('homeEarned');
    if(earnedEl) earnedEl.textContent = `${money(userEarned())}`;
    const homeSmall = document.getElementById('homeTodaySmall');
    if(homeSmall){ homeSmall.innerHTML = `${lijentViews}/${lijentMax} AD<br>${poroViews}/${poroMax} MG`; }
    updateTaskCounts();
    if(earnedEl) earnedEl.textContent = `${money(userEarned())}`;
  }catch(e){}
}
function updateBoxUI(){ const fakeEl = document.getElementById('fakeNum'); const goodEl = document.getElementById('goodNum'); const fakeCount = state.user?.fake_count ?? getLocalCounts().fake; const goodCount = state.user?.good_count ?? getLocalCounts().good; if(fakeEl) fakeEl.textContent = fakeCount; if(goodEl) goodEl.textContent = goodCount; }

function getLast7DaysData(){
  const out=[];
  const now=new Date();
  for(let i=6;i>=0;i--){
    const d=new Date(now);
    d.setDate(now.getDate()-i);
    const dayStr=String(d.getDate()).padStart(2,'0');
    const full=d.toISOString().split('T')[0];
    let earn=0;
    if(state.earnings_history){
      const found=state.earnings_history.find(x=>x.full_date===full);
      if(found) earn=found.earn;
    }
    out.push({date:dayStr, full_date:full, earn:earn});
  }
  return out;
}
function saveDailyEarn(amount){
  try{
    const today=new Date().toISOString().split('T')[0];
    if(!state.earnings_history) state.earnings_history=getLast7DaysData();
    let found=false;
    for(let item of state.earnings_history){
      if(item.full_date===today){ item.earn+=Number(amount||0); found=true; break; }
    }
    if(!found && state.earnings_history.length){
      state.earnings_history[state.earnings_history.length-1].earn+=Number(amount||0);
    }
  }catch(e){}
}
function drawEarnChart(hist){
  try{
    const canvas=document.getElementById('earnChart');
    if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const dpr=window.devicePixelRatio||1;
    const rect=canvas.getBoundingClientRect();
    canvas.width=rect.width*dpr;
    canvas.height=120*dpr;
    ctx.scale(dpr,dpr);
    const W=rect.width, H=120;
    ctx.clearRect(0,0,W,H);
    if(!hist || !hist.length) return;
    const maxVal=Math.max(...hist.map(h=>h.earn), 5);
    const padding=10;
    const barW=(W - padding*2)/hist.length - 8;
    hist.forEach((h,i)=>{
      const x=padding + i*((W - padding*2)/hist.length);
      const barH=Math.max(4, (h.earn/maxVal)*(H-40));
      const y=H-barH-20;
      const grad=ctx.createLinearGradient(0,y,0,y+barH);
      grad.addColorStop(0,'#12c9e7');
      grad.addColorStop(1,'#665cf4');
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 6);
      ctx.fill();
      if(h.earn>0){
        ctx.fillStyle='#7c8da8';
        ctx.font='10px system-ui';
        ctx.textAlign='center';
        ctx.fillText(money(h.earn), x+barW/2, y-4);
      }
    });
    ctx.strokeStyle='#12c9e733';
    ctx.lineWidth=2;
    ctx.beginPath();
    hist.forEach((h,i)=>{
      const x=padding + i*((W - padding*2)/hist.length) + barW/2;
      const barH=(h.earn/maxVal)*(H-40);
      const y=H-barH-20;
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }catch(e){}
}

let audioCtx=null;
function getAudioCtx(){ if(!audioCtx){ try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){return null;} } return audioCtx; }
function playTok(){ try{ const ctx=getAudioCtx(); if(!ctx)return; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.value=900; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.4,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.35); o.start(); o.stop(ctx.currentTime+0.35); setTimeout(()=>{ try{ const o2=ctx.createOscillator(); const g2=ctx.createGain(); o2.type='sine'; o2.frequency.value=1200; o2.connect(g2); g2.connect(ctx.destination); g2.gain.setValueAtTime(0.25,ctx.currentTime); g2.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.15); o2.start(); o2.stop(ctx.currentTime+0.15);}catch(e){} },80);}catch(e){} }
function playWarningSound(){ try{ const ctx=getAudioCtx(); if(!ctx)return; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sawtooth'; o.frequency.value=200; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.3,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.5); o.start(); o.stop(ctx.currentTime+0.5);}catch(e){} }
async function getUserCountry(force=false){
  if(cachedCountry && !force) return cachedCountry;
  const endpoints = [
    async ()=>{ const r=await fetch('https://ipwho.is/'); const d=await r.json(); if(d && d.country_code) return {code:d.country_code, name:d.country, ip:d.ip}; },
    async ()=>{ const r=await fetch('https://ipapi.co/json/'); const d=await r.json(); if(d && d.country_code) return {code:d.country_code, name:d.country_name, ip:d.ip}; },
    async ()=>{ const r=await fetch('https://api.country.is/'); const d=await r.json(); if(d && d.country) return {code:d.country, name:d.country, ip:d.ip||''}; }
  ];
  for(let fn of endpoints){ try{ const res=await fn(); if(res){ cachedCountry=res; return res; } }catch(e){ continue; } }
  return null;
}
function hero(){
 const telegramName=[tg?.initDataUnsafe?.user?.first_name,tg?.initDataUnsafe?.user?.last_name].filter(Boolean).join(' ')||tg?.initDataUnsafe?.user?.username||userName();
 const cleanName=telegramName.replace(/[^\w\s\u0000-\u007F]/g,'').trim()||telegramName||'User';
 const telegramPhoto=state.user?.photo_url||tg?.initDataUnsafe?.user?.photo_url||'';
 const firstLetter=(cleanName||'U').charAt(0).toUpperCase();
 const avatarContent=telegramPhoto?`<img src="${esc(telegramPhoto)}" alt="${esc(cleanName)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"><div class="avatar-fallback" style="display:none;">${esc(firstLetter)}</div>`:`<div class="avatar-fallback">${esc(firstLetter)}</div>`;
 return `<section class="hero"><div class="avatar-wrap"><div class="avatar">${avatarContent}</div><div class="verified-badge">✓</div></div><div class="name">${esc(cleanName)}</div><div class="balance-pill">Balance: <span id="balanceText">${money(userBalance())} TK</span></div></section>`;
}
function earnHero(){
 const telegramName=[tg?.initDataUnsafe?.user?.first_name,tg?.initDataUnsafe?.user?.last_name].filter(Boolean).join(' ')||tg?.initDataUnsafe?.user?.username||userName();
 const cleanName=telegramName.replace(/[^\w\s\u0000-\u007F]/g,'').trim()||telegramName||'User';
 const telegramPhoto=state.user?.photo_url||tg?.initDataUnsafe?.user?.photo_url||'';
 const firstLetter=(cleanName||'U').charAt(0).toUpperCase();
 const avatarContent=telegramPhoto?`<img src="${esc(telegramPhoto)}" alt="${esc(cleanName)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"><div class="avatar-fallback" style="display:none;">${esc(firstLetter)}</div>`:`<div class="avatar-fallback">${esc(firstLetter)}</div>`;
 const local = getLocalCounts();
 const fakeCount = state.user?.fake_count ?? local.fake;
 const goodCount = state.user?.good_count ?? local.good;
 return `<section class="hero">
   <div class="hero-earn-row">
     <div class="hero-box fake"><div class="box-num" id="fakeNum">${fakeCount}</div><div class="box-label">Fake Kaj</div></div>
     <div class="avatar-wrap"><div class="avatar">${avatarContent}</div><div class="verified-badge">✓</div></div>
     <div class="hero-box good"><div class="box-num" id="goodNum">${goodCount}</div><div class="box-label">Good Working</div></div>
   </div>
   <div class="name">${esc(cleanName)}</div>
   <div class="balance-pill">Balance: <span id="balanceText">${money(userBalance())} TK</span></div>
 </section>`;
}
function heroHomeWithAdmin(){
 const telegramName=[tg?.initDataUnsafe?.user?.first_name,tg?.initDataUnsafe?.user?.last_name].filter(Boolean).join(' ')||tg?.initDataUnsafe?.user?.username||userName();
 const cleanName=telegramName.replace(/[^\w\s\u0000-\u007F]/g,'').trim()||telegramName||'User';
 const telegramPhoto=state.user?.photo_url||tg?.initDataUnsafe?.user?.photo_url||'';
 const firstLetter=(cleanName||'U').charAt(0).toUpperCase();
 const avatarContent=telegramPhoto?`<img src="${esc(telegramPhoto)}" alt="${esc(cleanName)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"><div class="avatar-fallback" style="display:none;">${esc(firstLetter)}</div>`:`<div class="avatar-fallback">${esc(firstLetter)}</div>`;
 return `<section class="hero home-hero-admin">
   <div class="home-hero-row">
     <div class="dev-card">
       <div class="dev-label" style="font-size:13px;font-weight:800;letter-spacing:1px">DEVELOPER</div>
              <div class="dev-avatar"><img src="data:image/jpeg;base64,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" alt="Noyon" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>
       <div style="font-size:18px;font-weight:900;color:#fff;margin-top:8px;letter-spacing:0.5px;text-transform:uppercase">E NOYON</div>
     </div>
     <div class="user-card">
       <div class="avatar-wrap"><div class="avatar">${avatarContent}</div><div class="verified-badge">✓</div></div>
       <div class="name">${esc(cleanName)}</div>
       <div class="balance-pill">Balance: <span id="balanceText">${money(userBalance())} TK</span></div>
     </div>
   </div>
 </section>`;
}
function renderHome(){ 
  if(!screen)return; 
  const hist = (state.earnings_history && state.earnings_history.length) ? state.earnings_history : getLast7DaysData();
  const total7 = hist.reduce((a,b)=>a+Number(b.earn||0),0);
  const datesHtml = hist.map(d=>`<span>${esc(d.date)}</span>`).join('');
  screen.innerHTML=`
  ${heroHomeWithAdmin()}
  <div class="wrap">
    <div class="top-link-wrap">
      <a href="https://t.me/SmartWorkCommunity" target="_blank" class="home-btn btn-official">✨ Official Telegram 🎯</a>
      <a href="https://t.me/noyonfb1020" target="_blank" class="home-btn btn-botlink">✨ Bot Link ♻️ Admin ID</a>
    </div>
    <div class="stats">
      <div class="stat"><div class="label">TODAY'S ADS</div><div class="value" id="homeTodayAds" style="font-size:18px;line-height:1.2;font-weight:800;"><span id="homeAdLijent">${getLijentViews()}/${getLijentMax()} AD</span><br><span id="homeAdPoro" style="font-size:15px;opacity:0.85;">${getPoroViews()}/${getPoroMax()} MG</span></div></div>
      <div class="stat"><div class="label">REFERRALS</div><div class="value" id="homeRef">${userReferrals()}</div></div>
      <div class="stat"><div class="label">TOTAL VIEW</div><div class="value" id="homeTotal">${userTodayViews()}</div></div>
      <div class="stat"><div class="label">EARNED</div><div class="value" id="homeEarned">${money(userEarned())}</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Last 7 Days Earnings - মোট: ${money(total7)} TK</div>
      <canvas id="earnChart" style="width:100%; height:120px; margin-top:15px;"></canvas>
      <div class="chart-dates">${datesHtml}</div>
      <div style="margin-top:10px; font-size:11px; color:#7c8da8; text-align:center;">আজকের আর্নিং: ${money(hist[hist.length-1]?.earn||0)} TK</div>
    </div>
  </div>`;
  setTimeout(()=>drawEarnChart(hist), 150);
}
function renderTasks(){
 if(!screen)return;
 const poroViews = getPoroViews();
 const lijentViews = getLijentViews();
 const poroMax = getPoroMax();
 const lijentMax = getLijentMax();
 const poroLeft = Math.max(0, poroMax - poroViews);
 const lijentLeft = Math.max(0, lijentMax - lijentViews);
 screen.innerHTML=`${earnHero()}
 <div class="wrap" style="margin-top:-8px;">
   <div class="vpn-badges-row" style="margin-top:4px;margin-bottom:10px;">
     <div class="vpn-badge left" id="vpnBadgeLeft"><div class="badge-label">VPN / PROXY</div><div class="badge-value" id="vpnLeftValue">Checking...</div></div>
     <div class="vpn-badge right" id="vpnBadgeRight"><div class="badge-label">COUNTRY</div><div class="badge-value" id="vpnRightValue">--</div></div>
   </div>
   <div id="rewardAnimWrap" class="reward-anim-wrap" style="display:none;"><div id="rewardAnimText" class="reward-anim-text"></div></div>
   <div class="card" id="mainBalanceCard" style="padding:12px 16px;margin-top:6px;margin-bottom:12px;min-height:72px;transition:all 0.3s ease"><div id="mainBalanceInner"><div class="section-title" style="margin:0;font-size:12px;">Main Balance</div><div style="font-size:28px;font-weight:900;margin-top:4px;line-height:1.2;" id="mainBalanceBig">${money(userBalance())} TK</div></div></div>
   <div class="section-title" style="margin-top:10px;margin-bottom:8px;">Watch & Earn</div>
   <div class="earn-grid" style="margin-top:0;gap:12px;">
    <button id="poroBtn" class="premium-earn-btn poro" style="padding:9px 8px;">
      <div class="earn-icon" style="width:26px;height:26px;font-size:14px;">▶</div>
      <div class="earn-text"><b>Poro Earn</b><small id="poroCount" style="font-size:13px;font-weight:800;opacity:1;">${poroViews}/${poroMax} Left</small><small style="font-size:12px;color:#8ec8ff;margin-top:2px;display:block;font-weight:800;" id="poroSub">MG</small></div>
    </button>
    <button id="lijentBtn" class="premium-earn-btn lijent" style="padding:9px 8px;">
      <div class="earn-icon" style="width:26px;height:26px;font-size:14px;">⚡</div>
      <div class="earn-text"><b>Lijent Earn</b><small id="lijentCount" style="font-size:13px;font-weight:800;opacity:1;">${lijentViews}/${lijentMax} Left</small><small style="font-size:12px;color:#ffb86e;margin-top:2px;display:block;font-weight:800;" id="lijentSub">AD</small></div>
    </button>
   </div>
   <div class="section-title" style="margin-top:14px;margin-bottom:8px">Bonus Tasks</div>
   <div class="card" style="padding:12px;"><b>More tasks coming soon</b><div class="reward" style="margin-top:6px">Only verified tasks should be added.</div></div>
  </div>
  <div id="adInstructionOverlay" class="overlay hidden">
    <div class="overlay-card"><div class="overlay-icon">📢</div><h3>Important Notice</h3><p class="overlay-text">15 second ad dekhe ad er upor click kore<br>ad view korte hobe<br><br><span class="highlight">Ad click korar por theke 33 second porjonto wait korte hobe!<br>25s eo fire asle taka add hobe na!</span></p><div class="overlay-timer" id="overlayTimer">5</div><p class="overlay-sub">Ad click theke 33s countdown</p><button class="gradient-btn" id="overlayContinueBtn">Bujhechi, Ad Dekhbo</button></div>
  </div>
  <div id="vpnOverlay" class="overlay hidden"><div class="overlay-card vpn-card"><div class="overlay-icon">🌍</div><h3>Location Problem!</h3><p class="overlay-text" id="vpnText">Apnar location thik nei!<br><br>VPN othoba Proxy use kore<br><span id="vpnRequiredCountry" class="highlight">Bangladesh (BD)</span><br>country connect korun,<br>tar por ad dekhte parben.</p><div class="vpn-info" id="vpnInfo"></div><button class="gradient-btn" id="vpnCloseBtn" style="background:linear-gradient(90deg,#ff4d4d,#ff8a4d);">Thik Ache, Bujhechi</button></div></div>`;
 setupEarnButtons(); setTimeout(updateVpnBadges, 100);
}
async function updateVpnBadges(){
  const leftVal = document.getElementById('vpnLeftValue'); const rightVal = document.getElementById('vpnRightValue');
  const leftBadge = document.getElementById('vpnBadgeLeft'); const rightBadge = document.getElementById('vpnBadgeRight');
  if(!leftVal || !rightVal) return;
  const country = await getUserCountry();
  if(!country){ leftVal.textContent = 'Unknown'; rightVal.textContent = '--'; return; }
  const allowed = state.allowed_countries || ['BD']; const isAllowed = allowed.includes(country.code);
  leftVal.textContent = isAllowed ? 'Connected OK' : country.name;
  if(!isAllowed) leftBadge.classList.add('warning'); else leftBadge.classList.remove('warning');
  rightVal.textContent = country.code + ' - ' + country.name.substring(0,10);
  if(!isAllowed) rightBadge.classList.add('warning'); else rightBadge.classList.remove('warning');
}
function renderTop(){ if(!screen)return; const referrers=Array.isArray(state.top_referrers)?state.top_referrers:[]; const earners=Array.isArray(state.top_earners)?state.top_earners:[]; let list=topMode==='referrers'?referrers:earners; screen.innerHTML=`${hero()}<div class="wrap"><div class="tabs"><button class="${topMode==='referrers'?'active':''}" onclick="showTop('referrers')">Top Referrers</button><button class="${topMode==='earners'?'active':''}" onclick="showTop('earners')">Top Earners</button></div>${list.length?list.map((x,i)=>{ const rawName=x.name||x.first_name||'User'; const name=String(rawName).replace(/[^\w\s\u0980-\u09FF]/g,'').trim()||'User'; let value=topMode==='referrers'?Number(x.referrals||x.count||0):money(x.earned||x.balance||0)+' TK'; const photo=x.photo_url||x.avatar||x.profile_pic||x.image||x.pic||''; let avatarHtml=''; if(photo){ avatarHtml=`<img src="${esc(photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div style="display:none;width:100%;height:100%;place-items:center;background:linear-gradient(135deg,#1ec8e8,#7b5cff);color:#fff;font-weight:800;">${esc(name.charAt(0).toUpperCase())}</div>`; }else{ const colors=['#1ec8e8','#7b5cff','#00c853','#ff6b35','#ffd600']; const bg=colors[i%colors.length]; avatarHtml=`<div style="width:100%;height:100%;display:grid;place-items:center;background:${bg};color:#fff;font-weight:800;border-radius:50%;">${esc(name.charAt(0).toUpperCase())}</div>`; } return `<div class="leader" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#0e1f35;border:1px solid #1d3048;border-radius:14px;margin-bottom:10px;"><div class="rank" style="color:#1ec8e8;font-weight:800;min-width:36px;">#${i+1}</div><div class="avatar-sm" style="width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #1d3048;">${avatarHtml}</div><div class="leader-name" style="flex:1;font-weight:600;">${esc(name)}</div><div class="count" style="color:#1ec8e8;font-weight:700;">${esc(String(value))}</div></div>`;}).join(''):`<div class="empty" style="text-align:center;padding:40px;color:#7c8da8;">No data yet.</div>`}</div>`; }

function showTop(type){topMode=type;renderTop();}
function renderProfile(){ if(!screen)return; screen.innerHTML=`${hero()}<div class="wrap"><div class="card"><div class="section-title">Referral</div><div class="reward">Earn 10% bonus.</div><input class="input" value="${esc(state.ref_link||'')}" readonly onclick="this.select()"><button class="gradient-btn" onclick="copyRef()">Copy Link</button></div><div class="card"><div class="section-title">Withdraw Money</div><div class="reward">Minimum: ${money(state.min_withdraw)} TK</div><div style="margin-top:16px"><b>Payment Method</b></div><div class="method-grid" style="margin:10px 0 14px"><button class="method ${selectedMethod==='bkash'?'selected':''}" onclick="selectMethod('bkash')">bKash</button><button class="method ${selectedMethod==='nagad'?'selected':''}" onclick="selectMethod('nagad')">Nagad</button><button class="method ${selectedMethod==='rocket'?'selected':''}" onclick="selectMethod('rocket')">Rocket</button></div><input id="account" class="input" placeholder="Wallet number"><input id="amount" class="input" type="number" placeholder="Amount (TK)"><button class="gradient-btn" onclick="withdraw()">Request Withdraw</button></div><div class="card" id="withdrawHistoryCard"><div class="section-title">Withdraw History</div><div id="withdrawHistoryList" style="margin-top:12px;color:#8aa0bb;font-size:14px">Loading...</div></div><div class="card" style="background:linear-gradient(135deg,#1a2a45 0%,#162236 100%);border:1px solid #2a4a6b"><div class="section-title" style="color:#4fc3f7">📜 Rules</div><div style="white-space:pre-wrap;line-height:1.7;font-size:14px;color:#c8d6e5;margin-top:10px">❤️ আসসালামু আলাইকুম ❤️

✅ 💎 ᴍᴏɴᴇʏ ᴍᴀx ʙᴏᴛ 💰

✅ Vpn দিয়ে কাজ করতে হবে 

✅ United States , New Zealand, canada

✅ 10 টা রেফার করতে হবে একবার করলে ওই হবে  withdrawal দিতে পারবেন 

✅ মিনিমাম 10 সর্বোচ্চ 100 টাকা 

✅ বিকাশ, নগত , রিচার্জ, Payeer USD, TRX

✅ withdrawal চার্জ 

❇️ বিকাশ 100 হলে 5 টাকা কম✅
100 কম হলে  কাটবে না ❌ 

 ❇️ নগত   ৫ টাকা কম পাবেন ✅

❇️ Payeer USD 5% কম পাবেন ✅ 

❇️ TRX 5% কম পাবেন ✅
 

💸 সবাই সঠিক নিয়মে কাজ করবেন ইনশাল্লাহ সব সময় পেমেন্ট পাবেন✅ vpn ছাড়া কাজ করলে পাবেন না ❌</div></div></div>`;
  setTimeout(loadWithdrawHistory, 200);
}
async function loadWithdrawHistory(){
  const listEl = document.getElementById('withdrawHistoryList');
  if(!listEl) return;
  try{
    const res = await api('withdraw_history');
    if(!res.ok || !res.history){ listEl.innerHTML='<div style="color:#8aa0bb">No history yet</div>'; return; }
    const h = res.history;
    if(h.length===0){ listEl.innerHTML='<div style="color:#8aa0bb">No withdraw request yet</div>'; return; }
    let html='';
    for(const w of h){
      const status = (w.status||'pending').toLowerCase();
      let badgeColor='#f1c40f';
      let badgeText='Pending';
      if(status==='approved'){ badgeColor='#2ecc71'; badgeText='Approved'; }
      else if(status==='rejected'){ badgeColor='#e74c3c'; badgeText='Rejected'; }
      const date = w.created_at ? new Date(w.created_at).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'}) : '';
      html+=`<div style="background:#0e1e35;border:1px solid #1e3458;border-radius:12px;padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:600;color:#fff">${w.amount} TK - ${esc(w.method||'').toUpperCase()} - ${esc(w.account||'')}</div><div style="font-size:12px;color:#7a8ca8;margin-top:4px">${esc(date)}</div></div><div style="background:${badgeColor};color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">${badgeText}</div></div>`;
    }
    listEl.innerHTML=html;
  }catch(e){
    listEl.innerHTML='<div style="color:#e74c3c">Failed to load history</div>';
  }
}

function render(){ if(currentTab==='home')renderHome(); if(currentTab==='tasks')renderTasks(); if(currentTab==='top')renderTop(); if(currentTab==='profile')renderProfile(); }

let welcomeNoticeShown = false;
function showWelcomeNotice(){
  try{
    if(welcomeNoticeShown) return;
    welcomeNoticeShown = true;
    const noticeEl = document.getElementById('notice');
    if(noticeEl){
      noticeEl.innerHTML = `
      <div style="background:#1e2f4a;border-radius:28px;padding:24px;width:min(94%,400px);max-height:92vh;overflow-y:auto;position:relative;border:1px solid #2a4a6b;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
        <button onclick="closeWelcomeNotice()" style="position:absolute;right:16px;top:12px;background:#0a172b;border:1px solid #2a4a6b;color:#8aa0bb;font-size:18px;width:32px;height:32px;border-radius:50%;cursor:pointer;">✕</button>
        <h2 style="text-align:center;color:#1ec8e8;margin:0 0 18px 0;font-size:28px;font-weight:900;letter-spacing:1px;">Notice</h2>
        <div style="background:#000;border-radius:16px;padding:16px;margin-bottom:14px;border:1px solid #1a2a3a;">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
            <span style="color:#fff;font-weight:900;font-size:20px;letter-spacing:1px;">TIME ZONE</span>
            <span style="font-size:20px;">🔰</span>
          </div>
          <div style="background:#0a0a0a;border-radius:10px;padding:10px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1a1a1a;">
              <div>
                <div style="color:#aaa;font-size:12px;">Sydney, Canberra</div>
                <div style="color:#666;font-size:10px;">GMT+10:00</div>
              </div>
              <span style="color:#ff2d2d;font-size:18px;">↗️</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">
              <div>
                <div style="color:#aaa;font-size:12px;">Vladivostok</div>
                <div style="color:#666;font-size:10px;">GMT+10:00</div>
              </div>
              <span style="color:#ff2d2d;font-size:18px;">↗️</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:14px 0 10px 0;">
            <span style="color:#fff;font-weight:900;font-size:16px;">PROXY 🌐 VPN COUNTRY</span>
            <span>🔰</span>
          </div>
          <div style="background:#fff;border-radius:10px;padding:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:1px solid #eee;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;background:#012169;border-radius:50%;display:grid;place-items:center;font-size:12px;">🇦🇺</span><span style="color:#000;font-size:13px;font-weight:600;">Australia 1</span></div>
              <div style="display:flex;align-items:center;gap:6px;"><span style="color:#666;font-size:11px;">336ms</span><span style="color:#00c853;">▲</span></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:1px solid #eee;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;background:#012169;border-radius:50%;display:grid;place-items:center;font-size:12px;">🇦🇺</span><span style="color:#000;font-size:13px;font-weight:600;">Australia 2</span></div>
              <div style="display:flex;align-items:center;gap:6px;"><span style="color:#666;font-size:11px;">325ms</span><span style="color:#00c853;">▲</span></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;background:#012169;border-radius:50%;display:grid;place-items:center;font-size:12px;">🇦🇺</span><span style="color:#000;font-size:13px;font-weight:600;">Australia 3</span></div>
              <div style="display:flex;align-items:center;gap:6px;"><span style="color:#666;font-size:11px;">234ms</span><span style="color:#00c853;">▲</span></div>
            </div>
          </div>
          <button onclick="triggerAdFromNotice()" style="width:100%;margin-top:12px;padding:12px;background:linear-gradient(90deg,#1ec8e8,#7b5cff);border:0;border-radius:10px;color:#fff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(30,200,232,0.4);">অ্যাড দেখতে ক্লিক করুন 🔰 - Click Here</button>
        </div>
        <div style="background:#0f223a;border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid #1e3a5a;">
          <p style="font-size:14px;line-height:1.7;color:#e0f0ff;margin:0;">
            📢<b>কাজের নিয়ম</b> VPN +proxy দিয়ে এড দেখতে হবে ✅ 1 টা অ্যাড দেখে ১৫ সেকেন্ড পর ক্লিক করতে হবে 2 সেকেন্ড থাকতে হবে ▶️ VPN কান্ট্রি 👉 Australia 🎯
          </p>
        </div>
        <button onclick="closeWelcomeNotice()" style="width:100%;padding:15px;border-radius:14px;border:0;background:linear-gradient(90deg,#7b5cff,#1ec8e8);color:#fff;font-weight:800;font-size:16px;cursor:pointer;">Close</button>
      </div>`;
      noticeEl.style.display='grid';
      noticeEl.style.placeItems='center';
    }
  }catch(e){}
}
function closeWelcomeNotice(){
  const noticeEl = document.getElementById('notice');
  if(noticeEl) noticeEl.style.display='none';
}
async function triggerAdFromNotice(){
  try{
    closeWelcomeNotice();
    // Go to Earning page instead of direct ad
    if(typeof goTab === 'function'){
      goTab('tasks');
    } else if(typeof showTab === 'function'){
      showTab('tasks');
    } else {
      // fallback: switch tab
      currentTab='tasks';
      render();
    }
  }catch(e){ closeWelcomeNotice(); }
}


async function load(){ 
  const loadStart = Date.now();
  if(screen){screen.innerHTML=`<div style="min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;"><div style="width:48px;height:48px;border:4px solid #1d3048;border-top-color:#12c9e7;border-radius:50%;animation:spin 1s linear infinite;"></div><b>Loading User...</b><style>@keyframes spin{to{transform:rotate(360deg)}}</style></div>`;} 
  const x=await api('bootstrap'); 
  const elapsed = Date.now() - loadStart;
  if(elapsed < 3000){
    await new Promise(r=>setTimeout(r, 3000 - elapsed));
  }
  if(!x||!x.ok){ if(screen){screen.innerHTML=`<div style="min-height:70vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;"><div class="card" style="width:100%;max-width:420px;"><div style="font-size:20px;font-weight:900;margin-bottom:10px;">App Connection Error</div><div class="reward">${esc(x?.message||'Open from Telegram')}</div><button class="gradient-btn" style="margin-top:16px" onclick="load()">Retry</button></div></div>`;}return;} 
  state={...state,...x}; 
  if(x.user)state.user={...state.user,...x.user}; 
  if(x.allowed_countries && Array.isArray(x.allowed_countries)) state.allowed_countries = x.allowed_countries; 
  if(x.allowed_country_names) state.allowed_country_names = x.allowed_country_names; 
  try{
    const local = getLocalCounts();
    const serverFake = Number(state.user?.fake_count||0);
    const serverGood = Number(state.user?.good_count||0);
    if(serverFake>local.fake || serverGood>local.good){ saveLocalCounts(Math.max(local.fake, serverFake), Math.max(local.good, serverGood)); }
    else if(local.fake>serverFake || local.good>serverGood){ if(state.user){ state.user.fake_count = Math.max(serverFake, local.fake); state.user.good_count = Math.max(serverGood, local.good); } }
  }catch(e){}
  if(x.earnings_history) state.earnings_history = x.earnings_history;
  render(); 
  if(currentTab==="home") { renderHome(); showWelcomeNotice(); }
  getUserCountry().then(()=>{ if(currentTab==='tasks') updateVpnBadges(); }); 
}

async function refreshHomeData(){
  try{
    const x=await api('bootstrap');
    if(x && x.ok){
      state={...state,...x};
      if(x.user) state.user={...state.user,...x.user};
      if(x.earnings_history) state.earnings_history=x.earnings_history;
      if(currentTab==='home') renderHome();
    }
  }catch(e){}
}
function go(tab){ 
  currentTab=tab; 
  document.querySelectorAll('.bottom-nav button').forEach(button=>{button.classList.toggle('active',button.dataset.tab===tab);}); 
  if(tab==='home'){
    render();
    refreshHomeData();
    showWelcomeNotice();
  }else{
    render();
  }
  if(tg?.HapticFeedback)tg.HapticFeedback.impactOccurred('light'); 
}
document.querySelectorAll('.bottom-nav button').forEach(button=>{button.addEventListener('click',()=>go(button.dataset.tab));});

function updateBalanceDisplay(balance){ if(balance===undefined||balance===null||balance==='')return; const numericBalance=Number(balance); if(!Number.isFinite(numericBalance))return; if(!state.user)state.user={}; state.user.balance=numericBalance; const balanceText=document.getElementById('balanceText'); if(balanceText)balanceText.textContent=`${money(numericBalance)} TK`; const big=document.getElementById('mainBalanceBig'); if(big){big.textContent=`${money(numericBalance)} TK`; big.classList.add('balance-pop'); setTimeout(()=>big.classList.remove('balance-pop'),600);} 
 const homeEarned=document.getElementById('homeEarned');
 if(homeEarned) homeEarned.textContent=`${money(state.user.earned||0)}`;
}
async function rewardFromBot(task){ if(!userId)throw new Error('Telegram user ID is unavailable'); if(!['poro','lijent'].includes(task))throw new Error('Invalid task'); const reward=await api('reward',{task:task}); if(!reward||!reward.ok)throw new Error(reward?.message||'Reward failed'); const newBalance=reward?.balance??reward?.new_balance??reward?.user?.balance??reward?.data?.balance; if(newBalance!==undefined)updateBalanceDisplay(newBalance); if(reward.good_count!==undefined){ if(state.user) state.user.good_count = reward.good_count; const local=getLocalCounts(); saveLocalCounts(local.fake, reward.good_count); updateBoxUI(); } if(reward.daily_earnings) state.earnings_history=reward.daily_earnings; return reward; }
function showAdInstructionOverlay(){
  return new Promise((resolve, reject)=>{
    const overlay=document.getElementById('adInstructionOverlay'); const timerEl=document.getElementById('overlayTimer'); const btn=document.getElementById('overlayContinueBtn');
    if(!overlay){ resolve(); return; }
    overlay.classList.remove('hidden'); overlay.style.display='grid';
    let count=5; timerEl.textContent=count;
    let clicked = false;
    const interval=setInterval(()=>{ 
      count--; 
      if(count>=0) timerEl.textContent=count; 
      if(count<=0){ 
        clearInterval(interval); 
        if(!clicked){
          // Auto close after 5 sec if not clicked - as per user request
          overlay.style.display='none'; overlay.classList.add('hidden');
          reject('timeout');
        }
      } 
    },1000);
    btn.onclick=()=>{ 
      clicked=true;
      clearInterval(interval); 
      overlay.style.display='none'; 
      overlay.classList.add('hidden'); 
      resolve(); 
    };
  });
}
function showVpnWarning(userCountry){
  return new Promise((resolve)=>{
    const overlay=document.getElementById('vpnOverlay'); const info=document.getElementById('vpnInfo'); const btn=document.getElementById('vpnCloseBtn'); const reqCountryEl=document.getElementById('vpnRequiredCountry');
    if(!overlay){ resolve(); return; }
    const allowed = state.allowed_countries.join(', ') || 'BD'; const allowedName = state.allowed_country_names || 'Bangladesh (BD)';
    reqCountryEl.textContent = allowedName + ' (' + allowed + ')';
    if(userCountry){ info.innerHTML = `Apnar Current: <b>${esc(userCountry.name)} (${esc(userCountry.code)})</b><br>IP: ${esc(userCountry.ip||'')}`; }else{ info.innerHTML = `Location detect hoy ni.`; }
    overlay.classList.remove('hidden'); overlay.style.display='grid';
    btn.onclick=()=>{ overlay.style.display='none'; overlay.classList.add('hidden'); resolve(); };
    playWarningSound();
  });
}
async function logFakeAttempt(){ try{ incLocalFake(); await api('fake_log',{}); }catch(e){} }

function setMainBalanceState(type, data={}){
  const card = document.getElementById('mainBalanceCard');
  const inner = document.getElementById('mainBalanceInner');
  if(!card || !inner) return;
  if(type==='normal'){
    const bal = data.balance !== undefined ? data.balance : userBalance();
    inner.innerHTML=`<div class="section-title" style="margin:0;font-size:12px;">Main Balance</div><div style="font-size:28px;font-weight:900;margin-top:4px;line-height:1.2;" id="mainBalanceBig">${money(bal)} TK</div>`;
    card.style.background=''; card.style.border='';
  } else if(type==='loading'){
    inner.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:4px 0"><div style="width:38px;height:38px;border-radius:50%;background:#0a1629;display:grid;place-items:center;border:1px solid #1e3458;flex-shrink:0"><span style="font-size:18px">👁️</span></div><div><div style="font-size:10px;letter-spacing:1px;color:#7a8ca8;font-weight:700">MANUAL</div><div style="font-size:15px;font-weight:800;color:#fff;margin-top:1px">Loading Ad...</div></div></div>`;
    card.style.background='linear-gradient(135deg,#0e1e35 0%,#132a4a 100%)'; card.style.border='1px solid #1e4a7a';
  } else if(type==='served'){
    inner.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:4px 0"><div style="width:38px;height:38px;border-radius:50%;background:#2ecc71;display:grid;place-items:center;flex-shrink:0;box-shadow:0 0 15px rgba(46,204,113,0.4)"><span style="font-size:18px;color:#fff">✓</span></div><div style="flex:1"><div style="font-size:10px;letter-spacing:1px;color:#7a8ca8;font-weight:700">COMPLETED</div><div style="font-size:15px;font-weight:800;color:#fff;margin-top:1px">Ad Served</div></div></div>`;
    card.style.background='linear-gradient(135deg,#0e2a1e 0%,#132f25 100%)'; card.style.border='1px solid #1e7a52';
  } else if(type==='added'){
    const amt = data.amount || 7;
    inner.innerHTML=`<div style="text-align:center;padding:2px 0"><div style="font-size:26px;font-weight:900;color:#2ecc71;line-height:1">+${amt} TK</div><div style="font-size:12px;font-weight:700;color:#2ecc71;margin-top:3px">Balance Added!</div><div style="font-size:11px;color:#8ec8a8;margin-top:4px;font-weight:600">Apnar Balance Add Hoyese ✅</div></div>`;
    card.style.background='linear-gradient(135deg,#0e2a1e 0%,#132f25 100%)'; card.style.border='1px solid #1e7a52';
  } else if(type==='warning'){
    inner.innerHTML=`<div style="text-align:center;padding:2px 0"><div style="font-size:13px;font-weight:800;color:#f1c40f">⚠️ ${data.msg||'Sabdhan!'}</div><div style="font-size:11px;color:#c8b86e;margin-top:3px">${data.sub||''}</div></div>`;
    card.style.background='linear-gradient(135deg,#2a2310 0%,#2f2815 100%)'; card.style.border='1px solid #7a6a1e';
  } else if(type==='withdraw'){
    inner.innerHTML=`<div style="text-align:center;padding:4px 0"><div style="font-size:13px;font-weight:800;color:#4fc3f7">✅ Withdraw Request Sent!</div><div style="font-size:14px;font-weight:900;color:#fff;margin-top:2px">${data.amount||''} TK</div></div>`;
    card.style.background='linear-gradient(135deg,#0e1e35 0%,#1a2f4a 100%)'; card.style.border='1px solid #2a6aaa';
  }
}

async function watchAd(btnId){
 const btn=document.getElementById(btnId); if(!btn)return; if(btn.disabled)return;
 const originalHTML=btn.innerHTML; btn.disabled=true;
 const wrap=document.getElementById('rewardAnimWrap'); const txt=document.getElementById('rewardAnimText');
 if(wrap) wrap.style.display='none';
 try{
  btn.innerHTML='<div class="earn-text"><b>Checking Location...</b></div>';
  const userCountry = await getUserCountry(); const allowedList = state.allowed_countries || ['BD'];
  if(userCountry && allowedList.length > 0 && !allowedList.includes(userCountry.code)){ await showVpnWarning(userCountry); btn.innerHTML=originalHTML; btn.disabled=false; await updateVpnBadges(); setMainBalanceState('normal'); return; }
  const goodCount = userGoodCount() || getLocalCounts().good;
  const nextAdNumber = goodCount + 1;
  const isStrictMode = (nextAdNumber % 5 === 0);
  if(!isStrictMode){
    const remaining = 5 - (nextAdNumber % 5);
    toast(`${remaining} ta ad por 33s overlay asbe (${nextAdNumber}/5)`);
  } else {
    toast(`Eita ${nextAdNumber} number ad - 33s lagbe!`);
  }
  if(isStrictMode){ try{ await showAdInstructionOverlay(); }catch(e){ if(e==='timeout'){ btn.innerHTML=originalHTML; btn.disabled=false; setMainBalanceState('normal'); return; } } }
  let task=''; 
  setMainBalanceState('loading');
  btn.innerHTML='<div class="earn-text"><b>Opening Ad...</b></div>';
  const startTime = Date.now();
  if(btnId==='poroBtn'){ task='poro'; if(typeof window.show_10483352!=='function')throw new Error('Ad not ready'); await window.show_10483352(); }
  else if(btnId==='lijentBtn'){ task='lijent'; if(typeof window.showAdspark==='function')await window.showAdspark(); else if(typeof window.showAdsparkPopup==='function')await window.showAdsparkPopup({ymid:tg?.initDataUnsafe?.user?.id}); else throw new Error('Ad not ready'); }
  const endTime = Date.now(); const watchedSeconds = (endTime - startTime)/1000; const required = isStrictMode ? 33 : 15;
  if(watchedSeconds < required - 0.5){
    setMainBalanceState('warning', {msg: isStrictMode ? `Sabdhan! 33s Purno Korun!` : `Sabdhan! 15s Dekhun!`, sub: `Apni ${watchedSeconds.toFixed(1)}s dekhechen`});
    playWarningSound(); if(tg?.HapticFeedback)tg.HapticFeedback.notificationOccurred('error'); toast(isStrictMode ? '33s lagbe!' : '15s lagbe!'); await logFakeAttempt();
    setTimeout(()=>{ setMainBalanceState('normal'); },3000); return;
  }
  btn.innerHTML='<div class="earn-text"><b>Claiming...</b></div>';
  setMainBalanceState('served');
  await new Promise(r=>setTimeout(r,1500));
  const reward=await rewardFromBot(task);
  setMainBalanceState('added', {amount: reward.reward||0});
  saveDailyEarn(reward.reward||0);
  playTok(); if(tg?.HapticFeedback)tg.HapticFeedback.notificationOccurred('success'); toast(`+${reward.reward||0} TK added!`);
  const updatedBalance=reward?.balance??reward?.new_balance??reward?.user?.balance??reward?.data?.balance;
  if(updatedBalance!==undefined){
    setTimeout(()=>{ setMainBalanceState('normal', {balance: updatedBalance}); updateBalanceDisplay(updatedBalance); },3000);
  } else {
    setTimeout(()=>{ setMainBalanceState('normal'); },3000);
  }
  if(task === 'poro'){ incPoroViews(); }else if(task === 'lijent'){ incLijentViews(); }
  try{
    const fresh = await api('bootstrap');
    if(fresh && fresh.ok && fresh.user){
      state.user = {...state.user, ...fresh.user};
      if(fresh.earnings_history) state.earnings_history = fresh.earnings_history;
      if(fresh.ads) state.ads = fresh.ads;
      const big = document.getElementById('mainBalanceBig');
      if(big) big.textContent = `${money(state.user.balance)} TK`;
      updateBoxUI(); updateHomeStatsInstant();
      if(currentTab==='home'){ renderHome(); }
    }
  }catch(e){}
  incLocalGood();
  try{ updateTaskCounts(); updateHomeStatsInstant(); }catch(e){}
 }catch(e){ 
  setMainBalanceState('warning', {msg: e?.message||'Ad failed'});
  setTimeout(()=>{ setMainBalanceState('normal'); },3000);
  toast(e?.message||'Ad failed'); 
 }finally{ btn.innerHTML=originalHTML; btn.disabled=false;
  try{ updateTaskCounts(); updateHomeStatsInstant(); }catch(e){}
  setTimeout(()=>{ playTok(); },200); }
}

function selectMethod(method){ if(!['bkash','nagad','rocket'].includes(method))return; selectedMethod=method; renderProfile(); if(tg?.HapticFeedback)tg.HapticFeedback.selectionChanged(); }
async function withdraw(){ 
  const accountEl=document.getElementById('account'); const amountEl=document.getElementById('amount'); 
  const account=accountEl?.value.trim()||''; const amount=amountEl?.value.trim()||''; 
  if(!selectedMethod){ toast('Select a payment method'); return;} 
  if(!account){ toast('Enter wallet number'); return;} 
  if(!amount){ toast('Enter amount'); return;} 
  const amountNumber=Number(amount); 
  if(amountNumber<Number(state.min_withdraw||100)){ toast(`Minimum ${money(state.min_withdraw)} TK`); return;} 
  if(amountNumber>userBalance()){ toast('Insufficient balance'); return;} 
  const x=await api('withdraw',{method:selectedMethod,account:account,amount:amount}); 
  if(x?.ok){
    const card = document.getElementById('mainBalanceCard');
    if(card){
      setMainBalanceState('withdraw', {amount: amount});
      setTimeout(()=>{ setMainBalanceState('normal'); },3000);
    }
    toast(x?.message||'Withdrawal requested');
    selectedMethod=''; await load(); 
    setTimeout(()=>{ if(typeof loadWithdrawHistory==='function') loadWithdrawHistory(); }, 600);
  } else {
    toast(x?.message||'Failed');
  }
}

async function copyRef(){ const link=state.ref_link||''; if(!link){toast('No link');return;} try{ if(navigator.clipboard)await navigator.clipboard.writeText(link); else{ const input=document.createElement('input'); input.value=link; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove(); } toast('Copied'); }catch{toast('Copy failed');} }
function closeNotice(){ const notice=document.getElementById('notice'); if(notice)notice.style.display='none'; }
function setupEarnButtons(){ const poroBtn=document.getElementById('poroBtn'); const lijentBtn=document.getElementById('lijentBtn'); if(poroBtn&&!poroBtn.dataset.bound){poroBtn.dataset.bound='1'; poroBtn.onclick=()=>watchAd('poroBtn');} if(lijentBtn&&!lijentBtn.dataset.bound){lijentBtn.dataset.bound='1'; lijentBtn.onclick=()=>watchAd('lijentBtn');} }
let earnButtonWatcher=null; if(typeof MutationObserver!=='undefined'&&document.body){ earnButtonWatcher=new MutationObserver(()=>{setupEarnButtons();}); earnButtonWatcher.observe(document.body,{childList:true,subtree:true}); }
setupEarnButtons(); load();