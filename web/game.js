// TIME DEBT SIMULATOR v3 — Complete Single File
'use strict';
const W=1280,H=720;
const C=document.getElementById('c');
const X=C.getContext('2d');
C.width=W;C.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);C.style.width=s*W+'px';C.style.height=s*H+'px';}
addEventListener('resize',resize);resize();

// ── Constants ──────────────────────────────────────────────────────────
const MIN=60,HR=3600,DAY=86400,WK=604800,MO=2592000,YR=31536000;
const WW=9000,WH=1400,RT=520,RB=880,RM=(RT+RB)/2;

// ── Zones ──────────────────────────────────────────────────────────────
const ZONES=[
  {x0:0,   x1:1100,name:'Zone 1  Spawn District',   col:'#00ff64',info:'Safe zone. Learn controls here.'},
  {x0:1200,x1:2300,name:'Zone 2  Crystal Market',   col:'#00ccff',info:'Collect crystals to gain lifespan.'},
  {x0:2400,x1:3500,name:'Zone 3  Industrial Maze',  col:'#ff8800',info:'Narrow paths. First enemies appear.'},
  {x0:3600,x1:4700,name:'Zone 4  Collector Zone',   col:'#ff2020',info:'Heavy enemy patrols. Stay moving.'},
  {x0:4800,x1:5900,name:'Zone 5  Time Bank District',col:'#ffee00',info:'Deposit or withdraw lifespan here.'},
  {x0:6000,x1:7100,name:'Zone 6  Neon Graveyard',   col:'#cc00ff',info:'Ghost enemies. Watch for trap crystals.'},
  {x0:7200,x1:8100,name:'Zone 7  Corporate Sector', col:'#ff0088',info:'Fast guards + toll gates drain time.'},
  {x0:8200,x1:9000,name:'Zone 8  Escape Portal',    col:'#00ffff',info:'Find the portal. Escape now!'},
];

// ── Difficulties ───────────────────────────────────────────────────────
const DIFF={
  easy:  {label:'EASY',  col:'#00ff64',life:100*YR, walk:MIN*0.4, run:MIN*2,  jump:MIN*5,  hit:MO*6,   ps:{p:45, c:90}, det:150, cb:1.5, icon:'🌱',tip:'Great for first-timers'},
  medium:{label:'MEDIUM',col:'#ffee00',life:100*YR, walk:MIN,     run:MIN*5,  jump:MIN*10, hit:YR,     ps:{p:65, c:130},det:200, cb:1.0, icon:'⚡',tip:'The intended experience'},
  hard:  {label:'HARD',  col:'#ff2020',life:60*YR,  walk:MIN*2,   run:MIN*10, jump:MIN*20, hit:YR*2,   ps:{p:95, c:185},det:250, cb:0.7, icon:'💀',tip:'60 years · Brutal costs'},
};
let df=DIFF.medium;

// ── Utilities ──────────────────────────────────────────────────────────
const dst=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const clp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
function mkR(seed){let s=seed|0;return()=>{s=(Math.imul(1664525,s)+1013904223)|0;return(s>>>0)/4294967296;};}
function fmtL(s){
  s=Math.max(0,s);
  const y=Math.floor(s/YR);s-=y*YR;
  const m=Math.floor(s/MO);s-=m*MO;
  const d=Math.floor(s/DAY);s-=d*DAY;
  const h=Math.floor(s/HR);
  return y+'Y  '+m+'Mo  '+d+'D  '+h+'H';
}
function gz(wx){return ZONES.find(z=>wx>=z.x0&&wx<z.x1)||ZONES[ZONES.length-1];}

