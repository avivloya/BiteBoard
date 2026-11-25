// Snapspoon website: the newer tools (the same ones as the phone app's "More" screen).
// Loaded after the main script in index.html. It uses that script's helpers (S, UI, $, esc, persist, render...)
// and wraps a few of its functions to add buttons, so index.html itself barely changes.
// Everything here works without an account; AI features need Google sign-in (cloud.js) like photo estimates do.
(()=>{
"use strict";

// ---------- small helpers ----------
const cloud=()=>window.SnapCloud||{};
const kcalOf=e=>+e.kcal||0;
const meLeft=()=>{const t=totals(todayKey()),g=S.settings;return{kcal:Math.max(0,g.kcal-t.kcal),p:Math.max(0,g.p-t.p),c:Math.max(0,g.c-t.c),f:Math.max(0,g.f-t.f)}};
const imp=()=>S.profile?.units==="imperial";
const showKg=kg=>imp()?`${(kg*2.20462).toFixed(1)} lb`:`${(+kg).toFixed(1)} kg`;
const niceDate=d=>d.toLocaleDateString(undefined,{month:"long",day:"numeric",year:d.getFullYear()!==new Date().getFullYear()?"numeric":undefined});
const buzz=(ms=8)=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
const back=(to="#more",label="More")=>`<a class="btn ghost sm" href="${to}">← ${label}</a>`;
const head=(title,sub,to,label)=>`<div>${back(to,label)}<h1 style="margin-top:6px">${title}</h1>${sub?`<p class="x-sub">${sub}</p>`:""}</div>`;
const spin=t=>`<div class="row"><span class="spinner"></span><b>${t}</b></div>`;
const signInHint=()=>{const c=cloud();return c.configured&&!c.signedIn?cloudSignInBtn():""};

// ---------- extra saved data (synced with your account like the rest when signed in) ----------
const E0={freezes:1,frozenDays:[],freezeEarned:[],moods:{},plan:null,groceryDone:[],badgesSeen:null,weights:{},classRemind:[],ch:{made:[],joined:{}}};
let E={...E0,...(lsGet("extras")||{})};
let P=(lsGet("progress")||{}).list||[];
const saveE=()=>persist("extras",JSON.parse(JSON.stringify(E)));
const saveP=()=>persist("progress",{list:P});
const _apply=applyDoc;
applyDoc=function(id,data){
  if(id==="extras"){E={...E0,...data};return}
  if(id==="progress"){P=data.list||[];return}
  return _apply(id,data);
};
// The main page only loads the last 14 days from this browser. Recaps and Wrapped need the rest.
try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("biteboard:day-")){const d=k.slice(14);if(!S.days[d]){const v=lsGet("day-"+d);if(v&&v.entries)S.days[d]=v.entries}}}}catch(e){}

// ---------- AI (the same server modes as the phone app) ----------
async function ai(body){
  const c=cloud();
  if(!c.ai){const x=new Error("no ai");x.userMessage=c.configured?"Sign in with Google (Account › Settings) to use AI.":"AI isn't switched on for the website yet. It starts working once the Snapspoon server is set up.";throw x}
  return c.ai(body);
}
const errMsg=e=>e?.userMessage||(e?.code==="rate_limited"?"Too many requests right now. Wait a minute and try again.":e?.code==="network"?"You're offline. Check your connection and try again.":e?.code==="image_rejected"?"That photo couldn't be read. Try a JPG or PNG.":"That didn't work. Try again.");
async function photoBody(file){const c=cloud();if(!c.photo64)return ai({});const p=await c.photo64(file);return{imageBase64:p.data,mediaType:p.type}}
function toRecipe(o,extra={}){
  return{id:"ai-"+uid(),ai:true,title:String(o.title||"New recipe"),cat:MEALS.includes(o.cat)?o.cat:"Dinner",min:r0(o.min)||20,serv:r0(o.serv)||1,kcal:r0(o.kcal),p:r0(o.p),c:r0(o.c),f:r0(o.f),
    tags:Array.isArray(o.tags)?o.tags.map(String):[],ing:Array.isArray(o.ing)?o.ing.map(String):[],steps:Array.isArray(o.steps)?o.steps.map(String):[],hue:hashStr(String(o.title||"x"))%360,...extra};
}
function saveRecipe(r){S.mine=[r,...S.mine];saveMine();toast("Saved to your recipes");return r}

// ---------- page state, so a screen can redraw itself without the whole app ----------
const XS={};
function paint(){if(route()==="more"&&!UI.ob)$("#view").innerHTML=morePage()}
let cleanup=[];
function stopAll(){cleanup.forEach(f=>{try{f()}catch(e){}});cleanup=[]}
window.addEventListener("hashchange",()=>{stopAll();const v=$("#view");v.classList.add("x-enter");setTimeout(()=>v.classList.remove("x-enter"),450)});