// ── Input ──────────────────────────────────────────────────────────────
const K={};
addEventListener('keydown',e=>{K[e.code]=true;e.preventDefault();});
addEventListener('keyup',  e=>{K[e.code]=false;});
const VK={u:0,d:0,l:0,r:0,run:0,jump:0,e:0};
let MX=0,MY=0;
function gp(e){const r=C.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
C.addEventListener('mousemove',e=>{const p=gp(e);MX=p.x;MY=p.y;if(e.buttons&1)doVK(p,1);});
C.addEventListener('mousedown',e=>{const p=gp(e);doVK(p,1);onClick(p);});
C.addEventListener('mouseup',  ()=>clrVK());
C.addEventListener('touchstart',e=>{e.preventDefault();const p=gp(e.touches[0]);doVK(p,1);onClick(p);},{passive:false});
C.addEventListener('touchend',  e=>{e.preventDefault();clrVK();},{passive:false});
C.addEventListener('touchmove', e=>{e.preventDefault();doVK(gp(e.touches[0]),1);},{passive:false});
function clrVK(){for(const k in VK)VK[k]=0;}
function ir(p,r){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;}

// D-pad
const PS=60,PX=16,PY=H-198;
const DP=[{x:PX+PS,y:PY,w:PS,h:PS,k:'u'},{x:PX+PS,y:PY+PS*2,w:PS,h:PS,k:'d'},{x:PX,y:PY+PS,w:PS,h:PS,k:'l'},{x:PX+PS*2,y:PY+PS,w:PS,h:PS,k:'r'}];
const AB=[{x:W-205,y:H-205,w:82,h:56,k:'jump',lbl:'JUMP',col:'#ffee00'},{x:W-113,y:H-205,w:82,h:56,k:'run',lbl:'RUN',col:'#00ff64'},{x:W-205,y:H-138,w:82,h:56,k:'e',lbl:'[E]',col:'#ff00cc'}];

function doVK(p,v){
  clrVK();
  for(const b of DP)if(ir(p,b))VK[b.k]=v;
  for(const b of AB)if(ir(p,b))VK[b.k]=v;
}

// ── World ──────────────────────────────────────────────────────────────
const WALLS=[],BLDGS=[],TOLLS=[];
(function(){
  const rng=mkR(42);
  WALLS.push({x:0,y:0,w:WW,h:8},{x:0,y:WH-8,w:WW,h:8});
  for(let zi=0;zi<ZONES.length;zi++){
    const z=ZONES[zi];let tx=z.x0+40,bx=z.x0+40;
    if(zi===2){// maze walls zone 3
      for(let i=0;i<6;i++){const wx=z.x0+150+i*150,gap=RT+80+rng()*(RB-RT-160);WALLS.push({x:wx,y:RT+8,w:12,h:gap-RT-8,col:z.col},{x:wx,y:gap+90,w:12,h:RB-gap-90,col:z.col});}
    }
    for(let i=0;i<(zi===2?2:5);i++){
      const bw=80+rng()*170,bh=55+rng()*(RT-65);
      if(tx+bw<z.x1-20){const b={x:tx,y:8,w:bw,h:bh,col:z.col,s:rng()*9999|0};BLDGS.push(b);WALLS.push(b);tx+=bw+20+rng()*55;}
      const bw2=80+rng()*170,bh2=55+rng()*(WH-RB-65);
      if(bx+bw2<z.x1-20){const b={x:bx,y:WH-8-bh2,w:bw2,h:bh2,col:z.col,s:rng()*9999|0};BLDGS.push(b);WALLS.push(b);bx+=bw2+20+rng()*55;}
    }
    if(zi===6)for(let i=0;i<3;i++)TOLLS.push({x:z.x0+220+i*270,y:RT+8,w:14,h:RB-RT-16,passed:false});
    if(zi<ZONES.length-1){WALLS.push({x:z.x1-5,y:0,w:10,h:RT-45,col:z.col},{x:z.x1-5,y:RB+45,w:10,h:WH,col:z.col});}
  }
})();
function hit(x,y,r){for(const w of WALLS)if(x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h)return true;return false;}

// ── Lifespan ───────────────────────────────────────────────────────────
const LM={cur:0,max:0,dead:false,
  init(d){this.max=d.life;this.cur=this.max;this.dead=false;},
  eat(s,lbl){if(this.dead)return;this.cur-=s;if(lbl)ntf(lbl);if(this.cur<=0){this.cur=0;this.dead=true;onDead();}},
  add(s,lbl){this.cur=Math.min(this.cur+s,this.max);if(lbl)ntf(lbl);},
  set(s){this.cur=clp(s,0,this.max);this.dead=this.cur<=0;},
  f(){return this.cur/this.max;},
  yr(){return this.cur/YR;},
};

// ── Player ─────────────────────────────────────────────────────────────
const PL={x:450,y:RM,r:16,fx:1,fy:0,bob:0,jt:0,ps:false,ep:false,
  cpx:450,cpy:RM,cpl:0,
  sv(){this.cpx=this.x;this.cpy=this.y;this.cpl=LM.cur;},
  rs(){this.x=this.cpx;this.y=this.cpy;LM.set(this.cpl);},
  reset(){this.x=450;this.y=RM;this.cpx=450;this.cpy=RM;this.cpl=LM.max;this.bob=0;this.jt=0;},
};

// ── Entities ───────────────────────────────────────────────────────────
const CT={
  green:{col:'#00ff64',r:DAY,  lbl:'+1 Day'},
  blue: {col:'#00aaff',r:WK,   lbl:'+1 Week'},
  gold: {col:'#ffd700',r:MO,   lbl:'+1 Month'},
  red:  {col:'#ff3333',r:-MO*3,lbl:'\u26A0 TRAP -3 Months!'},
};
let CRYS=[],ENEMS=[],CPS=[],BANKS=[],SHORTCUTS=[];
const PORTAL={x:8600,y:RM,done:false,parts:[]};
let NOTIFS=[],nCrys=0,SCORE=0;

function ntf(t){NOTIFS.push({t,tm:2.8});}
function onDead(){if(PL.cpl>0){PL.rs();ntf('Respawning at checkpoint...');}else STATE='over';}

// ── Spawn ──────────────────────────────────────────────────────────────
function spawnAll(){
  CRYS=[];
  const cd=[
    [1280,RM-55,'green'],[1400,RM+50,'green'],[1550,RM-40,'blue'],[1700,RM+65,'blue'],
    [1850,RM-30,'green'],[2000,RM+40,'gold'],[2150,RM-60,'blue'],[2200,RM+70,'green'],
    [2550,RM-45,'blue'],[2800,RM+35,'gold'],[3050,RM-55,'blue'],[3300,RM+50,'green'],
    [3700,RM-35,'gold'],[4000,RM+45,'blue'],[4300,RM-55,'gold'],[4550,RM+35,'gold'],
    [4950,RM-30,'green'],[5200,RM+40,'blue'],[5400,RM-45,'green'],[5700,RM+55,'green'],
    [6100,RM-35,'gold'],[6300,RM+45,'red'],[6550,RM-50,'blue'],[6700,RM+40,'red'],[6950,RM-35,'gold'],
    [7300,RM-40,'gold'],[7550,RM+45,'gold'],[7750,RM-55,'gold'],[7950,RM+35,'blue'],
  ];
  for(const[x,y,t]of cd)CRYS.push({x,y,tp:t,ang:0,bp:Math.random()*6.28,got:false});

  ENEMS=[];
  function ae(wp,tp='n'){ENEMS.push({x:wp[0][0],y:wp[0][1],wp,wi:0,st:'p',at:0,wt:0,alt:0,tp});}
  // Zone 3 — normal
  ae([[2450,RM-65],[2450,RM+65],[2650,RM+65],[2650,RM-65]]);
  ae([[2900,RM],[3100,RM-75],[3100,RM+75],[2900,RM]]);
  // Zone 4 — normal x3
  ae([[3700,RM-70],[3700,RM+70],[3950,RM+70],[3950,RM-70]]);
  ae([[4150,RM],[4350,RM-85],[4550,RM-85],[4350,RM]]);
  ae([[4600,RM+55],[4400,RM+55],[4400,RM-55],[4600,RM-55]]);
  // Zone 6 — ghost
  ae([[6100,RM-55],[6100,RM+55],[6350,RM+55],[6350,RM-55]],'g');
  ae([[6500,RM],[6700,RM-80],[6900,RM+80],[6700,RM]],'g');
  ae([[6950,RM+55],[6750,RM+55],[6750,RM-55],[6950,RM-55]],'g');
  // Zone 7 — fast
  ae([[7300,RM-55],[7300,RM+55],[7500,RM+55],[7500,RM-55]],'f');
  ae([[7600,RM],[7800,RM-85],[7950,RM+85],[7800,RM]],'f');
  ae([[8000,RM+60],[7800,RM+60],[7800,RM-60],[8000,RM-60]],'f');

  CPS=ZONES.slice(0,-1).map((z,i)=>({x:z.x1-55,y:RM,lbl:'CP'+(i+1),on:false}));
  BANKS=[{x:5050,y:RM,st:0},{x:5500,y:RM,st:0},{x:5850,y:RM,st:0}];
  SHORTCUTS=[{x:6250,y:RM,dx:6650,dy:RM,cost:MO*3,used:false}];
  PORTAL.done=false;PORTAL.parts=[];
  TOLLS.forEach(g=>g.passed=false);
}

// ── Camera & State ─────────────────────────────────────────────────────
const CAM={x:0,y:0};
function updCam(){CAM.x+=((PL.x-W/2)-CAM.x)*0.1;CAM.y+=((PL.y-H/2)-CAM.y)*0.1;CAM.x=clp(CAM.x,0,WW-W);CAM.y=clp(CAM.y,0,WH-H);}

let STATE='menu',SHAKE=0;
let selDiff=null; // for diff select hover

function startGame(d){df=d;LM.init(df);PL.reset();nCrys=0;SCORE=0;NOTIFS=[];spawnAll();STATE='play';}

function onClick(p){
  if(STATE==='menu'){
    if(ir(p,{x:W/2-220,y:270,w:440,h:58}))STATE='diff';
    if(ir(p,{x:W/2-220,y:342,w:440,h:58}))loadG();
    if(ir(p,{x:W/2-220,y:414,w:440,h:58}))STATE='how';
  } else if(STATE==='diff'){
    const bx=W/2-450;
    if(ir(p,{x:bx,     y:300,w:270,h:180}))startGame(DIFF.easy);
    if(ir(p,{x:bx+295, y:300,w:270,h:180}))startGame(DIFF.medium);
    if(ir(p,{x:bx+590, y:300,w:270,h:180}))startGame(DIFF.hard);
    if(ir(p,{x:W/2-70, y:510,w:140,h:40}))STATE='menu';
  } else if(STATE==='how'||STATE==='over'||STATE==='win')STATE='menu';
  else if(STATE==='pause')STATE='play';
}

// ── Update ─────────────────────────────────────────────────────────────
function update(dt){
  if(STATE!=='play')return;
  SHAKE=Math.max(0,SHAKE-dt*8);

  // Player
  const up=K.ArrowUp||K.KeyW||VK.u,dn=K.ArrowDown||K.KeyS||VK.d;
  const lt=K.ArrowLeft||K.KeyA||VK.l,rt2=K.ArrowRight||K.KeyD||VK.r;
  const run=(K.ShiftLeft||K.ShiftRight||VK.run)&&(up||dn||lt||rt2);
  const sp=K.Space||VK.jump;
  let dx=0,dy=0;
  if(up)dy--;if(dn)dy++;if(lt)dx--;if(rt2)dx++;
  const mv=dx||dy;
  if(mv){
    const ln=Math.hypot(dx,dy)||1;dx/=ln;dy/=ln;
    PL.fx=dx;PL.fy=dy;
    const spd=run?270:150;
    const nx=clp(PL.x+dx*spd*dt,PL.r,WW-PL.r),ny=clp(PL.y+dy*spd*dt,PL.r,WH-PL.r);
    if(!hit(nx,PL.y,PL.r-2))PL.x=nx;
    if(!hit(PL.x,ny,PL.r-2))PL.y=ny;
    LM.eat(run?df.run*dt:df.walk*dt);
  }
  PL.bob=PL.jt>0?Math.sin((0.35-PL.jt)/0.35*Math.PI)*12:mv?Math.sin(Date.now()*0.01)*3:0;
  if(sp&&!PL.ps&&PL.jt<=0){PL.jt=0.35;LM.eat(df.jump,'-Jump');}
  if(PL.jt>0)PL.jt-=dt;
  PL.ps=sp;

  // Interact E
  const eNow=K.KeyE||VK.e;
  if(eNow&&!PL.ep){K.KeyE=false;VK.e=0;doInteract();}
  PL.ep=eNow;
  if(K.Escape){K.Escape=false;STATE='pause';}
  if(K.F5){K.F5=false;saveG();ntf('Saved!');}

  updCam();

  // Crystals
  for(const c of CRYS){if(c.got)continue;c.ang+=dt*2;c.bp+=dt*2.5;if(dst(PL.x,PL.y,c.x,c.y)<26){c.got=true;const ct=CT[c.tp],rw=ct.r*df.cb;LM.add(rw,ct.lbl);if(rw>0){nCrys++;SCORE+=Math.floor(rw/DAY);}}}

  // Enemies
  for(const e of ENEMS){
    e.at=Math.max(0,e.at-dt);e.alt=Math.max(0,e.alt-dt);
    const spm={n:df.ps,g:{p:df.ps.p*1.3,c:df.ps.c*1.45},f:{p:df.ps.p*1.6,c:df.ps.c*1.65}}[e.tp]||df.ps;
    const det={n:df.det,g:df.det*1.3,f:df.det*1.2}[e.tp]||df.det;
    const hc={n:df.hit,g:df.hit*1.5,f:df.hit*0.8}[e.tp]||df.hit;
    const d=dst(e.x,e.y,PL.x,PL.y);
    if(e.st==='p'){
      if(d<det){e.st='c';e.alt=1.2;}
      else{e.wt=Math.max(0,e.wt-dt);if(e.wt<=0){const[tx,ty]=e.wp[e.wi];if(dst(e.x,e.y,tx,ty)<8){e.wi=(e.wi+1)%e.wp.length;e.wt=0.7;}else mv2(e,tx,ty,spm.p,dt);}}
    } else if(e.st==='c'){
      if(d>det*1.7)e.st='p';else if(d<32)e.st='a';else mv2(e,PL.x,PL.y,spm.c,dt);
    } else {
      if(d>52)e.st='c';else if(e.at<=0){e.at=2;LM.eat(hc,'Enemy Hit! -'+(e.tp==='g'?'1.5Yr':'1Yr'));SHAKE=0.28;}
    }
  }

  // Checkpoints
  for(const cp of CPS)if(!cp.on&&dst(PL.x,PL.y,cp.x,cp.y)<32){cp.on=true;PL.sv();ntf('Checkpoint Saved '+cp.lbl);}

  // Tolls
  for(const g of TOLLS)if(!g.passed&&PL.x+PL.r>g.x&&PL.x-PL.r<g.x+g.w&&PL.y>RT&&PL.y<RB){g.passed=true;LM.eat(MO*3,'-3 Months  Toll Gate!');}

  // Portal particles
  if(Math.random()<0.25){const a=Math.random()*6.28,r=20+Math.random()*35;PORTAL.parts.push({x:PORTAL.x+Math.cos(a)*r,y:PORTAL.y+Math.sin(a)*r,vx:Math.cos(a)*rnd(10,40),vy:Math.sin(a)*rnd(10,40)-30,l:rnd(0.5,1.2)});}
  PORTAL.parts=PORTAL.parts.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;return(p.l-=dt)>0;});
  if(!PORTAL.done&&dst(PL.x,PL.y,PORTAL.x,PORTAL.y)<50){PORTAL.done=true;endGame();}

  NOTIFS=NOTIFS.filter(n=>(n.tm-=dt)>0);while(NOTIFS.length>5)NOTIFS.shift();
}

function mv2(e,tx,ty,spd,dt){const d=dst(e.x,e.y,tx,ty)||1;e.x+=(tx-e.x)/d*spd*dt;e.y+=(ty-e.y)/d*spd*dt;}

function doInteract(){
  for(const b of BANKS){if(dst(PL.x,PL.y,b.x,b.y)<70){if(b.st<=0){if(LM.cur>=MO){LM.eat(MO);b.st=MO;ntf('-1 Month  Deposited');}else ntf('Not enough lifespan!');}else{LM.add(b.st,'+1 Month  Withdrawn');b.st=0;}return;}}
  for(const s of SHORTCUTS){if(!s.used&&dst(PL.x,PL.y,s.x,s.y)<60){s.used=true;LM.eat(s.cost,'-3 Months  Shortcut!');PL.x=s.dx;PL.y=s.dy;return;}}
}

function endGame(){const y=LM.yr();const e=y>50?'EXCELLENT ESCAPE':y>20?'GOOD ESCAPE':'BARELY SURVIVED';SCORE+=Math.floor(y*10)+nCrys*5;saveG();STATE='win';window._ending=e;}

// ── Draw helpers ───────────────────────────────────────────────────────
function box(x,y,w,h,col,a=0.88){X.save();X.globalAlpha=a;X.fillStyle='#080818';X.strokeStyle=col;X.lineWidth=2;X.beginPath();X.roundRect(x,y,w,h,8);X.fill();X.stroke();X.restore();}
function T(t,x,y,col,sz,al='left'){X.font='bold '+sz+'px monospace';X.fillStyle=col;X.textAlign=al;X.fillText(t,x,y);X.textAlign='left';}
function circ(x,y,r,f,s,sw=2){X.beginPath();X.arc(x,y,r,0,6.28);if(f){X.fillStyle=f;X.fill();}if(s){X.strokeStyle=s;X.lineWidth=sw;X.stroke();}}
function glw(x,y,r,col){const g=X.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col+'99');g.addColorStop(1,'transparent');X.fillStyle=g;X.beginPath();X.arc(x,y,r,0,6.28);X.fill();}
function btn(x,y,w,h,lbl,col,hov){X.save();X.globalAlpha=hov?1:0.78;X.fillStyle=hov?col+'44':'#0a0a20';X.strokeStyle=col;X.lineWidth=hov?3:2;if(hov){X.shadowBlur=18;X.shadowColor=col;}X.beginPath();X.roundRect(x,y,w,h,10);X.fill();X.stroke();T(lbl,x+w/2,y+h/2+9,hov?'#fff':col,20,'center');X.restore();}