// ---------- routes: #more and #more/<tool>/<id> ----------
const _route=route;
route=function(){const h=(location.hash||"").slice(1);return h==="more"||h.startsWith("more/")?"more":_route()};
const parts=()=>(location.hash||"").slice(1).split("/").slice(1).map(decodeURIComponent);
let mounted="";
const _render=render;
render=function(){
  _render();
  if(route()==="more"&&!UI.ob&&(S.ready||S.profile)){
    document.querySelectorAll("nav.tabs a").forEach(a=>{if(a.dataset.tab==="account")a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
    $("#view").innerHTML=morePage();
    const key=location.hash;if(mounted!==key){mounted=key;const m=MOUNT[parts()[0]||""];if(m)setTimeout(m,0)}
  }else mounted="";
  afterRender();
};
function morePage(){const [p,arg]=parts();return(PAGES[p]||PAGES.hub)(arg)}

// ---------- motion and vibration ----------
const _close=closeSheet;
closeSheet=function(){try{qaRec&&qaRec.abort()}catch(e){}_close()};
const _open=openSheet;
openSheet=function(html){const was=!!$("#layer").innerHTML;_open(html);if(!was){const s=$("#layer .scrim");s&&s.classList.add("x-in")}};
document.addEventListener("click",e=>{if(e.target.closest(".btn,.chip,.x-tile,nav.tabs a,[data-x]"))buzz()},true);
function confetti(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const c=document.createElement("div");c.className="x-confetti";
  const cols=["#6b4026","#c9a27c","#a8735a","#d9ae7e","#7d8a4a","#f8efe2"];
  c.innerHTML=[...Array(70)].map(()=>`<i style="left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*cols.length)]};animation-duration:${1.6+Math.random()*1.6}s;animation-delay:${Math.random()*.4}s;transform:rotate(${Math.random()*180}deg)"></i>`).join("");
  document.body.appendChild(c);setTimeout(()=>c.remove(),3800)}
function celebrate(title,sub){confetti();buzz([20,40,20]);const b=document.createElement("div");b.className="x-celebrate";b.setAttribute("role","status");b.innerHTML=`<b>${esc(title)}</b>${sub?`<span class="note">${esc(sub)}</span>`:""}`;document.body.appendChild(b);setTimeout(()=>b.remove(),3200)}

// ---------- dark mode ----------
function themePref(){try{return localStorage.getItem("snapspoon:theme")||"auto"}catch(e){return "auto"}}
function applyTheme(){const p=themePref(),dark=p==="dark"||(p==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme=dark?"dark":"light";const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=dark?"#1E140D":"#E2CEB1"}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",applyTheme);
applyTheme();

// ---------- streaks with freezes ----------
streakInfo=function(){
  const fr=new Set(E.frozenDays||[]);const has=k=>dayEntries(k).length>0||fr.has(k);
  let k=todayKey();const today=dayEntries(k).length>0;if(!today)k=shiftDay(k,-1);
  let n=0;while(has(k)){n++;k=shiftDay(k,-1)}
  const all=[...new Set([...Object.keys(S.days).filter(has),...fr])].sort();let best=0,run=0,prev=null;
  for(const d of all){run=prev&&shiftDay(prev,1)===d?run+1:1;best=Math.max(best,run);prev=d}
  return{n,today,best:Math.max(best,n)};
};
function applyFreezes(){
  const y=shiftDay(todayKey(),-1),b=shiftDay(todayKey(),-2),lg=k=>dayEntries(k).length>0||E.frozenDays.includes(k);
  if(!lg(y)&&lg(b)&&E.freezes>0){E.freezes--;E.frozenDays=[...E.frozenDays,y].slice(-60);saveE();setTimeout(()=>toast("A streak freeze saved your streak for yesterday."),1500);return}
  const n=streakInfo().n,mark=`${n}@${shiftDay(todayKey(),-n)}`;
  if(n>0&&n%7===0&&E.freezes<2&&!E.freezeEarned.includes(mark)){E.freezes++;E.freezeEarned=[...E.freezeEarned,mark].slice(-30);saveE();setTimeout(()=>celebrate("Streak freeze earned","7 days in a row. A missed day won't break your streak."),1200)}
}

// ---------- XP, levels and badges ----------
function myXp(){
  const keys=Object.keys(S.days).filter(k=>S.days[k]?.length),all=keys.flatMap(k=>S.days[k]);
  const meals=all.length,photos=all.filter(e=>e.src==="photo").length,weighIns=Object.keys(E.weights).length,recipes=S.mine.length,moods=Object.keys(E.moods).length;
  const st=streakInfo(),g=S.settings;
  const onTarget=keys.filter(k=>totals(k).kcal<=g.kcal*1.05).length,proteinDays=keys.filter(k=>totals(k).p>=g.p).length;
  const w=Object.keys(E.weights).sort(),start=w.length?E.weights[w[0]]:0,lost=w.length>1?start-E.weights[w[w.length-1]]:0;
  const xp=meals*10+keys.length*25+weighIns*15+recipes*40+P.length*20+moods*5;
  let level=1,need=100,floor=0;while(xp>=floor+need){floor+=need;level++;need=100+(level-1)*50}
  const badges=[
    ["first","🥄","First bite","Log your first meal",meals>=1],
    ["snap10","📸","Snap happy","Snap 10 meals with the camera",photos>=10],
    ["streak3","🔥","Warming up","Reach a 3 day streak",st.best>=3],
    ["streak7","⚡","One week strong","Reach a 7 day streak",st.best>=7],
    ["streak30","🏆","Habit made","Reach a 30 day streak",st.best>=30],
    ["streak100","💯","Centurion","Reach a 100 day streak",st.best>=100],
    ["target10","🎯","On target","Stay within your calories on 10 days",onTarget>=10],
    ["protein7","💪","Protein pro","Hit your protein goal on 7 days",proteinDays>=7],
    ["weigh4","⚖️","Check-in champ","Log your weight 4 times",weighIns>=4],
    ["lost2","📉","First 2 kg","Lose 2 kg (4.4 lb)",lost>=2],
    ["lost5","🌟","Five down","Lose 5 kg (11 lb)",lost>=5],
    ["chef","👩‍🍳","Home chef","Make 3 recipes of your own",recipes>=3],
    ["photo","🪞","Then and now","Take 2 progress photos",P.length>=2],
    ["mood","😊","In tune","Check in your mood on 7 days",moods>=7],
  ].map(([id,emoji,title,how,done])=>({id,emoji,title,how,done}));
  return{xp,level,into:xp-floor,size:need,badges};
}
function checkBadges(){
  const got=myXp().badges.filter(b=>b.done).map(b=>b.id);
  if(!Array.isArray(E.badgesSeen)){E.badgesSeen=got;saveE();return} // first visit: don't celebrate old progress
  const fresh=got.filter(id=>!E.badgesSeen.includes(id));
  if(fresh.length){const b=myXp().badges.find(x=>x.id===fresh[0]);E.badgesSeen=[...E.badgesSeen,...fresh];saveE();setTimeout(()=>celebrate(`${b.emoji} ${b.title}`,"New badge unlocked"),900)}
}

// ---------- goal date from weigh-ins ----------
function goalDate(){
  const goal=S.profile?.goalKg;const since=shiftDay(todayKey(),-28);
  const pts=Object.keys(E.weights).filter(d=>d>=since).sort().map(d=>({t:Date.parse(d)/864e5,kg:E.weights[d]}));
  if(pts.length<3||!goal)return null;
  const n=pts.length,mt=pts.reduce((a,p)=>a+p.t,0)/n,mk=pts.reduce((a,p)=>a+p.kg,0)/n;
  const slope=pts.reduce((a,p)=>a+(p.t-mt)*(p.kg-mk),0)/pts.reduce((a,p)=>a+(p.t-mt)**2,0);
  const now=pts[n-1],toGo=goal-now.kg;
  if(Math.abs(toGo)<.1)return{reached:true};
  if(!isFinite(slope)||slope===0||Math.sign(slope)!==Math.sign(toGo))return null;
  const days=toGo/slope;if(days>730)return null;
  return{date:new Date((now.t+days)*864e5),perWeek:slope*7};
}
function weightSheet(){
  const last=Object.keys(E.weights).sort().pop(),v=last?E.weights[last]:S.profile?.weightKg;
  openSheet(`<div class="inner"><button class="close" data-act="close" aria-label="Close">✕</button><h2 style="font-size:24px">Log your weight</h2>
    <p class="note" style="margin:0">Weigh in a few times a week, at the same time of day. After 3 weigh-ins Snapspoon predicts when you'll reach your goal.</p>
    <form data-xform="weight" class="row"><input id="xKg" class="x-input" style="max-width:160px" type="number" step="0.1" min="20" max="700" required value="${v?(imp()?v*2.20462:v).toFixed(1):""}" aria-label="Weight"><span>${imp()?"lb":"kg"}</span><button class="btn primary">Save</button></form></div>`);
}

// ---------- moods ----------
function moodInsights(){
  const rows=Object.entries(E.moods).map(([k,m])=>({...m,...totals(k),logged:dayEntries(k).length>0}));
  const avg=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,out=[],g=S.settings;
  const cmp=(yes,no,key,what)=>{if(yes.length<3||no.length<3)return;const a=avg(yes.map(r=>r[key])),b=avg(no.map(r=>r[key]));if(Math.abs(a-b)>=.4)out.push(`On days ${what}, your ${key} was ${a>b?"higher":"lower"}: ${a.toFixed(1)} vs ${b.toFixed(1)} out of 5.`)};
  const L=rows.filter(r=>r.logged);
  cmp(L.filter(r=>r.p>=g.p*.9),L.filter(r=>r.p<g.p*.9),"energy","you hit your protein");
  cmp(L.filter(r=>r.kcal<=g.kcal*1.05),L.filter(r=>r.kcal>g.kcal*1.05),"mood","you stayed on target");
  cmp(L.filter(r=>r.c<100),L.filter(r=>r.c>=100),"energy","with fewer carbs");
  cmp(rows.filter(r=>r.logged),rows.filter(r=>!r.logged),"mood","you logged your food");
  return out;
}
const FACES=["😞","🙁","😐","🙂","😄"],BOLTS=["🪫","😴","🙂","⚡","🚀"];

// ---------- recap ----------
function recapSince(from){
  const keys=Object.keys(S.days).filter(k=>k>=from&&k<=todayKey()&&S.days[k]?.length).sort(),es=keys.flatMap(k=>S.days[k]);
  const count={};es.forEach(e=>{const n=(e.name||"").trim();if(n)count[n]=(count[n]||0)+1});
  const top=Object.entries(count).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const byMeal={};es.forEach(e=>{byMeal[e.meal]=(byMeal[e.meal]||0)+1});
  const favMeal=Object.entries(byMeal).sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
  const onTarget=keys.filter(k=>totals(k).kcal<=S.settings.kcal*1.05).length,protein=r0(keys.reduce((a,k)=>a+totals(k).p,0));
  const w=Object.keys(E.weights).filter(k=>k>=shiftDay(from,-7)).sort(),lost=w.length>1?Math.round((E.weights[w[0]]-E.weights[w[w.length-1]])*10)/10:0;
  return{days:keys.length,meals:es.length,top,favMeal,onTarget,protein,lost,photos:es.filter(e=>e.src==="photo").length,streak:streakInfo(),kcal:r0(es.reduce((a,e)=>a+kcalOf(e),0))};
}
function storySlides(r,kind){
  const s=[];
  s.push({k:kind==="wrapped"?`${new Date().getFullYear()} Wrapped`:"Your week",v:"🥄",p:`${esc(S.profile?.name||"You")}, here's ${kind==="wrapped"?"your year":"your week"} in food.`});
  s.push({k:"Days logged",v:r.days,p:`${r.meals} meals logged${r.photos?`, ${r.photos} snapped with the camera`:""}.`});
  if(r.top.length)s.push({k:"Your favorite",v:"⭐",p:`<b>${esc(r.top[0][0])}</b>, ${r.top[0][1]} time${r.top[0][1]===1?"":"s"}.${r.top.length>1?`<br><span style="color:#bfa486">Then ${r.top.slice(1,4).map(t=>esc(t[0])).join(", ")}.</span>`:""}`});
  s.push({k:"On target",v:r.onTarget,p:`day${r.onTarget===1?"":"s"} within your calories.`});
  s.push({k:"Protein",v:`${r.protein} g`,p:"of protein. Your muscles say thanks."});
  if(r.lost>0)s.push({k:"Progress",v:showKg(r.lost),p:"down. That's real."});
  s.push({k:"Streak",v:`🔥 ${r.streak.n}`,p:`Best streak: ${r.streak.best} days. Keep it going!`});
  return s;
}
function openStory(kind){
  const r=recapSince(kind==="wrapped"?`${new Date().getFullYear()}-01-01`:shiftDay(todayKey(),-6)),s=storySlides(r,kind);let i=0,timer=null;
  const el=document.createElement("div");el.className="x-story";document.body.appendChild(el);
  const close=()=>{clearTimeout(timer);el.remove()};
  const draw=()=>{clearTimeout(timer);const x=s[i];
    el.innerHTML=`<div class="bars">${s.map((_,j)=>`<i class="${j<=i?"on":""}"></i>`).join("")}</div><button class="x-close" aria-label="Close">✕</button>
      <div class="slide"><div class="k">${x.k}</div><div class="v num">${x.v}</div><p>${x.p}</p></div>
      ${i===s.length-1?`<button class="btn primary x-share" data-x="share-card" data-kind="${kind}">Share</button>`:""}`;
    if(i<s.length-1)timer=setTimeout(()=>{i++;draw()},4200)};
  el.addEventListener("click",e=>{if(e.target.closest(".x-close")){close();return}if(e.target.closest(".x-share"))return;
    i=e.clientX<innerWidth/3?Math.max(0,i-1):Math.min(s.length-1,i+1);draw()});
  draw();cleanup.push(close);
}

// ---------- shareable card (an image made in the browser) ----------
async function shareCard(kind){
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  try{await document.fonts?.ready}catch(e){}
  g.fillStyle="#E2CEB1";g.fillRect(0,0,W,H);g.fillStyle="#F8EFE2";g.beginPath();g.roundRect?g.roundRect(70,230,W-140,H-400,48):g.rect(70,230,W-140,H-400);g.fill();
  const ink="#4A2E1C",muted="#75563F",acc="#6B4026",font=(w,s)=>`${w} ${s}px Urbanist, Manrope, system-ui, sans-serif`;
  g.fillStyle=ink;g.font=font(800,64);g.fillText("Snapspoon",90,150);
  const st=streakInfo(),xp=myXp(),wk=recapSince(shiftDay(todayKey(),-6)),yr=kind==="wrapped"?recapSince(`${new Date().getFullYear()}-01-01`):null;
  const rows=yr?[["Days logged",yr.days],["Meals",yr.meals],["Days on target",yr.onTarget],["Best streak",`${st.best} days`]]
    :[["Day streak",`🔥 ${st.n}`],["Days logged this week",`${wk.days} / 7`],["Days on target",wk.onTarget],["Level",`${xp.level} · ${xp.xp} XP`]];
  g.fillStyle=muted;g.font=font(700,40);g.fillText(yr?`MY ${new Date().getFullYear()} IN FOOD`:"MY WEEK",140,340);
  rows.forEach(([k,v],j)=>{const y=470+j*190;g.fillStyle=acc;g.font=font(800,110);g.fillText(String(v),140,y);g.fillStyle=muted;g.font=font(600,40);g.fillText(k,140,y+56)});
  g.fillStyle=muted;g.font=font(600,34);g.fillText("Healthy recipes and AI calorie tracking",90,H-90);
  const blob=await new Promise(ok=>c.toBlob(ok,"image/png"));const file=new File([blob],"snapspoon.png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],text:"My Snapspoon stats"});return}catch(e){if(e?.name==="AbortError")return}}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="snapspoon.png";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast("Image saved");
}

// ---------- camera helpers ----------
async function startCam(sel){
  const v=$(sel);if(!v)return null;
  if(!navigator.mediaDevices?.getUserMedia){XS.camErr="This browser can't open the camera.";return null}
  try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280}},audio:false});v.srcObject=s;v.muted=true;v.playsInline=true;await v.play().catch(()=>{});
    cleanup.push(()=>s.getTracks().forEach(t=>t.stop()));return v}
  catch(e){XS.camErr="Camera access was blocked. Allow the camera for this site in your browser settings.";return null}
}
function frame(v,max,q=.7){const s=Math.min(1,max/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement("canvas");c.width=Math.round(v.videoWidth*s);c.height=Math.round(v.videoHeight*s);c.getContext("2d").drawImage(v,0,0,c.width,c.height);return c}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;

// ---------- the screens ----------
const GROUPS=[
  ["Log faster",[["📷","Live camera","Calories as you point","live"],["🎙️","Say it","Log by voice","voice"],["🍽️","Menu scan","What fits when eating out","menu"],["🥣","Portion guide","See what a portion looks like","portions"]]],
  ["Plan and cook",[["🤖","What to eat","AI coach ideas","coach"],["🗓️","Meal plan","A week + grocery list","plan"],["🧊","Fridge scan","Recipes from what you have","fridge"],["🔗","Import recipe","From a link or TikTok","import"]]],
  ["Progress",[["🏅","Badges and XP","Levels and streak freezes","badges"],["🎬","Weekly recap","Your week as a story","recap"],["🎁","Wrapped","Your year in food","wrapped"],["🪞","Progress photos","Before and after","progress"],["🙂","Mood check-in","Food and how you feel","mood"],["📊","Share stats","A card for your story","share"],["⚖️","Weight","Weigh-ins and goal date","weight"]]],
  ["Together",[["🏁","Challenges","Leaderboards with friends","challenges"],["🔴","Live classes","Cook along with chefs","classes"],["👩‍🍳","Healthy chefs","Verified creators","chefs"]]],
];
const tile=([e,n,s,p])=>p==="weight"?`<button class="x-tile" data-x="weight"><span class="e">${e}</span><b>${n}</b><small>${s}</small></button>`:`<a class="x-tile" href="#more/${p}"><span class="e">${e}</span><b>${n}</b><small>${s}</small></a>`;
const PAGES={},MOUNT={};

PAGES.hub=()=>`<div class="x-page">${head("Everything Snapspoon","All the tools in one place.","#account","Account")}
  ${GROUPS.map(([t,items])=>`<div style="display:grid;gap:10px"><div class="label">${t}</div><div class="x-grid">${items.map(tile).join("")}</div></div>`).join("")}
  <p class="note">Home screen widgets, the Dynamic Island, Apple Watch logging, Siri shortcuts and Face ID lock are in the phone app only.</p></div>`;

// Live camera: point at food, see a guess every few seconds.
PAGES.live=()=>{const x=XS.live||(XS.live={});return `<div class="x-page">${head("Live camera","Point your camera at food for a quick calorie guess. Tap Snap it for the full breakdown.")}
  <div class="x-cam"><video id="xLiveV" playsinline muted></video>
    <div class="x-guess" id="xGuess">${x.err?`<span>${esc(x.err)}</span>`:x.name?`<b>${esc(x.name)}</b><span class="num">about ${r0(x.kcal)} kcal</span>`:`<span>${x.on?"Looking…":"Tap Start to begin."}</span>`}</div></div>
  <div class="row"><button class="btn primary" data-x="live-toggle">${x.on?"Pause":"Start"}</button><button class="btn" data-x="live-snap">Snap it</button></div>
  <p class="note">Guesses use your weekly AI allowance, so it pauses by itself after a minute. ${signInHint()}</p></div>`};
function liveGuessUI(){const x=XS.live||{},g=$("#xGuess");if(!g)return;g.innerHTML=x.err?`<span>${esc(x.err)}</span>`:x.name?`<b>${esc(x.name)}</b><span class="num">about ${r0(x.kcal)} kcal</span>`:`<span>${x.on?"Looking…":"Tap Start to begin."}</span>`;const b=$('[data-x="live-toggle"]');if(b)b.textContent=x.on?"Pause":"Start"}
MOUNT.live=async()=>{XS.live={};const v=await startCam("#xLiveV");if(!v){XS.live.err=XS.camErr;liveGuessUI()}};
async function liveLoop(){const x=XS.live;let n=0;
  while(x.on&&n<15&&route()==="more"&&parts()[0]==="live"){const v=$("#xLiveV");if(!v||!v.videoWidth){await new Promise(r=>setTimeout(r,500));continue}
    n++;try{const d=frame(v,448,.6).toDataURL("image/jpeg",.6).split(",")[1];const g=await ai({mode:"live",imageBase64:d,mediaType:"image/jpeg"});x.name=g?.name||"";x.kcal=g?.kcal||0;x.err=x.name?null:"No food in view yet."}
    catch(e){x.err=errMsg(e);x.on=false}
    liveGuessUI();await new Promise(r=>setTimeout(r,3500))}
  x.on=false;liveGuessUI()}

// Voice: say what you ate.
PAGES.voice=()=>{const x=XS.voice||(XS.voice={text:""});return `<div class="x-page">${head("Say it","Tell Snapspoon what you ate, like “two eggs on toast and a coffee with milk”.")}
  ${SR?`<button class="x-mic ${x.on?"on":""}" data-x="voice-mic" aria-label="${x.on?"Stop listening":"Start listening"}">${icon('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',40)}</button><p class="note" style="text-align:center;margin:0">${x.on?"Listening… tap to stop":"Tap the mic and speak"}</p>`:`<p class="note">Voice typing isn't available in this browser, so type it instead.</p>`}
  <form data-xform="voice" style="display:grid;gap:10px"><textarea id="xVoiceT" class="x-area" placeholder="A turkey sandwich and an apple" required>${esc(x.text)}</textarea>
  ${x.err?`<p class="x-err">${esc(x.err)}</p>`:""}<div class="row"><button class="btn primary" ${x.busy?"disabled":""}>${x.busy?"Working it out…":"Estimate calories"}</button>${signInHint()}</div></form></div>`};
let rec=null;
function voiceMic(){const x=XS.voice;if(x.on){rec?.stop();return}
  rec=new SR();rec.lang=document.documentElement.lang||"en";rec.interimResults=true;rec.continuous=false;const base=($("#xVoiceT")?.value||"").trim();
  rec.onresult=e=>{const t=[...e.results].map(r=>r[0].transcript).join(" ");x.text=(base?base+" ":"")+t;const ta=$("#xVoiceT");if(ta)ta.value=x.text};
  rec.onend=()=>{x.on=false;paint()};rec.onerror=e=>{x.on=false;if(e.error==="not-allowed")toast("Allow the microphone for this site to talk.");paint()};
  x.on=true;rec.start();paint();cleanup.push(()=>rec&&rec.abort())}
async function estimateText(t){const x=XS.voice;x.text=t;x.busy=true;x.err=null;paint();
  try{const out=await ai({mode:"text",text:t});x.busy=false;showEstimate(out)}catch(e){x.busy=false;x.err=errMsg(e);paint()}}
function showEstimate(out){
  if(UI.snap.url)URL.revokeObjectURL(UI.snap.url);
  UI.snap={file:null,url:null,busy:false,err:null,meal:guessMeal(),result:{meal_name:out.meal_name||"Your meal",items:(out.items||[]).map(i=>({name:i.name,grams:+i.grams||0,kcal:+i.kcal||0,protein:+i.protein||0,carbs:+i.carbs||0,fat:+i.fat||0})),confidence:out.confidence||"medium",notes:out.notes||""}};
  location.hash="#snap";
}

// Menu scan.
PAGES.menu=()=>{const x=XS.menu||(XS.menu={});return `<div class="x-page">${head("Menu scan","Take a photo of a menu. Snapspoon marks what fits the "+r0(meLeft().kcal)+" kcal you have left today.")}
  <label class="x-dz" for="xMenuF">${x.url?`<img src="${x.url}" alt="Menu photo">`:`<span style="font-size:40px">🍽️</span><b>Take or choose a photo of the menu</b>`}</label><input type="file" id="xMenuF" data-xfile="menu" accept="image/*" capture="environment" hidden>
  ${x.busy?spin("Reading the menu…"):""}${x.err?`<p class="x-err">${esc(x.err)}</p>`:""}${signInHint()}
  ${x.dishes?`<div class="x-list">${x.dishes.length?x.dishes.sort((a,b)=>({great:0,ok:1,heavy:2}[a.fit]-{great:0,ok:1,heavy:2}[b.fit])).map((d,i)=>`<div class="x-row"><div class="grow"><b>${esc(d.name)}</b><small class="note">${esc(d.tip)}</small></div><span class="x-pill ${esc(d.fit)}">${d.fit==="great"?"Great fit":d.fit==="ok"?"OK":"Heavy"}</span><span class="num note" style="white-space:nowrap">${r0(d.kcal)} kcal</span><button class="btn sm" data-x="menu-log" data-i="${i}">Log</button></div>`).join(""):`<p class="note">No dishes could be read. Try a sharper, closer photo.</p>`}</div>`:""}</div>`};

// Portion guide.
PAGES.portions=()=>`<div class="x-page">${head("Portion guide","Hold your phone over the plate. Fill half with vegetables, a quarter with protein and a quarter with carbs.")}
  <div class="x-cam"><video id="xPortV" playsinline muted></video><div class="x-plate"><i class="veg">Vegetables<br>half the plate</i><i class="pro">Protein<br>~120 g</i><i class="carb">Carbs<br>~1 fist</i></div></div>
  ${XS.camErr&&parts()[0]==="portions"?`<p class="note">${esc(XS.camErr)}</p>`:""}
  <div class="x-card"><h3>Your hand is your guide</h3><div class="x-list">
    ${[["✋","Palm","One serving of meat, fish or tofu, about 100 to 120 g (150 to 250 kcal)"],["✊","Fist","One cup of rice, pasta or cereal (about 200 kcal cooked)"],["🤲","Cupped hand","A handful of nuts is about 30 g (180 kcal), so go easy"],["👍","Thumb","One tablespoon of oil, butter or peanut butter (about 100 kcal)"]].map(([e,n,s])=>`<div class="x-row"><span style="font-size:26px">${e}</span><div class="grow"><b>${n}</b><small class="note">${s}</small></div></div>`).join("")}
  </div></div></div>`;
MOUNT.portions=async()=>{XS.camErr=null;const v=await startCam("#xPortV");if(!v){const c=$("#xPortV");if(c)c.parentElement.style.background="var(--plate)"}};

// AI coach.
PAGES.coach=()=>{const x=XS.coach||(XS.coach={prefs:""}),l=meLeft();
  const fit=[...S.mine,...LIB].filter(r=>r.kcal>0&&r.kcal<=l.kcal).sort((a,b)=>((b.cat===guessMeal())*1000+b.p*10-Math.abs(l.kcal*.6-b.kcal)/10)-((a.cat===guessMeal())*1000+a.p*10-Math.abs(l.kcal*.6-a.kcal)/10)).slice(0,4);
  return `<div class="x-page">${head("What to eat","Ideas that fit what you have left today.")}
  <div class="x-card"><div class="row" style="justify-content:space-between"><div><div class="x-big num">${r0(l.kcal)}</div><span class="note">kcal left today</span></div><div class="note num" style="text-align:right">${r0(l.p)} g protein<br>${r0(l.c)} g carbs · ${r0(l.f)} g fat</div></div></div>
  ${fit.length?`<div><div class="label">Recipes that fit</div><div class="h-row" style="margin-top:8px">${fit.map(card).join("")}</div></div>`:""}
  <div class="x-card"><h3>Ask the AI coach</h3>
    <form data-xform="coach" style="display:grid;gap:10px"><input id="xPrefs" class="x-input" placeholder="Anything to know? Like vegetarian, or no cooking" value="${esc(x.prefs)}"><div class="row"><button class="btn primary" ${x.busy?"disabled":""}>${x.busy?"Thinking…":`Ideas for ${guessMeal().toLowerCase()}`}</button>${signInHint()}</div></form>
    ${x.err?`<p class="x-err">${esc(x.err)}</p>`:""}
    ${x.out?`<p style="margin:0">${esc(x.out.tip)}</p><div class="x-list">${(x.out.ideas||[]).map(i=>`<div class="x-row"><div class="grow"><b>${esc(i.title)}</b><small class="note">${esc(i.why)}</small></div><span class="num note" style="white-space:nowrap">${r0(i.kcal)} kcal · ${r0(i.protein)}g P</span><button class="btn sm" data-x="write" data-t="${esc(`${i.title}, about ${r0(i.kcal)} kcal and ${r0(i.protein)} g protein`)}">Recipe</button></div>`).join("")}</div>`:""}
  </div></div>`};

// Weekly meal plan with a grocery list.
PAGES.plan=()=>{const x=XS.plan||(XS.plan={prefs:""}),pl=E.plan;
  return `<div class="x-page">${head("Meal plan","A week of meals that fits "+S.settings.kcal+" kcal a day, with one shopping list.")}
  <form data-xform="plan" class="x-card"><input id="xPlanP" class="x-input" placeholder="Preferences, like no fish, quick dinners, cheap" value="${esc(x.prefs)}"><div class="row"><button class="btn primary" ${x.busy?"disabled":""}>${x.busy?"Planning your week…":pl?"Make a new plan":"Plan my week"}</button>${signInHint()}</div>${x.err?`<p class="x-err">${esc(x.err)}</p>`:""}</form>
  ${pl?`<div class="x-list">${pl.days.map(d=>`<details class="x-card" ${d.day===new Date().toLocaleDateString("en",{weekday:"long"})?"open":""}><summary style="cursor:pointer;display:flex;justify-content:space-between;font-weight:700"><span>${esc(d.day)}</span><span class="num note">${r0(d.meals.reduce((a,m)=>a+(+m.kcal||0),0))} kcal</span></summary>
      <div class="x-list" style="margin-top:8px">${d.meals.map(m=>`<div class="x-row" style="background:var(--bg)"><div class="grow"><small class="note">${esc(m.meal)}</small><b>${esc(m.title)}</b></div><span class="num note" style="white-space:nowrap">${r0(m.kcal)} kcal</span><button class="btn sm" data-x="write" data-t="${esc(`${m.title} for ${m.meal.toLowerCase()}, about ${r0(m.kcal)} kcal`)}">Recipe</button></div>`).join("")}</div></details>`).join("")}</div>
    <div class="x-card"><div class="row" style="justify-content:space-between"><h3>Grocery list</h3><button class="btn ghost sm" data-x="grocery-share">Share</button></div>
      ${pl.grocery.map(a=>`<div><div class="label">${esc(a.aisle)}</div>${a.items.map(it=>{const k=a.aisle+"|"+it,on=E.groceryDone.includes(k);return `<label class="x-chk ${on?"done":""}"><input type="checkbox" data-xchk="${esc(k)}" ${on?"checked":""}><span>${esc(it)}</span></label>`}).join("")}</div>`).join("")}</div>
    <p class="note">Planned ${fmtDay(pl.made)}.</p>`:""}</div>`};

// Fridge scan.
PAGES.fridge=()=>{const x=XS.fridge||(XS.fridge={});return `<div class="x-page">${head("Fridge scan","Snap your fridge, pantry or the food on your counter and get 3 healthy recipes from it.")}
  <label class="x-dz" for="xFridgeF">${x.url?`<img src="${x.url}" alt="Your fridge">`:`<span style="font-size:40px">🧊</span><b>Take or choose a photo</b>`}</label><input type="file" id="xFridgeF" data-xfile="fridge" accept="image/*" capture="environment" hidden>
  ${x.busy?spin("Looking in your fridge…"):""}${x.err?`<p class="x-err">${esc(x.err)}</p>`:""}${signInHint()}
  ${x.out?`<div class="row">${(x.out.ingredients||[]).map(i=>`<span class="badge">${esc(i)}</span>`).join("")}</div>
    <div class="x-list">${(x.out.recipes||[]).map((r,i)=>`<div class="x-row"><div class="grow"><b>${esc(r.title)}</b><small class="note num">${r0(r.kcal)} kcal · ${r0(r.p)}g protein · ${r0(r.min)} min</small></div><button class="btn sm ${x.saved?.[i]?"":"primary"}" data-x="fridge-save" data-i="${i}">${x.saved?.[i]?"Open":"Save"}</button></div>`).join("")}</div>`:""}</div>`};

// Import a recipe from a link or text.
PAGES.import=()=>{const x=XS.imp||(XS.imp={src:""});return `<div class="x-page">${head("Import a recipe","Paste a link from a recipe site, TikTok, Instagram or YouTube, or paste the recipe text. Snapspoon adds calories and macros.")}
  <form data-xform="import" style="display:grid;gap:10px"><textarea id="xImpT" class="x-area" placeholder="https://… or the recipe text" required>${esc(x.src)}</textarea>
  ${x.err?`<p class="x-err">${esc(x.err)}</p>`:""}<div class="row"><button class="btn primary" ${x.busy?"disabled":""}>${x.busy?"Reading the recipe…":"Import recipe"}</button>${signInHint()}</div></form></div>`};

// Make a recipe lighter.
PAGES.lighter=id=>{const r=recipeById(id),x=XS.light&&XS.light.id===id?XS.light:(XS.light={id});
  if(!r)return `<div class="x-page">${head("Make it lighter","")}<p>That recipe wasn't found.</p></div>`;
  return `<div class="x-page">${head("Make it lighter",`Smart swaps for <b>${esc(r.title)}</b> (${r0(r.kcal)} kcal a serving).`,"#explore","Explore")}
  ${x.out?"":`<div class="row"><button class="btn primary" data-x="lighten" ${x.busy?"disabled":""}>${x.busy?"Finding swaps…":"Find healthier swaps"}</button>${signInHint()}</div>`}${x.err?`<p class="x-err">${esc(x.err)}</p>`:""}
  ${x.out?`<div class="x-card"><div class="row" style="justify-content:space-between"><h3>${esc(x.out.title)}</h3><span class="x-pill great num">${r0(x.out.kcal)} kcal${r.kcal>x.out.kcal?` · ${r0(r.kcal-x.out.kcal)} less`:""}</span></div>
    <div class="label">Swaps</div><ul style="margin:0;padding-left:20px">${(x.out.swaps||[]).map(s=>`<li>${esc(s)}</li>`).join("")}</ul>
    <div class="note num">${r0(x.out.p)}g protein · ${r0(x.out.c)}g carbs · ${r0(x.out.f)}g fat per serving</div>
    <div class="row"><button class="btn primary" data-x="light-save">${x.savedId?"Open the lighter recipe":"Save as a new recipe"}</button></div></div>`:""}</div>`};

// Hands-free cooking.
PAGES.cook=id=>{const r=recipeById(id),x=XS.cook&&XS.cook.id===id?XS.cook:(XS.cook={id,i:0});
  if(!r||!r.steps?.length)return `<div class="x-page">${head("Cooking mode","")}<p>This recipe has no steps.</p></div>`;
  const step=r.steps[x.i]||"",m=/(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(?:min|minute)/i.exec(step),mins=m?+(m[2]||m[1]):0;
  return `<div class="x-cook" role="dialog" aria-label="Cooking mode"><div style="display:grid;gap:10px">
    <div class="row" style="justify-content:space-between"><a class="btn sm" href="#explore">✕ Done</a><b>${esc(r.title)}</b><span class="note num">Step ${x.i+1} of ${r.steps.length}</span></div>
    <div class="x-bar"><i style="width:${(x.i+1)/r.steps.length*100}%"></i></div>
    <div class="row">${"speechSynthesis" in window?`<button class="chip" data-x="cook-read" aria-pressed="${!!x.read}">🔊 Read aloud</button>`:""}${SR?`<button class="chip" data-x="cook-listen" aria-pressed="${!!x.listen}">🎙️ Say “next”</button>`:""}${mins?`<button class="chip" data-x="cook-timer" data-m="${mins}">⏱️ ${x.left?`${Math.floor(x.left/60)}:${String(x.left%60).padStart(2,"0")}`:`${mins} min timer`}</button>`:""}</div></div>
    <div class="step">${esc(step)}</div>
    <div class="nav"><button class="btn" data-x="cook-prev" ${x.i?"":"disabled"}>Back</button><button class="btn primary" data-x="cook-next">${x.i<r.steps.length-1?"Next":"Finish"}</button></div></div>`};
MOUNT.cook=async()=>{try{const w=await navigator.wakeLock?.request("screen");if(w)cleanup.push(()=>w.release())}catch(e){}};
function cookGo(d){const x=XS.cook,r=recipeById(x.id);if(!r)return;
  if(x.i+d>=r.steps.length){celebrate("Enjoy your meal!","Log it from the recipe to keep your streak.");location.hash="#explore";setTimeout(()=>recipeSheet(r.id),300);return}
  x.i=Math.max(0,x.i+d);clearInterval(x.tick);x.left=0;paint();if(x.read)say(r.steps[x.i])}
function say(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=document.documentElement.lang||"en";speechSynthesis.speak(u)}catch(e){}}
let cookRec=null;
function cookListen(on){const x=XS.cook;x.listen=on;cookRec?.abort();cookRec=null;
  if(on){const go=()=>{if(!x.listen||parts()[0]!=="cook")return;cookRec=new SR();cookRec.continuous=true;cookRec.lang=document.documentElement.lang||"en";
    cookRec.onresult=e=>{const t=e.results[e.results.length-1][0].transcript.toLowerCase();if(/next|done|ok/.test(t))cookGo(1);else if(/back|previous/.test(t))cookGo(-1);else if(/repeat|again/.test(t)){const r=recipeById(x.id);say(r.steps[x.i])}};
    cookRec.onend=()=>setTimeout(go,300);cookRec.onerror=e=>{if(e.error==="not-allowed"){x.listen=false;toast("Allow the microphone for this site.");paint()}};cookRec.start()};go();
    cleanup.push(()=>{x.listen=false;cookRec?.abort();speechSynthesis?.cancel?.();clearInterval(x.tick)})}
  paint()}

// Badges and XP.
PAGES.badges=()=>{const x=myXp(),done=x.badges.filter(b=>b.done).length;return `<div class="x-page">${head("Badges and XP","You earn XP for logging meals, weighing in, making recipes and checking in.")}
  <div class="x-card"><div class="row" style="justify-content:space-between"><div><div class="label">Level</div><div class="x-big num">${x.level}</div></div><div style="text-align:right"><b class="num">${x.xp} XP</b><div class="note num">${x.size-x.into} XP to level ${x.level+1}</div></div></div><div class="x-bar"><i style="width:${x.into/x.size*100}%"></i></div></div>
  <div class="x-row"><span style="font-size:28px">🧊</span><div class="grow"><b>${E.freezes} streak freeze${E.freezes===1?"":"s"}</b><small class="note">A freeze covers one missed day so your streak survives. Earn one every 7 days in a row (up to 2).</small></div></div>
  <div class="label">${done} of ${x.badges.length} badges</div>
  <div class="x-badges">${x.badges.map(b=>`<div class="x-badge ${b.done?"":"locked"}"><span class="e">${b.emoji}</span><b>${b.title}</b><small>${b.how}</small></div>`).join("")}</div></div>`};

PAGES.recap=()=>{const r=recapSince(shiftDay(todayKey(),-6));return `<div class="x-page">${head("Weekly recap","Your last 7 days as a story.")}
  <div class="x-card"><div class="row" style="gap:24px"><div><div class="x-big num">${r.days}</div><span class="note">days logged</span></div><div><div class="x-big num">${r.onTarget}</div><span class="note">on target</span></div><div><div class="x-big num">${r.protein}</div><span class="note">g protein</span></div></div></div>
  <div class="row"><button class="btn primary" data-x="story" data-kind="recap">Play my week</button><button class="btn" data-x="share-card" data-kind="recap">Share a card</button></div></div>`};
PAGES.wrapped=()=>{const r=recapSince(`${new Date().getFullYear()}-01-01`);return `<div class="x-page">${head(`${new Date().getFullYear()} Wrapped`,"Your year in food: favorites, streaks and progress.")}
  ${r.days?`<div class="x-card"><div class="row" style="gap:24px"><div><div class="x-big num">${r.meals}</div><span class="note">meals logged</span></div><div><div class="x-big num">${r.streak.best}</div><span class="note">best streak</span></div></div>${r.top[0]?`<p style="margin:0">Most logged: <b>${esc(r.top[0][0])}</b></p>`:""}</div>
  <div class="row"><button class="btn primary" data-x="story" data-kind="wrapped">Play my Wrapped</button><button class="btn" data-x="share-card" data-kind="wrapped">Share a card</button></div>`:`<div class="empty"><h3>Nothing to wrap yet</h3>Log a few meals and come back.</div>`}</div>`};
PAGES.share=()=>`<div class="x-page">${head("Share stats","Make an image with your streak and progress for your story or a friend.")}
  <div class="x-card"><div class="row" style="gap:24px"><div><div class="x-big num">🔥 ${streakInfo().n}</div><span class="note">day streak</span></div><div><div class="x-big num">${myXp().level}</div><span class="note">level</span></div></div></div>
  <div class="row"><button class="btn primary" data-x="share-card" data-kind="recap">Make my card</button><button class="btn" data-x="share-card" data-kind="wrapped">Year card</button></div></div>`;

// Progress photos.
PAGES.progress=()=>{const ps=[...P].sort((a,b)=>a.at-b.at),a=ps[0],b=ps[ps.length-1];return `<div class="x-page">${head("Progress photos","Take a photo every week or two, same spot and light. Only you can see them.")}
  <div class="row"><label class="btn primary" for="xProgF">Add a photo</label><input type="file" id="xProgF" data-xfile="progress" accept="image/*" capture="user" hidden></div>
  ${ps.length>1?`<div class="x-compare" id="xCmp"><img src="${esc(a.url)}" alt="First photo"><img class="after" src="${esc(b.url)}" alt="Latest photo"><div class="line"></div><span style="left:10px">${fmtDay(a.date)}</span><span style="right:10px">${fmtDay(b.date)}</span></div><p class="note" style="margin:0">Drag across the photo to compare.</p>`:""}
  ${ps.length?`<div class="x-photos">${ps.slice().reverse().map(p=>`<figure><img src="${esc(p.url)}" alt="Progress photo" loading="lazy"><figcaption>${fmtDay(p.date)}${p.kg?` · ${showKg(p.kg)}`:""}</figcaption><button class="rm" data-x="prog-rm" data-id="${esc(p.id)}" aria-label="Delete photo">✕</button></figure>`).join("")}</div>`:`<div class="empty"><h3>No photos yet</h3>Your first photo is your starting point.</div>`}</div>`};
MOUNT.progress=()=>{};

// Mood check-ins.
PAGES.mood=()=>{const m=E.moods[todayKey()]||{},ins=moodInsights(),days=[...Array(14)].map((_,i)=>shiftDay(todayKey(),i-13));
  return `<div class="x-page">${head("Mood check-in","How you feel, next to what you ate. After a couple of weeks Snapspoon spots patterns.")}
  <div class="x-card"><b>How's your mood today?</b><div class="x-faces">${FACES.map((f,i)=>`<button data-x="mood" data-k="mood" data-v="${i+1}" aria-pressed="${m.mood===i+1}" aria-label="Mood ${i+1} of 5">${f}</button>`).join("")}</div>
    <b>And your energy?</b><div class="x-faces">${BOLTS.map((f,i)=>`<button data-x="mood" data-k="energy" data-v="${i+1}" aria-pressed="${m.energy===i+1}" aria-label="Energy ${i+1} of 5">${f}</button>`).join("")}</div></div>
  <div class="x-card"><div class="row" style="justify-content:space-between"><h3>Last 2 weeks</h3><span class="note"><i class="dot" style="background:var(--accent)"></i> mood <i class="dot" style="background:var(--carbs)"></i> energy</span></div>
    <div class="x-dots">${days.map(d=>{const x=E.moods[d]||{};return `<i style="height:${(x.mood||0)*20}%" title="${d}"></i><i class="e" style="height:${(x.energy||0)*20}%"></i>`}).join("")}</div></div>
  <div class="x-card"><h3>What we noticed</h3>${ins.length?ins.map(t=>`<p style="margin:0">${esc(t)}</p>`).join(""):`<p class="note" style="margin:0">Check in on a few more days (with and without logging) to see patterns.</p>`}</div></div>`};

// Challenges with leaderboards. Each person keeps their own entry in the shared "challenges" list.
const STARTERS=[{id:"s1",title:"30 days, no soda",about:"Swap soda for water, tea or sparkling water. Check in every day you skip it.",days:30},{id:"s2",title:"Protein at breakfast",about:"Get 25 g of protein before 10am for two weeks.",days:14},{id:"s3",title:"Log every meal",about:"Snap or log every meal for 21 days in a row.",days:21},{id:"s4",title:"10k steps a day",about:"Walk 10,000 steps a day for a month.",days:30}];
const CH={docs:{},on:false,err:null};
function chListen(){if(CH.on||S.mode!=="db"||!db)return;CH.on=true;
  try{db.collection("challenges").onSnapshot(s=>{const m={};s.docs.forEach(d=>{m[d.id]=d.data()||{}});CH.docs=m;CH.err=null;if(route()==="more")paint()},()=>{CH.err="Shared challenges aren't switched on yet, so only you can see yours for now."})}catch(e){}}
const chDocs=()=>({...CH.docs,[ME()]:E.ch});
const chAll=()=>{const made=Object.values(chDocs()).flatMap(d=>(d.made||[]));return[...STARTERS,...made.filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i)]};
const chMembers=id=>Object.entries(chDocs()).filter(([,d])=>d.joined?.[id]).map(([u,d])=>({u,d,n:(d.joined[id].days||[]).length,today:(d.joined[id].days||[]).includes(todayKey())}));
function chSave(){E.ch={...E.ch,handle:S.people[uidUser]?.handle||S.profile?.handle||"",name:S.people[uidUser]?.name||S.profile?.name||""};saveE();
  if(S.mode==="db"&&db)db.doc("challenges/"+uidUser).set(JSON.parse(JSON.stringify(E.ch))).catch(()=>{CH.err="Shared challenges aren't switched on yet, so only you can see yours for now."})}