// ── Draw World ─────────────────────────────────────────────────────────
function drawWorld(){
  const t=Date.now();
  X.fillStyle='#06060f';X.fillRect(0,0,W,H);
  // grid
  const gs=40;
  for(let gx=-1;gx<W/gs+2;gx++)for(let gy=-1;gy<H/gs+2;gy++){
    const wx=Math.floor((gx*gs+CAM.x)/gs),wy=Math.floor((gy*gs+CAM.y)/gs);
    X.fillStyle=(wx+wy)%2?'#0f0f24':'#0c0c1e';
    X.fillRect(gx*gs-CAM.x%gs,gy*gs-CAM.y%gs,gs,gs);
  }
  X.strokeStyle='#18183a';X.lineWidth=1;
  for(let i=-1;i<W/gs+2;i++){X.beginPath();X.moveTo(i*gs-CAM.x%gs,0);X.lineTo(i*gs-CAM.x%gs,H);X.stroke();}
  for(let i=-1;i<H/gs+2;i++){X.beginPath();X.moveTo(0,i*gs-CAM.y%gs);X.lineTo(W,i*gs-CAM.y%gs);X.stroke();}
  // zone tints
  for(const z of ZONES){const s0=z.x0-CAM.x,s1=z.x1-CAM.x;if(s1<0||s0>W)continue;X.save();X.globalAlpha=0.06;X.fillStyle=z.col;X.fillRect(s0,0,s1-s0,H);X.restore();T(z.name,Math.max(s0+8,6),RT-CAM.y-8,z.col,14);}
  // road
  const ry0=RT-CAM.y,ry1=RB-CAM.y,rym=(ry0+ry1)/2;
  X.save();X.globalAlpha=0.2;X.fillStyle='#181830';X.fillRect(0,ry0,W,ry1-ry0);X.restore();
  X.strokeStyle='#0088cc';X.lineWidth=2;X.beginPath();X.moveTo(0,ry0);X.lineTo(W,ry0);X.stroke();X.beginPath();X.moveTo(0,ry1);X.lineTo(W,ry1);X.stroke();
  const off=(t/22)%60;X.setLineDash([36,22]);X.lineDashOffset=-off;X.strokeStyle='rgba(255,240,0,.45)';X.lineWidth=2;X.beginPath();X.moveTo(0,rym);X.lineTo(W,rym);X.stroke();X.setLineDash([]);
  // buildings
  for(const b of BLDGS){const sx=b.x-CAM.x,sy=b.y-CAM.y;if(sx+b.w<0||sx>W)continue;X.fillStyle='#12122a';X.strokeStyle=b.col;X.lineWidth=2;X.beginPath();X.roundRect(sx,sy,b.w,b.h,4);X.fill();X.stroke();const rng2=mkR(b.s);for(let wx=sx+8;wx<sx+b.w-8;wx+=16)for(let wy=sy+8;wy<sy+b.h-8;wy+=16)if(rng2()>0.35){const on=Math.abs(Math.sin(t*.001+wx*.3+wy*.2))>.4;X.fillStyle=on?b.col:'#1e1e38';X.fillRect(wx,wy,8,12);}}
  // maze walls
  for(const w of WALLS)if(w.col){const sx=w.x-CAM.x,sy=w.y-CAM.y;if(sx+w.w<0||sx>W)continue;X.fillStyle=w.col+'33';X.fillRect(sx,sy,w.w,w.h);X.strokeStyle=w.col;X.lineWidth=2;X.strokeRect(sx,sy,w.w,w.h);}
  // toll gates
  for(const g of TOLLS){if(g.passed)continue;const sx=g.x-CAM.x,sy=g.y-CAM.y;if(sx<-20||sx>W+20)continue;X.save();X.globalAlpha=.7+.28*Math.abs(Math.sin(t*.005));X.strokeStyle='#ff0088';X.lineWidth=4;X.beginPath();X.moveTo(sx,sy);X.lineTo(sx,sy+g.h);X.stroke();T('TOLL -3Mo',sx+6,sy+g.h/2,'#ff0088',13);X.restore();}
  // shortcut signs
  for(const s of SHORTCUTS){if(s.used)continue;const sx=s.x-CAM.x,sy=s.y-CAM.y;if(sx<-60||sx>W+60)continue;box(sx-55,sy-38,110,28,'#00ffcc',.85);T('[E] Shortcut -3Mo',sx,sy-26,'#00ffcc',12,'center');}
}

// ── Draw Entities ──────────────────────────────────────────────────────
function drawCrys(){
  for(const c of CRYS){if(c.got)continue;const sx=c.x-CAM.x,sy=c.y-CAM.y+Math.sin(c.bp)*5;if(sx<-40||sx>W+40)continue;const ct=CT[c.tp],r=13;glw(sx,sy,r*3,ct.col);X.save();X.translate(sx,sy);X.rotate(c.ang);X.beginPath();X.moveTo(0,-r);X.lineTo(r*.6,0);X.lineTo(0,r);X.lineTo(-r*.6,0);X.closePath();X.fillStyle=ct.col;X.fill();X.strokeStyle='#fff';X.lineWidth=1.5;X.stroke();X.restore();T(c.tp[0].toUpperCase(),sx,sy+5,'#000',12,'center');if(c.tp==='red')T('!',sx,sy-18,'#ff0000',14,'center');}
}

function drawEnems(){
  const t=Date.now();
  for(const e of ENEMS){const sx=e.x-CAM.x,sy=e.y-CAM.y;if(sx<-60||sx>W+60)continue;
    const ch=e.st!=='p';
    const cols={n:ch?'#ff2020':'#7700bb',g:ch?'#ff44ff':'#aa00cc',f:ch?'#ff6600':'#cc3300'};
    const col=cols[e.tp]||'#ff2020';
    if(!ch){X.save();X.globalAlpha=.07;X.fillStyle=col;circ(sx,sy,df.det,col);X.restore();}
    glw(sx,sy,30,col);
    X.save();X.translate(sx,sy);X.rotate(t*.002);
    X.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i;i?X.lineTo(Math.cos(a)*18,Math.sin(a)*18):X.moveTo(Math.cos(a)*18,Math.sin(a)*18);}
    X.closePath();X.fillStyle='#0f0025';X.fill();X.strokeStyle=col;X.lineWidth=2.5;X.stroke();X.restore();
    const ec=ch?'#ff0000':'#cc0066';circ(sx-7,sy-4,4,ec);circ(sx+7,sy-4,4,ec);
    if(ch){circ(sx-7,sy-4,2,'#fff');circ(sx+7,sy-4,2,'#fff');}
    if(e.alt>0)T('!',sx,sy-28,'#ff0000',24,'center');
    else if(ch){const lb={n:'CHASING',g:'HAUNTING',f:'SPRINTING'}[e.tp]||'CHASING';T(lb,sx,sy-30,col,12,'center');}
    if(e.tp==='g'){X.save();X.globalAlpha=.65+.3*Math.sin(t*.008);X.globalCompositeOperation='screen';}
    if(e.tp==='g')X.restore();
  }
}