const whoName=(u,d)=>u===ME()?"You":S.people[u]?.name||S.people[u]?.handle||d.name||d.handle||"Someone";
PAGES.challenges=()=>{const all=chAll(),mine=E.ch.joined||{};chListen();return `<div class="x-page">${head("Challenges","Join a challenge, check in each day, and climb the leaderboard with friends.")}
  ${S.mode!=="db"?`<p class="note" style="margin:0">Sign in to compete with other people. Until then your check-ins stay on this device.</p>${signInHint()}`:CH.err?`<p class="note" style="margin:0">${esc(CH.err)}</p>`:""}
  <div class="x-list">${all.map(c=>{const n=chMembers(c.id).length,j=!!mine[c.id];return `<a class="x-row" href="#more/challenge/${encodeURIComponent(c.id)}" style="text-decoration:none;color:inherit"><span style="font-size:26px">🏁</span><div class="grow"><b>${esc(c.title)}</b><small class="note">${c.days} days · ${n} ${n===1?"person":"people"}${j?` · you're in`:""}</small></div><span class="note">›</span></a>`}).join("")}</div>
  <form data-xform="ch-new" class="x-card"><h3>Start your own</h3><input id="xChT" class="x-input" placeholder="Name, like Veggies with every dinner" required minlength="3" maxlength="60"><input id="xChA" class="x-input" placeholder="What counts as a check-in?" maxlength="300"><div class="row"><select id="xChD" class="btn sm">${[7,14,21,30].map(d=>`<option value="${d}" ${d===14?"selected":""}>${d} days</option>`).join("")}</select><button class="btn primary">Start challenge</button></div></form></div>`};
PAGES.challenge=id=>{const c=chAll().find(x=>x.id===id);chListen();if(!c)return `<div class="x-page">${head("Challenge","","#more/challenges","Challenges")}<p>This challenge wasn't found.</p></div>`;
  const j=E.ch.joined?.[id],board=chMembers(id).sort((a,b)=>b.n-a.n),done=j?.days?.includes(todayKey());
  return `<div class="x-page">${head(esc(c.title),esc(c.about||""),"#more/challenges","Challenges")}
  <div class="row">${j?`<button class="btn ${done?"":"primary"}" data-x="ch-check" data-id="${esc(id)}">${done?"✓ Checked in today":"Check in for today"}</button><button class="btn ghost sm" data-x="ch-leave" data-id="${esc(id)}">Leave</button>`:`<button class="btn primary" data-x="ch-join" data-id="${esc(id)}">Join challenge</button>`}</div>
  ${j?`<div class="x-card"><div class="row" style="justify-content:space-between"><b>Your progress</b><span class="num note">${j.days.length} of ${c.days} days</span></div><div class="x-bar"><i style="width:${Math.min(100,j.days.length/c.days*100)}%"></i></div></div>`:""}
  <div class="x-card"><h3>Leaderboard</h3>${board.length?board.map((m,i)=>`<div class="x-row" style="background:var(--bg)"><b class="num" style="width:26px">${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</b><div class="grow"><b>${esc(whoName(m.u,m.d))}</b><small class="note">${m.today?"Checked in today":""}</small></div><span class="num">${m.n} day${m.n===1?"":"s"}</span></div>`).join(""):`<p class="note" style="margin:0">Nobody has joined yet. Be the first!</p>`}</div></div>`};

// Live cooking classes, from the same list as the phone app.
const CL={rows:null,err:null,busy:false};
async function loadClasses(){const sb=cloud().sb;if(!sb){CL.rows=[];return}CL.busy=true;
  try{const since=new Date(Date.now()-3*36e5).toISOString();const{data,error}=await sb.from("cooking_classes").select("*").gte("starts_at",since).order("starts_at").limit(40);if(error)throw error;
    const ids=[...new Set((data||[]).map(r=>r.host))];const{data:ps}=ids.length?await sb.from("profiles").select("id,handle,name").in("id",ids):{data:[]};
    const by=Object.fromEntries((ps||[]).map(p=>[p.id,p]));CL.rows=(data||[]).map(r=>({...r,hostP:by[r.host]}))}
  catch(e){CL.rows=[];CL.err="Classes couldn't be loaded right now."}CL.busy=false;paint()}
PAGES.classes=()=>{if(CL.rows===null&&!CL.busy)setTimeout(loadClasses,0);const rows=CL.rows||[];return `<div class="x-page">${head("Live cooking classes","Cook along with Snapspoon chefs in real time.")}
  ${CL.busy?spin("Loading classes…"):CL.err?`<p class="note">${esc(CL.err)}</p>`:""}
  ${rows.length?`<div class="x-list">${rows.map(r=>{const t=new Date(r.starts_at),live=Date.now()>=t-6e5&&Date.now()<=+t+r.minutes*6e4,rem=E.classRemind.includes(r.id),safe=/^https:\/\//i.test(r.link||"");
    return `<div class="x-row"><span style="font-size:26px">${live?"🔴":"🍳"}</span><div class="grow"><b>${esc(r.title)}</b><small class="note">${live?"Live now":t.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})} · ${r.minutes} min${r.hostP?` · @${esc(r.hostP.handle)}`:""}</small></div>${live&&safe?`<a class="btn primary sm" href="${esc(r.link)}" target="_blank" rel="noopener">Join</a>`:`<button class="btn sm" data-x="class-remind" data-id="${esc(r.id)}">${rem?"✓ Reminder on":"Remind me"}</button>`}</div>`}).join("")}</div>`:CL.busy?"":`<div class="empty"><h3>No classes scheduled</h3>New live classes from Snapspoon chefs show up here.</div>`}</div>`};

// Healthy chefs: Snapspoon chefs and verified creators.
const CF={rows:null,busy:false};
async function loadChefs(){const sb=cloud().sb;CF.busy=true;let rows=[];
  if(sb){try{const{data}=await sb.from("profiles").select("*").or("chef.eq.true,verified.eq.true").limit(60);rows=(data||[]).map(p=>({...p,app:true}))}catch(e){}}
  Object.entries(S.people).forEach(([id,p])=>{if(isVerified(id,p.handle)&&!rows.some(r=>r.handle===p.handle))rows.push({id,handle:p.handle,name:p.name,bio:p.bio,photo:p.photo,web:true})});
  CF.rows=rows.sort((a,b)=>(!!b.chef)-(!!a.chef));CF.busy=false;paint()}
PAGES.chefs=()=>{if(CF.rows===null&&!CF.busy)setTimeout(loadChefs,0);const rows=CF.rows||[];return `<div class="x-page">${head("Healthy chefs","Verified creators and Snapspoon chefs. Only Snapspoon can give the chef badge.")}
  ${CF.busy?spin("Loading chefs…"):""}
  ${rows.length?`<div class="x-list">${rows.map(p=>`<${p.web?`button data-person="${esc(p.id)}"`:"div"} class="x-row" style="width:100%;border:0;font:inherit;color:inherit;text-align:left;${p.web?"cursor:pointer":""}">${avatar(p,44)}<div class="grow"><b>${esc(p.name||p.handle)}${p.chef?" 👩‍🍳":""}</b><small class="note">@${esc(p.handle)}${p.specialty?` · ${esc(p.specialty)}`:""}</small></div></${p.web?"button":"div"}>`).join("")}</div>`:CF.busy?"":`<div class="empty"><h3>No chefs yet</h3>Verified creators and Snapspoon chefs will be listed here.</div>`}</div>`};

// ---------- extra buttons on the existing screens ----------
const insertAfter=(html,marker,add)=>{const i=html.indexOf(marker);if(i<0)return html;const j=html.indexOf("</div>",i);return j<0?html:html.slice(0,j+6)+add+html.slice(j+6)};
const QUICK=[["📷","Live camera","Point and see","live"],["🎙️","Say it","Log by voice","voice"],["🤖","What to eat","Coach ideas","coach"],["🗓️","Meal plan","Week + groceries","plan"],["🧊","Fridge scan","Cook what you have","fridge"],["✨","Everything","All the tools","hub"]];
const qtile=([e,n,s,p])=>`<a class="x-tile" href="#more${p==="hub"?"":"/"+p}"><span class="e">${e}</span><b>${n}</b><small>${s}</small></a>`;
const _home=viewHome;
viewHome=function(){return insertAfter(_home(),'class="home-actions"',`<div class="x-strip" aria-label="Tools">${QUICK.map(qtile).join("")}</div>`)};
const _today=viewToday;
viewToday=function(){
  let h=_today();if(UI.day!==todayKey())return h;
  h=insertAfter(h,'class="track-actions"',`<div class="row" style="margin-top:-6px"><a class="btn sm" href="#more/voice">🎙️ Say it</a><a class="btn sm" href="#more/live">📷 Live camera</a><a class="btn sm" href="#more/menu">🍽️ Menu</a></div>`);
  const l=meLeft(),x=myXp(),gd=goalDate(),m=E.moods[todayKey()];
  const cards=`<div class="x-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-top:20px">
    <a class="x-card" href="#more/coach" style="text-decoration:none;color:inherit"><div class="label">AI coach</div><b>${l.kcal>0?`${r0(l.kcal)} kcal left. See what fits.`:"You've hit today's calories. See light snack ideas."}</b></a>
    ${m?`<a class="x-card" href="#more/mood" style="text-decoration:none;color:inherit"><div class="label">Mood</div><b>${FACES[(m.mood||3)-1]} ${BOLTS[(m.energy||3)-1]} Checked in today</b></a>`:`<a class="x-card" href="#more/mood" style="text-decoration:none;color:inherit"><div class="label">Mood check-in</div><b>How do you feel today? 🙂</b></a>`}
    <button class="x-card" data-x="weight" style="border:0;font:inherit;color:inherit;text-align:left;cursor:pointer"><div class="label">Goal date</div><b>${gd?gd.reached?"You've reached your goal weight! 🎉":`At this pace, you'll reach your goal by ${niceDate(gd.date)}.`:"Log your weight 3 times to see when you'll reach your goal."}</b><small class="note">Tap to log your weight</small></button>
    <a class="x-card" href="#more/badges" style="text-decoration:none;color:inherit"><div class="label">Level ${x.level} · ${E.freezes} 🧊</div><div class="x-bar"><i style="width:${x.into/x.size*100}%"></i></div><small class="note num">${x.xp} XP · ${x.badges.filter(b=>b.done).length} badges</small></a></div>`;
  return h.replace('<div id="goalsBox"></div>',cards+'<div id="goalsBox"></div>');
};
const _acct=viewAccount;
viewAccount=function(){const h=_acct();if(!h.includes('class="acct-actions"'))return h;
  return insertAfter(h,'class="acct-actions"',`<div class="x-strip" style="margin:4px 0 6px">${[["🏅","Badges",`Level ${myXp().level}`,"badges"],["🪞","Progress","Photos","progress"],["🏁","Challenges","With friends","challenges"],["🎁","Wrapped","Your year","wrapped"],["✨","More","All tools","hub"]].map(qtile).join("")}</div>`)};
const _recipe=recipeSheet;
recipeSheet=function(id){_recipe(id);const r=recipeById(id);if(!r)return;const inner=[...document.querySelectorAll("#layer .sheet .inner")].pop();if(!inner)return;
  const b=[r.steps?.length?`<a class="btn sm" href="#more/cook/${encodeURIComponent(r.id)}" data-act="close">👩‍🍳 Cook hands-free</a>`:"",r.kcal&&r.ing?.length?`<a class="btn sm" href="#more/lighter/${encodeURIComponent(r.id)}" data-act="close">🥗 Make it lighter</a>`:""].join("");
  if(b)inner.insertAdjacentHTML("afterbegin",`<div class="row">${b}</div>`)};
const _person=personSheet;
personSheet=function(id){_person(id);if(id===uidUser||S.mode!=="db"||isBlocked(id))return;const row=$("#layer .sheet .inner .row");
  row&&row.insertAdjacentHTML("afterend",`<div class="row"><button class="btn sm" data-x="high-five" data-id="${esc(id)}">🙌 High five</button></div>`)};
const _settings=settingsSheet;
settingsSheet=function(){_settings();const g=$("#layer .sheet .set-group");if(!g)return;const p=themePref(),times=learnedTimes();
  g.insertAdjacentHTML("beforebegin",`<div class="set-group"><div class="label">Appearance</div><div class="set-card" style="padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px"><b>Theme</b><span class="seg">${[["auto","Auto"],["light","Light"],["dark","Dark"]].map(([k,l])=>`<button data-x="theme" data-v="${k}" aria-pressed="${p===k}">${l}</button>`).join("")}</span></div></div>`);
  const n=[...document.querySelectorAll("#layer .set-group")].find(x=>/Notifications/.test(x.textContent));
  if(n&&times.length)n.querySelector(".set-card")?.insertAdjacentHTML("beforeend",`<div style="padding:12px 14px"><b>Smart reminders</b><small class="note" style="display:block">Learned from when you usually eat: ${times.map(t=>`${t.meal.toLowerCase()} around ${t.label}`).join(", ")}. On the website they only show while Snapspoon is open.</small></div>`)};

// Quick add: the mic opens straight away. Say what you ate, AI splits it into foods, one tap logs it. Typing still works below.
const QA={};
const _manual=manualSheet;
manualSheet=function(){_manual();QA.text="";QA.res=null;QA.err=null;QA.busy=false;const h=$("#layer .sheet .inner h2");if(!h)return;
  h.insertAdjacentHTML("afterend",`<div id="xQA" class="x-card" style="background:var(--bg)"></div><div class="label">Or type the numbers</div>`);qaDraw();
  if(SR&&cloud().ai&&cloud().signedIn)qaListen()};
function qaDraw(){const el=$("#xQA");if(!el)return;const r=QA.res;
  if(r){const t=r.items.reduce((a,i)=>({kcal:a.kcal+(+i.kcal||0),p:a.p+(+i.protein||0),c:a.c+(+i.carbs||0),f:a.f+(+i.fat||0)}),{kcal:0,p:0,c:0,f:0});
    el.innerHTML=`<div class="row" style="justify-content:space-between"><b>${esc(r.meal_name||"Your meal")}</b><span class="badge">${esc(r.confidence||"medium")} confidence</span></div>
      <div class="x-list">${r.items.map(i=>`<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span>${esc(i.name)} <small class="note num">${r0(i.grams)} g</small></span><span class="num">${r0(i.kcal)} kcal</span></div>`).join("")}</div>
      <div class="row" style="justify-content:space-between"><b class="num">${r0(t.kcal)} kcal</b><span class="note num">${r0(t.p)}P ${r0(t.c)}C ${r0(t.f)}F</span></div>
      <div class="row"><select id="xQAMeal" class="btn sm" aria-label="Meal">${MEALS.map(m=>`<option ${m===guessMeal()?"selected":""}>${m}</option>`).join("")}</select><button class="btn primary" data-x="qa-log">Add to ${UI.day===todayKey()?"today":esc(fmtDay(UI.day))}</button><button class="btn ghost sm" data-x="qa-edit">Edit foods</button><button class="btn ghost sm" data-x="qa-again">Say it again</button></div>`;return}
  const can=!!(SR&&cloud().ai);
  el.innerHTML=`<div class="row" style="flex-wrap:nowrap;align-items:center">${SR?`<button class="x-mic ${QA.on?"on":""}" data-x="qa-mic" style="width:56px;height:56px;flex:none" aria-label="${QA.on?"Stop listening":"Talk to log a meal"}">${icon('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',26)}</button>`:""}
    <div style="min-width:0;flex:1"><b>${QA.busy?"Working it out…":QA.on?"Listening… say what you ate":SR?"Tap the mic and say what you ate":"Say it with AI"}</b><div class="note">${esc(QA.text)||"Like “two eggs on toast and a latte”"}</div></div>${QA.busy?'<span class="spinner"></span>':""}</div>
    ${!SR?`<form data-xform="qa-type" class="row" style="flex-wrap:nowrap"><input id="xQAT" class="x-input" placeholder="Describe your meal"><button class="btn sm">Go</button></form>`:""}
    ${QA.err?`<p class="x-err">${esc(QA.err)}</p>`:""}${!cloud().configured?`<p class="note" style="margin:0">Talking to log turns on once the Snapspoon server is set up. You can type the numbers below for now.</p>`:!cloud().signedIn?signInHint():""}`;
}
let qaRec=null;
function qaListen(){if(QA.on){qaRec?.stop();return}if(!SR)return;
  qaRec=new SR();qaRec.lang=document.documentElement.lang||"en";qaRec.interimResults=true;qaRec.continuous=false;
  qaRec.onresult=e=>{QA.text=[...e.results].map(r=>r[0].transcript).join(" ");const fin=e.results[e.results.length-1].isFinal;qaDraw();if(fin)qaEstimate(QA.text)};
  qaRec.onend=()=>{QA.on=false;qaDraw()};qaRec.onerror=e=>{QA.on=false;if(e.error==="not-allowed")QA.err="Allow the microphone for this site to talk.";qaDraw()};
  QA.on=true;QA.err=null;try{qaRec.start()}catch(e){QA.on=false}qaDraw()}
async function qaEstimate(t){if(!t.trim())return;QA.busy=true;QA.err=null;qaDraw();
  try{const o=await ai({mode:"text",text:t});QA.res={meal_name:o.meal_name,items:(o.items||[]).map(i=>({name:i.name,grams:+i.grams||0,kcal:+i.kcal||0,protein:+i.protein||0,carbs:+i.carbs||0,fat:+i.fat||0})),confidence:o.confidence,notes:o.notes}}
  catch(e){QA.err=errMsg(e)}QA.busy=false;qaDraw()}

// Saved videos: a bookmark on cooking videos (in Explore and the full-screen player), shown in Account › Saved.
const vSaved=id=>(E.savedVideos||[]).some(x=>x.id===id);
function toggleVideo(r){const list=E.savedVideos||[],on=!vSaved(r.id);
  E.savedVideos=on?[JSON.parse(JSON.stringify({...r,localVideo:undefined})),...list].slice(0,200):list.filter(x=>x.id!==r.id);saveE();toast(on?"Saved to your videos":"Removed from saved");return on}
const BM=on=>icon('<path d="M6 3h12v18l-6-4-6 4z"/>',26,on?"currentColor":"none");
const _rails=plRails;
plRails=function(){_rails();document.querySelectorAll("#player .pl-rail").forEach(el=>{const r=PL.list[+el.dataset.i];if(!r||el.querySelector("[data-x='vsave']"))return;const on=vSaved(r.id);
  el.querySelector('[data-pl="share"]')?.insertAdjacentHTML("beforebegin",`<button class="pl-btn" data-x="vsave" data-i="${el.dataset.i}" aria-pressed="${on}" aria-label="Save">${BM(on)}<small>${on?"Saved":"Save"}</small></button>`)})};
const _disc=viewDiscover;
viewDiscover=function(){return _disc().replace(/data-open="([^"]+)">View recipe<\/button>/g,(m,id)=>`${m}<button class="btn sm" data-x="vsave-reel" data-id="${id}">${vSaved(id.replace(/&amp;/g,"&"))?"✓ Saved":"Save"}</button>`)};
const _saved=savedList;
savedList=function(){const vids=E.savedVideos||[];
  if(!vids.length){if(UI.savedBoard==="videos")UI.savedBoard=null;return _saved()}
  const only=UI.savedBoard==="videos";if(only)UI.savedBoard=null;let h=_saved();if(only)UI.savedBoard="videos";
  h=h.replace('">All</button>',`">All</button><button class="chip" data-act="saved-board" data-id="videos" aria-pressed="${only}">Videos</button>`);
  if(only)h=h.replace('data-id="" aria-pressed="true"','data-id="" aria-pressed="false"');
  const grid=`<div class="grid3" style="margin:4px 0 14px">${vids.map((r,i)=>`<button data-x="vopen" data-i="${i}" aria-label="${esc(r.title||"Cooking video")}, video">${r.cover?`<img src="${esc(r.cover)}" alt="">`:r.video?`<video src="${esc(r.video)}" muted playsinline preload="metadata"></video>`:art(r)}<span class="mark">▶</span></button>`).join("")}</div>`;
  const cut=h.indexOf("</div>")+6; // right after the board chips
  return h.slice(0,cut)+grid+(only?"":h.slice(cut).replace("Tap the bookmark on any recipe to save it here.","Tap the bookmark on any recipe or video to save it here."));
};

// ---------- smart reminders: learned meal times ----------
function learnedTimes(){
  const since=shiftDay(todayKey(),-30),out=[];
  for(const meal of ["Breakfast","Lunch","Dinner"]){const mins=Object.keys(S.days).filter(k=>k>=since).flatMap(k=>S.days[k]).filter(e=>e.meal===meal&&e.t).map(e=>{const d=new Date(e.t);return d.getHours()*60+d.getMinutes()}).sort((a,b)=>a-b);
    if(mins.length<3)continue;const m=mins[Math.floor(mins.length/2)],d=new Date();d.setHours(Math.floor(m/60),m%60,0,0);out.push({meal,min:m,label:d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})})}
  return out;
}
let reminded=false;
function scheduleReminders(){if(reminded||!("Notification" in window)||Notification.permission!=="granted"||!socGet("notify",true))return;reminded=true;
  const now=new Date(),nowMin=now.getHours()*60+now.getMinutes();
  learnedTimes().forEach(t=>{const at=t.min+20;if(at<=nowMin)return;setTimeout(()=>{if(dayEntries(todayKey()).some(e=>e.meal===t.meal))return;try{new Notification("Snapspoon",{body:`Time to log ${t.meal.toLowerCase()}? Snap it in a second.`,icon:"icon-192.png"})}catch(e){}},(at-nowMin)*6e4)})}