function drawPlayer(){
  const sx=PL.x-CAM.x,sy=PL.y-CAM.y-PL.bob,f=LM.f();
  const col=f>.75?'#00ffff':f>.5?'#00ff64':f>.25?'#ffee00':f>.1?'#ff8800':'#ff2020';
  glw(sx,sy,PL.r*2.5,col);circ(sx,sy,PL.r,col,'#fff',2);
  const ex=sx+PL.fx*8,ey=sy+PL.fy*8,px=-PL.fy,py=PL.fx;
  for(const s of[-1,1]){circ(ex+px*5*s,ey+py*5*s,3,'#fff');circ(ex+px*5*s+PL.fx,ey+py*5*s+PL.fy,2,'#000');}
  if(K.ShiftLeft||K.ShiftRight||VK.run){const t=Date.now();for(let i=0;i<4;i++){const ox=-PL.fx*(PL.r+5+i*7)+Math.sin(t*.06+i*1.5)*5,oy=-PL.fy*(PL.r+5+i*7)+Math.cos(t*.06+i*1.5)*5;X.save();X.globalAlpha=Math.max(0,(4-i)/4*.8);circ(sx+ox,sy+oy,3,'#ffee00');X.restore();}}
}

function drawCPs(){
  const t=Date.now();
  for(const cp of CPS){const sx=cp.x-CAM.x,sy=cp.y-CAM.y;if(sx<-50||sx>W+50)continue;const col=cp.on?'#00ff64':'#5566aa';X.save();X.globalAlpha=cp.on?.45:.2;X.fillStyle=col;circ(sx,sy,28);X.restore();X.strokeStyle=col;X.lineWidth=cp.on?3:2;circ(sx,sy,28+(cp.on?0:4*Math.abs(Math.sin(t*.003))),null,col);T(cp.on?'✓':'CP',sx,sy+5,col,14,'center');T(cp.lbl,sx,sy+44,col,12,'center');}
}

function drawBanks(){
  for(const b of BANKS){const sx=b.x-CAM.x,sy=b.y-CAM.y;if(sx<-90||sx>W+90)continue;const near=dst(PL.x,PL.y,b.x,b.y)<70,col='#ffee00';box(sx-48,sy-58,96,52,col,.92);T('TIME BANK',sx,sy-44,col,13,'center');T(b.st>0?'Stored: 1 Mo':'Empty',sx,sy-26,b.st>0?'#00ff64':'#777',12,'center');if(near){X.save();X.globalAlpha=.7+.28*Math.abs(Math.sin(Date.now()*.005));T(b.st>0?'[E] Withdraw':'[E] Deposit',sx,sy+28,col,15,'center');X.restore();}}
}

function drawPortal(){
  const t=Date.now(),sx=PORTAL.x-CAM.x,sy=PORTAL.y-CAM.y;
  if(sx<-90||sx>W+90)return;
  for(const p of PORTAL.parts){X.save();X.globalAlpha=p.l;circ(p.x-CAM.x,p.y-CAM.y,3,'#00ffff');X.restore();}
  for(let i=4;i>0;i--){const a=t*(.001+i*.0006)+i;X.save();X.globalAlpha=.12*i;X.strokeStyle='#00ffff';X.lineWidth=3;circ(sx+Math.cos(a)*7,sy+Math.sin(a)*7,42,null,'#00ffff',3);X.restore();}
  glw(sx,sy,55,'#00ffff');circ(sx,sy,22+5*Math.sin(t*.006),'#00eeff','#fff',2);
  X.save();X.globalAlpha=.65+.33*Math.abs(Math.sin(t*.004));T('ESCAPE PORTAL',sx,sy-62,'#00ffff',18,'center');X.restore();
}

// ── HUD ────────────────────────────────────────────────────────────────
function drawHUD(){
  const f=LM.f(),bc=f>.5?'#00ff64':f>.2?'#ffee00':f>.05?'#ff8800':'#ff2020';
  box(10,10,375,100,'#00ccff',.92);
  T('TIME REMAINING',22,30,'#00ccff',15);
  T(fmtL(LM.cur),22,62,bc,28);
  X.fillStyle='#1a1a36';X.fillRect(22,76,342,14);
  X.fillStyle=bc;X.fillRect(22,76,Math.max(0,342*f),14);
  X.strokeStyle=bc;X.lineWidth=1.5;X.strokeRect(22,76,342,14);
  T(Math.floor(f*100)+'%',357,72,bc,13,'right');
  if(f<.1&&Math.floor(Date.now()/400)%2===0)T('⚠ CRITICAL',22,100,'#ff2020',13);

  const z=gz(PL.x);
  box(W-335,10,325,72,'#ff00cc',.9);
  T('OBJECTIVE',W-322,28,'#ff00cc',13);
  T('Reach Escape Portal ►',W-322,50,'#fff',15);
  T(z.name,W-322,68,'#aabbcc',12);

  box(W-335,90,100,28,df.col,.88);
  T(df.label,W-285,109,df.col,13,'center');

  T('Crystals: '+nCrys,12,H-148,'#00ffff',17);
  T('Score: '+SCORE,12,H-128,'#aaccff',14);

  // Notifications
  const al=NOTIFS.filter(n=>n.tm>0);
  for(let i=0;i<Math.min(al.length,4);i++){
    const n=al[al.length-1-i];
    X.save();X.globalAlpha=Math.min(1,n.tm/.4);
    T(n.t,W/2,H-162-i*28,'#00ffff',19,'center');
    X.restore();
  }

  // Minimap
  const MX=W-230,MY=H-248,MW=220,MH=54;
  box(MX,MY,MW,MH,'#00ccff',.9);
  for(const z of ZONES){const bx=MX+2+(z.x0/WW)*(MW-4),bw=(z.x1-z.x0)/WW*(MW-4);X.save();X.globalAlpha=.28;X.fillStyle=z.col;X.fillRect(bx,MY+2,bw,MH-4);X.restore();}
  circ(MX+2+(PL.x/WW)*(MW-4),MY+MH/2,5,'#fff','#00ff64',1.5);
  T('MAP',MX+4,MY+13,'#00ccff',11);

  // Zone progress
  const zi=ZONES.findIndex(z=>PL.x>=z.x0&&PL.x<z.x1);
  if(zi>=0){
    box(W/2-205,H-42,410,30,'#223344',.75);
    for(let i=0;i<ZONES.length;i++){const bx=W/2-201+i*(402/ZONES.length),bw=402/ZONES.length-2;X.fillStyle=i<zi?'#00ff6466':i===zi?ZONES[i].col+'cc':'#1a1a36';X.fillRect(bx,H-38,bw,22);}
    T('Zone '+(zi+1)+' of '+ZONES.length,W/2,H-22,'#aabbcc',12,'center');
  }
}