// ---------- after every render ----------
let started=false;
function afterRender(){
  if(!S.ready||UI.ob||!S.profile)return;
  if(!started&&(S.mode==="db"||!db)){started=true;applyFreezes();scheduleReminders()}
  checkBadges();
  if(S.mode==="db")chListen();
}

// ---------- clicks and forms ----------
document.addEventListener("click",async e=>{
  const el=e.target.closest("[data-x]");if(!el)return;const a=el.dataset.x;
  if(a==="theme"){try{localStorage.setItem("snapspoon:theme",el.dataset.v)}catch(err){}applyTheme();settingsSheet();return}
  if(a==="weight"){weightSheet();return}
  if(a==="vsave"){const r=PL.list[+el.dataset.i];if(!r)return;const on=toggleVideo(r);el.setAttribute("aria-pressed",on);el.innerHTML=`${BM(on)}<small>${on?"Saved":"Save"}</small>`;return}
  if(a==="vsave-reel"){const r=(UI.watchList||[]).find(x=>x.id===el.dataset.id);if(!r)return;const on=toggleVideo(r);el.textContent=on?"✓ Saved":"Save";return}
  if(a==="vopen"){openPlayer(E.savedVideos,+el.dataset.i);return}
  if(a==="qa-mic"){qaListen();return}
  if(a==="qa-again"){QA.res=null;QA.text="";qaDraw();qaListen();return}
  if(a==="qa-edit"){const r=QA.res;closeSheet();showEstimate(r);return}
  if(a==="qa-log"){const r=QA.res,t=r.items.reduce((x,i)=>({kcal:x.kcal+i.kcal,p:x.p+i.protein,c:x.c+i.carbs,f:x.f+i.fat}),{kcal:0,p:0,c:0,f:0});
    addEntry(UI.day,{name:r.meal_name||"Meal",kcal:r0(t.kcal),p:r0(t.p),c:r0(t.c),f:r0(t.f),meal:$("#xQAMeal").value,src:"voice",hue:hashStr(r.meal_name||"x")%360});closeSheet();render();toast(`Logged ${r0(t.kcal)} kcal`);return}
  if(a==="story"){openStory(el.dataset.kind);return}
  if(a==="share-card"){shareCard(el.dataset.kind);return}
  if(a==="write"){aiRecipeSheet();const t=$("#aiPrompt");if(t)t.value=el.dataset.t;return}
  if(a==="high-five"){const st=S.people[el.dataset.id]?.streak;sendMsg(el.dataset.id,st?`🙌 High five on your ${st} day streak! Keep it going.`:"🙌 High five! Keep it up.");el.textContent="🙌 Sent";el.disabled=true;toast("High five sent");return}
  if(a==="live-toggle"){const x=XS.live||(XS.live={});x.on=!x.on;x.err=null;liveGuessUI();if(x.on)liveLoop();return}
  if(a==="live-snap"){const v=$("#xLiveV");if(!v||!v.videoWidth){toast("The camera isn't on.");return}XS.live.on=false;
    const c=frame(v,1568,.9);c.toBlob(b=>{const f=new File([b],"meal.jpg",{type:"image/jpeg"});if(UI.snap.url)URL.revokeObjectURL(UI.snap.url);UI.snap={file:f,url:URL.createObjectURL(f),busy:false,result:null,err:null,meal:guessMeal()};location.hash="#snap";if(sample&&sampleImages)setTimeout(analyze,60)},"image/jpeg",.88);return}
  if(a==="voice-mic"){voiceMic();return}
  if(a==="menu-log"){const d=XS.menu.dishes[+el.dataset.i];addEntry(todayKey(),{name:d.name,kcal:r0(d.kcal),p:r0(d.protein),c:0,f:0,meal:guessMeal(),src:"menu",hue:hashStr(d.name)%360});toast(`Logged ${r0(d.kcal)} kcal`);el.textContent="✓";el.disabled=true;return}
  if(a==="grocery-share"){const t=E.plan.grocery.map(g=>`${g.aisle}\n${g.items.map(i=>"• "+i).join("\n")}`).join("\n\n");if(navigator.share)navigator.share({title:"Grocery list",text:t}).catch(()=>{});else{navigator.clipboard?.writeText(t);toast("Copied")}return}
  if(a==="fridge-save"){const x=XS.fridge,i=+el.dataset.i;x.saved=x.saved||{};if(x.saved[i]){recipeSheet(x.saved[i]);return}const r=saveRecipe(toRecipe(x.out.recipes[i]));x.saved[i]=r.id;paint();return}
  if(a==="lighten"){const x=XS.light,r=recipeById(x.id);x.busy=true;x.err=null;paint();
    try{x.out=await ai({mode:"lighten",recipe:{title:r.title,serv:r.serv,kcal:r.kcal,p:r.p,c:r.c,f:r.f,ing:r.ing,steps:r.steps}})}catch(err){x.err=errMsg(err)}x.busy=false;paint();return}
  if(a==="light-save"){const x=XS.light;if(x.savedId){recipeSheet(x.savedId);return}const r=saveRecipe(toRecipe(x.out));x.savedId=r.id;paint();recipeSheet(r.id);return}
  if(a==="cook-next"){cookGo(1);return}
  if(a==="cook-prev"){cookGo(-1);return}
  if(a==="cook-read"){const x=XS.cook;x.read=!x.read;if(x.read)say(recipeById(x.id).steps[x.i]);else speechSynthesis.cancel();paint();return}
  if(a==="cook-listen"){cookListen(!XS.cook.listen);return}
  if(a==="cook-timer"){const x=XS.cook;clearInterval(x.tick);x.left=+el.dataset.m*60;paint();x.tick=setInterval(()=>{x.left--;const b=$('[data-x="cook-timer"]');if(b)b.textContent=`⏱️ ${Math.floor(x.left/60)}:${String(x.left%60).padStart(2,"0")}`;
      if(x.left<=0){clearInterval(x.tick);x.left=0;buzz([300,120,300]);say("Time's up");celebrate("Time's up!","On to the next step.");paint()}},1000);cleanup.push(()=>clearInterval(x.tick));return}
  if(a==="prog-rm"){if(!confirm("Delete this photo?"))return;P=P.filter(p=>p.id!==el.dataset.id);saveP();paint();return}
  if(a==="mood"){const k=todayKey(),m={mood:3,energy:3,...(E.moods[k]||{})};m[el.dataset.k]=+el.dataset.v;E.moods={...E.moods,[k]:m};saveE();paint();checkBadges();return}
  if(a==="ch-join"){E.ch.joined={...E.ch.joined,[el.dataset.id]:{at:Date.now(),days:[]}};chSave();paint();toast("You're in. Check in every day!");return}
  if(a==="ch-leave"){if(!confirm("Leave this challenge? Your check-ins are removed."))return;const j={...E.ch.joined};delete j[el.dataset.id];E.ch.joined=j;chSave();paint();return}
  if(a==="ch-check"){const j=E.ch.joined[el.dataset.id],k=todayKey();j.days=j.days.includes(k)?j.days.filter(d=>d!==k):[...j.days,k];chSave();paint();if(j.days.includes(k)){buzz(20);toast("Checked in")}return}
  if(a==="class-remind"){const id=el.dataset.id;E.classRemind=E.classRemind.includes(id)?E.classRemind.filter(x=>x!==id):[...E.classRemind,id];saveE();paint();
    if(E.classRemind.includes(id)&&"Notification" in window&&Notification.permission==="default")Notification.requestPermission();return}
});
document.addEventListener("change",async e=>{
  const c=e.target.closest("[data-xchk]");if(c){const k=c.dataset.xchk;E.groceryDone=c.checked?[...E.groceryDone,k]:E.groceryDone.filter(x=>x!==k);saveE();c.closest(".x-chk")?.classList.toggle("done",c.checked);return}
  const f=e.target.closest("[data-xfile]");if(!f||!f.files[0])return;const file=f.files[0],kind=f.dataset.xfile;f.value="";
  if(kind==="progress"){addProgress(file);return}
  const x=XS[kind];if(x.url)URL.revokeObjectURL(x.url);x.url=URL.createObjectURL(file);x.busy=true;x.err=null;x.out=null;x.dishes=null;x.saved=null;paint();
  try{const body=await photoBody(file);
    if(kind==="menu")x.dishes=((await ai({mode:"menu",...body,kcalLeft:meLeft().kcal}))?.dishes)||[];
    if(kind==="fridge")x.out=await ai({mode:"fridge",...body});
  }catch(err){x.err=errMsg(err)}
  x.busy=false;paint();
});
document.addEventListener("submit",async e=>{
  const f=e.target.closest("[data-xform]");if(!f)return;e.preventDefault();const k=f.dataset.xform;
  if(k==="weight"){let v=+$("#xKg").value;if(!v)return;if(imp())v=v/2.20462;E.weights={...E.weights,[todayKey()]:Math.round(v*10)/10};saveE();closeSheet();render();toast("Weight saved");return}
  if(k==="qa-type"){const t=$("#xQAT").value.trim();QA.text=t;if(t)qaEstimate(t);return}
  if(k==="voice"){const t=$("#xVoiceT").value.trim();if(t)estimateText(t);return}
  if(k==="coach"){const x=XS.coach;x.prefs=$("#xPrefs").value.trim();x.busy=true;x.err=null;paint();const l=meLeft();
    try{x.out=await ai({mode:"coach",left:l,eaten:dayEntries(todayKey()).map(e=>e.name),meal:guessMeal(),prefs:x.prefs})}catch(err){x.err=errMsg(err)}x.busy=false;paint();return}
  if(k==="plan"){const x=XS.plan;x.prefs=$("#xPlanP").value.trim();x.busy=true;x.err=null;paint();
    try{const o=await ai({mode:"plan",kcal:S.settings.kcal,protein:S.settings.p,prefs:x.prefs});E.plan={days:o.days||[],grocery:o.grocery||[],made:todayKey(),kcal:S.settings.kcal};E.groceryDone=[];saveE()}catch(err){x.err=errMsg(err)}x.busy=false;paint();return}
  if(k==="import"){const x=XS.imp;x.src=$("#xImpT").value.trim();if(!x.src)return;x.busy=true;x.err=null;paint();
    try{const o=await ai({mode:"import",source:x.src});const r=saveRecipe(toRecipe(o,{source:/^https?:\/\//i.test(x.src)?x.src:undefined}));x.src="";x.busy=false;paint();recipeSheet(r.id)}catch(err){x.err=errMsg(err);x.busy=false;paint()}return}
  if(k==="ch-new"){const t=$("#xChT").value.trim(),ab=$("#xChA").value.trim(),d=+$("#xChD").value;
    if(blockedReason(t+" "+ab)){toast("That has words that aren't allowed on Snapspoon.");return}
    const c={id:"c-"+uid(),title:t.slice(0,60),about:ab.slice(0,300),days:d,by:ME()};E.ch.made=[...(E.ch.made||[]),c].slice(-20);E.ch.joined={...E.ch.joined,[c.id]:{at:Date.now(),days:[]}};chSave();location.hash="#more/challenge/"+encodeURIComponent(c.id);return}
});
// Compare slider for progress photos.
document.addEventListener("pointermove",e=>{const c=e.target.closest&&e.target.closest("#xCmp");if(!c||(e.pointerType==="mouse"&&!e.buttons))return;const r=c.getBoundingClientRect();c.style.setProperty("--cut",Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100))+"%")});
document.addEventListener("pointerdown",e=>{const c=e.target.closest&&e.target.closest("#xCmp");if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty("--cut",Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100))+"%")});

async function addProgress(file){
  toast("Saving photo…");
  try{const url=URL.createObjectURL(file),img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url});
    const s=Math.min(1,720/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    let out=c.toDataURL("image/jpeg",.72);
    if(assets){try{const b=await new Promise(ok=>c.toBlob(ok,"image/jpeg",.8));out=(await assets.upload(b)).url}catch(e){}}
    const last=Object.keys(E.weights).sort().pop();
    P=[...P,{id:uid(),at:Date.now(),date:todayKey(),url:out,kg:last?E.weights[last]:undefined}].slice(-40);saveP();paint();checkBadges();toast("Photo saved")}
  catch(e){toast("That photo couldn't be read.")}
}

render();
})();