// ── Controls ───────────────────────────────────────────────────────────
function drawCtrl(){
  const arrowLabels=['\u25B2','\u25BC','\u25C4','\u25BA'];
  DP.forEach((b,i)=>{
    const act=VK[b.k];
    X.save();X.globalAlpha=act?.92:.55;
    X.fillStyle=act?'#003333':'#001020';X.strokeStyle=act?'#00ffcc':'#0088aa';X.lineWidth=2;
    X.beginPath();X.roundRect(b.x,b.y,b.w,b.h,8);X.fill();X.stroke();
    T(arrowLabels[i],b.x+b.w/2,b.y+b.h/2+9,act?'#fff':'#00bbdd',24,'center');
    X.restore();
  });
  AB.forEach(b=>{
    const act=VK[b.k];
    X.save();X.globalAlpha=act?.92:.55;
    X.fillStyle=act?'#1a1000':'#0a0010';X.strokeStyle=b.col;X.lineWidth=2;
    X.beginPath();X.roundRect(b.x,b.y,b.w,b.h,8);X.fill();X.stroke();
    T(b.lbl,b.x+b.w/2,b.y+b.h/2+7,act?'#fff':b.col,16,'center');
    X.restore();
  });
}

// ── Screens ────────────────────────────────────────────────────────────
function drawMenu(){
  const t=Date.now();
  X.fillStyle='#04040e';X.fillRect(0,0,W,H);
  for(let i=0;i<H;i+=5){X.save();X.globalAlpha=.03+.02*Math.sin(t*.002+i*.06);X.fillStyle='#00ccff';X.fillRect(0,i,W,2);X.restore();}
  X.save();X.shadowBlur=40;X.shadowColor='#ff00cc';
  T('TIME DEBT SIMULATOR',W/2,112,'#ff00cc',62,'center');
  X.restore();
  T('Life is Currency  \u00B7  Every Action Costs',W/2,160,'#00ccff',21,'center');
  const MBTNS=[{x:W/2-220,y:270,w:440,h:58,l:'\u25BA  PLAY GAME',col:'#00ff64'},{x:W/2-220,y:342,w:440,h:58,l:'\u2B06  LOAD GAME',col:'#ffee00'},{x:W/2-220,y:414,w:440,h:58,l:'?  HOW TO PLAY',col:'#00aaff'}];
  for(const b of MBTNS){const hov=MX>=b.x&&MX<=b.x+b.w&&MY>=b.y&&MY<=b.y+b.h;btn(b.x,b.y,b.w,b.h,b.l,b.col,hov);}
  ['8 Zones  \u00B7  3 Difficulty Levels  \u00B7  Trap Crystals  \u00B7  Toll Gates','Collect crystals  \u00B7  Avoid Time Collectors  \u00B7  Reach Portal','WASD or Arrow Keys or on-screen D-Pad to move'].forEach((l,i)=>T(l,W/2,510+i*28,'#556677',15,'center'));
  if(hasSave())T('Save file found \u2014 click LOAD GAME',W/2,H-18,'#ffee00',14,'center');
}

function drawDiff(){
  const t=Date.now();
  X.fillStyle='#04040e';X.fillRect(0,0,W,H);
  X.save();X.shadowBlur=30;X.shadowColor='#00ccff';
  T('SELECT DIFFICULTY',W/2,92,'#00ccff',50,'center');
  X.restore();
  T('Choose your challenge — you can always restart',W/2,148,'#778899',19,'center');
  const bx=W/2-450;
  const cards=[{d:DIFF.easy,x:bx,icon:'\uD83C\uDF31'},{d:DIFF.medium,x:bx+300,icon:'\u26A1'},{d:DIFF.hard,x:bx+600,icon:'\uD83D\uDC80'}];
  for(const{d,x,icon}of cards){
    const hov=MX>=x&&MX<=x+270&&MY>=300&&MY<=480;
    X.save();X.globalAlpha=hov?1:.78;
    X.fillStyle=hov?d.col+'33':'#0a0a1e';X.strokeStyle=d.col;X.lineWidth=hov?4:2;
    if(hov){X.shadowBlur=28;X.shadowColor=d.col;}
    X.beginPath();X.roundRect(x,300,270,180,14);X.fill();X.stroke();
    T(icon,x+135,358,d.col,38,'center');
    T(d.label,x+135,400,hov?'#fff':d.col,30,'center');
    X.restore();
    T(d.tip,x+135,428,'#aabbcc',13,'center');
    T(d.desc,x+135,450,'#778899',11,'center');
  }
  const bkh=MX>=W/2-75&&MX<=W/2+75&&MY>=510&&MY<=552;
  btn(W/2-75,510,150,42,'\u2190 Back','#446688',bkh);
}

function drawHow(){
  X.fillStyle='#04040e';X.fillRect(0,0,W,H);
  X.save();X.shadowBlur=25;X.shadowColor='#00ccff';
  T('HOW TO PLAY',W/2,70,'#00ccff',46,'center');X.restore();
  const rows=[['Move','WASD / Arrow Keys / D-Pad'],['Run','Hold Shift or RUN button (costs more)'],['Jump','Space or JUMP button (-10 min)'],['Interact','E key or [E] button (bank / shortcut)'],['Save','F5'],['Pause','ESC'],['Green Crystal','+1 Day of lifespan'],['Blue Crystal','+1 Week of lifespan'],['Gold Crystal','+1 Month of lifespan'],['RED Crystal','\u26A0 TRAP: loses 3 Months!'],['Time Bank','[E] to deposit or withdraw 1 Month'],['Shortcut','[E] teleport forward (costs 3 months)'],['Toll Gate','Auto-drains 3 Months when you pass'],['Checkpoint','Walk over to save your progress']];
  rows.forEach(([k,v],i)=>{T(k,W/2-170,130+i*36,i===9?'#ff4444':'#00ff64',17,'right');T('\u2192',W/2-155,130+i*36,'#445566',17);T(v,W/2-145,130+i*36,i===9?'#ff9999':'#ccddee',17);});
  T('Goal: Reach ZONE 8 and touch the ESCAPE PORTAL!',W/2,H-60,'#ff00cc',19,'center');
  T('Click anywhere to go back',W/2,H-28,'#445566',15,'center');
}

function drawPause(){
  X.save();X.globalAlpha=.75;X.fillStyle='#000';X.fillRect(0,0,W,H);X.restore();
  X.save();X.shadowBlur=30;X.shadowColor='#ff00cc';T('PAUSED',W/2,250,'#ff00cc',70,'center');X.restore();
  [['Click or ESC  \u2014  Resume','#fff',26],['F5  \u2014  Save Game','#00ff64',20],['Enemies wait for you here!','#556677',16]].forEach(([txt,col,sz],i)=>T(txt,W/2,330+i*52,col,sz,'center'));
}

function drawOver(){
  X.save();X.globalAlpha=.88;X.fillStyle='#000';X.fillRect(0,0,W,H);X.restore();
  X.save();X.shadowBlur=50;X.shadowColor='#ff0000';T('TIME EXPIRED',W/2,230,'#ff2020',72,'center');X.restore();
  T('GAME OVER',W/2,320,'#fff',46,'center');
  [['Crystals: '+nCrys,'#aabbcc'],['Score: '+SCORE,'#00ccff'],['Click anywhere to return','#445566']].forEach(([t2,c],i)=>T(t2,W/2,398+i*50,c,22,'center'));
}

function drawWin(){
  const t=Date.now();
  X.fillStyle='#030310';X.fillRect(0,0,W,H);
  for(let i=0;i<W;i+=10){X.save();X.globalAlpha=.04+.04*Math.sin(t*.002+i*.05);X.fillStyle='#00ffff';X.fillRect(i,0,2,H);X.restore();}
  const e=window._ending||'GOOD ESCAPE';
  const ecol={'EXCELLENT ESCAPE':'#00ffff','GOOD ESCAPE':'#00ff64','BARELY SURVIVED':'#ffee00'}[e]||'#fff';
  const esub={'EXCELLENT ESCAPE':'Escaped with over 50 years to spare!','GOOD ESCAPE':'Escaped with 20-50 years remaining.','BARELY SURVIVED':'Less than 20 years left. Very close!'}[e]||'';
  X.save();X.shadowBlur=40;X.shadowColor=ecol;T(e,W/2,172,ecol,56,'center');X.restore();
  T(esub,W/2,248,'#fff',21,'center');
  [['Difficulty: '+df.label,df.col],['Years Remaining: '+LM.yr().toFixed(1),'#aabbcc'],['Crystals Collected: '+nCrys,'#00ccff'],['Final Score: '+SCORE,'#ffee00']].forEach(([t2,c],i)=>T(t2,W/2,302+i*46,c,22,'center'));
  T('Click anywhere to return to menu',W/2,H-30,'#445566',16,'center');
}

// ── Save / Load ────────────────────────────────────────────────────────
function saveG(){try{localStorage.setItem('tds3',JSON.stringify({life:LM.cur,crys:nCrys,score:SCORE,px:PL.x,py:PL.y,cpx:PL.cpx,cpy:PL.cpy,cpl:PL.cpl,dk:Object.keys(DIFF).find(k=>DIFF[k]===df)||'medium'}));}catch(e){}}
function loadG(){try{const d=JSON.parse(localStorage.getItem('tds3'));if(!d)return;df=DIFF[d.dk||'medium']||DIFF.medium;LM.init(df);LM.set(d.life);nCrys=d.crys||0;SCORE=d.score||0;spawnAll();PL.x=d.px||450;PL.y=d.py||RM;PL.cpx=d.cpx||450;PL.cpy=d.cpy||RM;PL.cpl=d.cpl||LM.max;NOTIFS=[];STATE='play';}catch(e){ntf('No save found');}}
function hasSave(){return!!localStorage.getItem('tds3');}
addEventListener('keydown',e=>{if(e.code==='F5'&&STATE==='play'){e.preventDefault();saveG();ntf('Game Saved!');}});

// ── Main Loop ──────────────────────────────────────────────────────────
let last=0;
function loop(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  let sx=0,sy=0;
  if(SHAKE>0){sx=(Math.random()-.5)*SHAKE*14;sy=(Math.random()-.5)*SHAKE*14;}
  X.save();X.translate(sx,sy);
  X.clearRect(-20,-20,W+40,H+40);
  update(dt);
  if     (STATE==='menu') drawMenu();
  else if(STATE==='diff') drawDiff();
  else if(STATE==='how')  drawHow();
  else if(STATE==='play'||STATE==='pause'){
    drawWorld();drawCrys();drawEnems();drawCPs();drawBanks();drawPortal();drawPlayer();drawHUD();drawCtrl();
    if(STATE==='pause')drawPause();
  }
  else if(STATE==='over'){drawWorld();drawPlayer();drawHUD();drawOver();}
  else if(STATE==='win') drawWin();
  X.restore();
  requestAnimationFrame(loop);
}
requestAnimationFrame(t=>{last=t;requestAnimationFrame(loop);});
