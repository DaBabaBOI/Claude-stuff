// Clarion AI wireframes: adds/updates the 5th screen "05 · Rewards & Gamification"
// plus its own detailed spec panel, matching the style of the other four screens.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page.
// Safe to re-run: it removes any earlier version of this screen and its spec panel first.
// Independent of fix-annotations.js. Safe to run before or after it, in any order.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const K={r:0,g:0,b:0}, W={r:1,g:1,b:1}, G1={r:0.94,g:0.94,b:0.94}, G2={r:0.82,g:0.82,b:0.82}, G3={r:0.45,g:0.45,b:0.45};
const S=c=>[{type:'SOLID',color:c}];
const page=figma.currentPage;

// --- helpers (plain Plugin API, no sandbox-only shortcuts) ---
function frame(dir,opts={}){
  const f=figma.createFrame();
  f.name=opts.name||'Frame'; f.layoutMode=dir; f.itemSpacing=opts.gap??8;
  f.paddingTop=opts.pt??opts.py??opts.pad??0; f.paddingBottom=opts.pb??opts.py??opts.pad??0;
  f.paddingLeft=opts.pl??opts.px??opts.pad??0; f.paddingRight=opts.pr??opts.px??opts.pad??0;
  f.fills=opts.fill?S(opts.fill):[]; f.strokes=opts.stroke?S(opts.stroke):[];
  f.strokeWeight=opts.sw??1.5; f.cornerRadius=opts.r??0;
  if(opts.dash) f.dashPattern=opts.dash;
  f.counterAxisAlignItems=opts.align||'MIN'; f.primaryAxisAlignItems=opts.justify||'MIN';
  if(opts.clip!=null) f.clipsContent=opts.clip;
  return f;
}
function child(parent,f,opts={}){
  parent.appendChild(f);
  if(opts.w!=null||opts.h!=null){ f.resize(opts.w??f.width,opts.h??f.height); f.primaryAxisSizingMode='FIXED'; f.counterAxisSizingMode='FIXED'; }
  else { f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='AUTO'; }
  if(opts.fw) f.layoutSizingHorizontal='FILL';
  if(opts.fh) f.layoutSizingVertical='FILL';
  return f;
}
function al(parent,dir,opts={}){ const f=frame(dir,opts); return child(parent,f,opts); }
function text(parent,chars,style,size,color,opts={}){
  const t=figma.createText(); t.fontName={family:'Inter',style}; t.characters=chars; t.fontSize=size; t.fills=S(color);
  parent.appendChild(t);
  if(opts.w){ t.textAutoResize='HEIGHT'; t.resize(opts.w,t.height); }
  if(opts.fw){ t.textAutoResize='HEIGHT'; t.resize(200,t.height); t.layoutSizingHorizontal='FILL'; }
  return t;
}
function rectBox(parent,opts={}){
  const r=figma.createRectangle(); r.name=opts.name||'Box'; r.resize(opts.w??24,opts.h??24);
  r.fills=opts.fill===null?[]:S(opts.fill??W); r.strokes=opts.stroke===null?[]:S(opts.stroke??K);
  r.strokeWeight=opts.sw??1.5; r.cornerRadius=opts.r??0; if(opts.dash) r.dashPattern=opts.dash;
  parent.appendChild(r); if(opts.fw) r.layoutSizingHorizontal='FILL'; if(opts.fh) r.layoutSizingVertical='FILL';
  return r;
}
function circleEl(parent,d,opts={}){
  const e=figma.createEllipse(); e.name=opts.name||'Circle'; e.resize(d,d);
  e.fills=S(opts.fill??G2); e.strokes=S(opts.stroke??K); e.strokeWeight=opts.sw??1.5;
  parent.appendChild(e); return e;
}
function btn(parent,label,opts={}){
  const b=al(parent,'HORIZONTAL',{name:'Button/'+label,px:opts.px??16,py:opts.py??10,gap:8,align:'CENTER',justify:'CENTER',fill:opts.primary?K:(opts.disabled?G1:W),stroke:K,r:opts.r??8,fw:opts.fw,w:opts.w,h:opts.h});
  text(b,label,'Semi Bold',opts.s??14,opts.primary?W:(opts.disabled?G3:K));
  return b;
}
function chip(parent,label,opts={}){
  const c=al(parent,'HORIZONTAL',{name:'Chip/'+label,px:10,py:4,align:'CENTER',fill:opts.dark?K:G1,stroke:K,r:99,dash:opts.dash});
  text(c,label,'Semi Bold',12,opts.dark?W:K);
  return c;
}
function divider(parent){ return rectBox(parent,{name:'Divider',h:1.5,fw:true,fill:K,stroke:null,r:0}); }
function toggle(parent,on){
  const t=al(parent,'HORIZONTAL',{name:'Toggle',w:44,h:24,r:99,fill:on?K:G1,stroke:K,align:'CENTER',justify:on?'MAX':'MIN',px:2});
  circleEl(t,20,{fill:W}); return t;
}
// 8-bit style pixel icon: 4x4 grid of small solid squares, pattern varies per badge
function pixelIcon(parent,pattern){
  const grid=al(parent,'VERTICAL',{name:'Pixel icon',gap:2});
  for(let r=0;r<4;r++){
    const row=al(grid,'HORIZONTAL',{gap:2});
    for(let c=0;c<4;c++){ rectBox(row,{w:8,h:8,r:0,fill:pattern[r][c]?K:W,stroke:pattern[r][c]?null:G2,sw:1}); }
  }
  return grid;
}

// --- remove any earlier version of this screen, its labels and its spec panel ---
for(const n of page.children.filter(c=>['05 · Rewards & Gamification','Spec · 05 · Rewards & Gamification','Label 05 · Rewards & Gamification','Sub 05 · Rewards & Gamification'].includes(c.name))) n.remove();

// --- position: 5th column, same row as the other 4 screens ---
const X=100+4*1640, Y=220, W_=1440, H_=1024;
const label=text(page,'05 · Rewards & Gamification','Semi Bold',28,K); label.name='Label 05 · Rewards & Gamification'; label.x=X; label.y=Y-60;
const sub=text(page,'Clarion AI · Desktop 1440x1024 · Low-fidelity wireframe','Regular',14,G3); sub.name='Sub 05 · Rewards & Gamification'; sub.x=X; sub.y=Y-24;

const root=frame('VERTICAL',{name:'05 · Rewards & Gamification',gap:0,fill:W,stroke:K,sw:2,clip:true});
page.appendChild(root); root.resize(W_,H_); root.x=X; root.y=Y;
root.primaryAxisSizingMode='FIXED'; root.counterAxisSizingMode='FIXED';

// Top bar (matches the shell used on Dashboard / AI Helper / Discussions)
const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:W});
const logo=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
const mark=al(logo,'HORIZONTAL',{name:'Logo mark',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',18,W);
text(logo,'Clarion AI','Bold',20,K);
const search=al(top,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:460,h:40,stroke:K,r:99,fill:W});
rectBox(search,{w:18,h:18,r:4,fill:G1}); text(search,'Search tasks, classes, discussions...','Regular',14,G3);
al(top,'HORIZONTAL',{name:'Spacer',fw:true});
chip(top,'EN'); chip(top,'Aa');
rectBox(top,{w:32,h:32,r:8,fill:G1});
const pts=al(top,'HORIZONTAL',{name:'Points',px:12,py:6,gap:6,align:'CENTER',stroke:K,r:4,fill:G1}); text(pts,'240 pts','Bold',13,K); text(pts,'verified','Regular',11,G3);
circleEl(top,36);
divider(root);

// Body: sidebar + content
const body=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});
const side=al(body,'VERTICAL',{name:'Sidebar',w:240,fh:true,fill:G1,px:16,py:16,gap:4});
const navItems=['Dashboard','My classes','Calendar','Discussions','AI Helper','Rewards'];
for(const n of navItems){ const a=n==='Rewards'; const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:8,fill:a?K:null});
  rectBox(it,{w:18,h:18,stroke:a?W:K,r:4,fill:null}); text(it,n,'Regular',15,a?W:K); }
al(side,'VERTICAL',{name:'Spacer',fh:true});
const join=al(side,'VERTICAL',{name:'Join class card',px:12,py:12,gap:8,fw:true,stroke:K,r:8,fill:W});
text(join,'Join a class','Semi Bold',13,K);
rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});

const content=al(body,'VERTICAL',{name:'Content',px:32,py:32,gap:24,fw:true,fh:true});

// Header
const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Rewards','Bold',28,K); text(hl,'Points are added only after your teacher checks your work.','Regular',14,G3);
btn(hdr,'Redeem history');

// Stat row
const stats=al(content,'HORIZONTAL',{name:'Stat row',gap:16,fw:true});
const s1=al(stats,'VERTICAL',{name:'Stat/Verified',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W}); text(s1,'Verified points','Regular',13,G3); text(s1,'240 pts','Bold',28,K); text(s1,'since 1 Sep','Regular',12,G3);
const s2=al(stats,'VERTICAL',{name:'Stat/Pending',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W,dash:[4,3]}); text(s2,'Pending verification','Regular',13,G3); text(s2,'12 pts','Bold',28,K); text(s2,'1 task awaiting teacher check','Regular',12,G3);
const s3=al(stats,'VERTICAL',{name:'Stat/Streak',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W}); text(s3,'Current streak','Regular',13,G3); text(s3,'6 days','Bold',28,K); text(s3,'streak breaks turn warm-coloured in hi-fi','Regular',12,G3);

// Two column area
const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
const left=al(main,'VERTICAL',{name:'Left column',gap:20,fw:true,fh:true});

// Badges
const badgeCard=al(left,'VERTICAL',{name:'Badges card',px:20,py:16,gap:14,fw:true,stroke:K,r:12,fill:W});
text(badgeCard,'Badges','Semi Bold',18,K);
const grid=al(badgeCard,'HORIZONTAL',{name:'Badge grid',gap:12,fw:true});
const badgeData=[
 ['Perfect week',true,'Earned 8 Sep',[[0,1,1,0],[1,1,1,1],[1,0,0,1],[0,1,1,0]]],
 ['Early bird',true,'Earned 3 Sep',[[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1]]],
 ['Class helper',false,'Locked',[[0,0,1,0],[0,1,1,0],[1,1,1,1],[0,0,1,0]]],
 ['30-day streak',false,'Locked',[[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]]],
];
for(const [name,unlocked,sub2,pattern] of badgeData){
  const tile=al(grid,'VERTICAL',{name:'Badge/'+name,px:14,py:14,gap:8,align:'CENTER',justify:'CENTER',r:2,fw:true,fill:unlocked?W:G1,stroke:K,dash:unlocked?null:[4,3]});
  pixelIcon(tile,pattern);
  text(tile,name,'Semi Bold',13,K,{align:'CENTER'});
  text(tile,sub2,'Regular',11,unlocked?G3:G3);
}
text(badgeCard,'Sharp 2px corners on badge tiles only, everywhere else uses 8 to 16px, the pixelated sharp-corner treatment the design spec calls for on gamification elements.','Regular',12,G3,{fw:true});

// Redeem list: in-app, game-style rewards only, nothing that needs school or teacher approval
const redeem=al(left,'VERTICAL',{name:'Redeem card',px:20,py:16,gap:0,fw:true,stroke:K,r:12,fill:W,clip:true});
text(redeem,'Redeem your points','Semi Bold',18,K);
text(redeem,'Spend verified points on in-app extras, nothing a teacher needs to arrange.','Regular',12,G3,{fw:true});
const redeemRows=[['Streak freeze (skip a day)',60,true],['Unlock "Ocean" theme colours',30,true],['Gold avatar frame',40,true],['"Founder" profile badge',300,false]];
for(const [name,cost,afford] of redeemRows){
  const r=al(redeem,'HORIZONTAL',{name:'Redeem row',py:12,gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
  const rl=al(r,'VERTICAL',{gap:2}); text(rl,name,'Semi Bold',14,K); text(rl,cost+' pts','Regular',12,G3);
  btn(r,afford?'Redeem':'Need '+(cost-240)+' more',{primary:afford,disabled:!afford,py:8,s:13});
  divider(redeem);
}

// Recent activity
const activity=al(left,'VERTICAL',{name:'Activity card',px:20,py:16,gap:0,fw:true,stroke:K,r:12,fill:W,clip:true});
text(activity,'Recent activity','Semi Bold',18,K);
const actRows=[['Map quiz verified by Mr Rao','+20 pts',false],['Reading log verified by Ms Kaushal','+15 pts',false],['Lab report submitted, awaiting verification','+30 pts pending',true]];
for(const [what,pt,pending] of actRows){
  const r=al(activity,'HORIZONTAL',{name:'Activity row',py:12,gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
  text(r,what,'Regular',14,K,{fw:true});
  chip(r,pt,{dark:!pending,dash:pending?[4,3]:null});
  divider(activity);
}

// Right column: class leaderboard, school leaderboard, info
const right=al(main,'VERTICAL',{name:'Right column',w:380,gap:20,fh:true});

const lead=al(right,'VERTICAL',{name:'Class leaderboard card',px:20,py:16,gap:12,fw:true,stroke:K,r:12,fill:W});
const lh=al(lead,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(lh,'Class leaderboard','Semi Bold',16,K); toggle(lh,true);
text(lead,'Biology 9B, this week, verified points only','Regular',12,G3);
const leaders=[['1','Ananya R.',310,false],['2','Prithu S. (you)',240,true],['3','Vir M.',225,false],['4','Aarav K.',190,false]];
for(const [rank,name,score,me] of leaders){
  const r=al(lead,'HORIZONTAL',{name:'Leader row',gap:10,fw:true,align:'CENTER',px:me?8:0,py:me?6:0,r:8,stroke:me?K:null});
  const rb=al(r,'HORIZONTAL',{w:28,h:28,r:99,fill:K,align:'CENTER',justify:'CENTER'}); text(rb,rank,'Bold',12,W);
  circleEl(r,28); text(r,name,me?'Semi Bold':'Regular',14,K,{fw:true}); text(r,String(score),'Bold',14,K);
}

const school=al(right,'VERTICAL',{name:'School leaderboard card',px:20,py:16,gap:12,fw:true,stroke:K,r:12,fill:W});
const sh=al(school,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(sh,'School leaderboard','Semi Bold',16,K); toggle(sh,false);
text(school,'Year 9, this term, anonymised unless you opt in','Regular',12,G3);
const schoolTop=[['1','Vihaan T. · Biology 9A',412],['2','Myra S. · English 9C',398],['3','Ananya R. · Biology 9B',310]];
for(const [rank,name,score] of schoolTop){
  const r=al(school,'HORIZONTAL',{name:'School row',gap:10,fw:true,align:'CENTER'});
  const rb=al(r,'HORIZONTAL',{w:28,h:28,r:99,fill:K,align:'CENTER',justify:'CENTER'}); text(rb,rank,'Bold',12,W);
  circleEl(r,28); text(r,name,'Regular',14,K,{fw:true}); text(r,String(score),'Bold',14,K);
}
divider(school);
const yr=al(school,'HORIZONTAL',{name:'Your rank row',gap:10,fw:true,align:'CENTER',px:8,py:8,r:8,stroke:K,fill:G1});
const yb=al(yr,'HORIZONTAL',{w:28,h:28,r:99,fill:W,stroke:K,align:'CENTER',justify:'CENTER'}); text(yb,'47','Bold',11,K);
text(yr,'You (Prithu S.), Biology 9B','Semi Bold',13,K,{fw:true}); text(yr,'240 pts','Bold',13,K);
text(school,'Only verified points count toward either leaderboard.','Regular',11,G3,{fw:true});

const info=al(right,'VERTICAL',{name:'Why verified card',px:20,py:16,gap:8,fw:true,stroke:K,r:12,fill:G1});
text(info,'Why teacher-verified?','Semi Bold',15,K);
text(info,'Points can only be earned by finishing real classwork, confirmed by a teacher. This keeps rewards and the leaderboard fair for everyone.','Regular',13,K,{fw:true});

// ---- detailed spec panel for this screen, 6th column ----
function specPanel(title,rows,x,y,w){
  const f=frame('VERTICAL',{name:'Spec · '+title,gap:14,pad:24,fill:W,stroke:K,r:12,dash:[6,4]});
  page.appendChild(f); f.resize(w,100); f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='FIXED';
  f.x=x; f.y=y;
  text(f,title,'Bold',18,K);
  rows.forEach((body,j)=>{
    const r=frame('HORIZONTAL',{name:'Row '+(j+1),gap:12}); r.counterAxisAlignItems='MIN';
    f.appendChild(r); r.layoutSizingHorizontal='FILL'; r.layoutSizingVertical='HUG';
    const n=frame('HORIZONTAL',{name:'Number',fill:K,r:99}); n.primaryAxisAlignItems='CENTER'; n.counterAxisAlignItems='CENTER';
    r.appendChild(n); n.resize(26,26); n.primaryAxisSizingMode='FIXED'; n.counterAxisSizingMode='FIXED';
    text(n,String(j+1),'Bold',12,W);
    text(r,body,'Regular',14,K,{fw:true});
  });
  return f;
}
specPanel('05 · Rewards & Gamification',[
 'Frame: 1440 x 1024px, same top bar and sidebar shell as the Dashboard, with Rewards set as the active nav item.',
 'Stat row: 3 equal cards, 16px padding, corner radius 12px, 1.5px black stroke. The Pending card uses a dashed 4,3 stroke instead of solid, to mark it as not yet confirmed.',
 'Badge tiles: 4 across, roughly 300 x 150px each, corner radius 2px. Deliberately sharp, unlike the 8 to 16px used elsewhere, matching the design brief note that gamification elements get sharp corners.',
 'Badge pixel icon: 40 x 40px square, a 4 x 4 grid of 8 x 8px blocks with 2px gaps, black or grey-outlined.',
 'Locked badge: #F0F0F0 fill, dashed 4,3 black stroke. Unlocked badge: white fill, solid 1.5px black stroke.',
 'Redeem row: rewards are in-app and game-style only, for example a streak freeze, a theme colour unlock, an avatar frame or a profile badge, never a real-world prize a teacher or school would need to arrange. 12px vertical row padding, 1.5px divider, Redeem button at 8px radius, black fill when affordable, #F0F0F0 fill and grey text with a "need X more" label when not.',
 'Activity row: same pattern as the Dashboard task list. Verified points use a solid black 99px pill, pending points use a dashed 4,3 pill.',
 'Class leaderboard card: corner radius 12px, 1.5px black stroke, scoped to the student\'s own class. Rank badge is a 28px circle at 99px radius. The current student\'s row gets an added 1.5px black outline and 8px padding.',
 'Visibility toggle: 44 x 24px pill track at 99px radius, 20px white knob. Filled black with the knob on the right when visible to classmates, filled #F0F0F0 with the knob on the left when off.',
 'School leaderboard card: same 12px radius and 1.5px stroke, scoped to the whole year group and anonymised by default, shown with the toggle off. Lists the top 3 students school-wide, then a highlighted "Your rank" row so a student outside the top 3 still sees where they stand.',
 'Why teacher-verified info card: #F0F0F0 fill, corner radius 12px, one short paragraph tying points and both leaderboards back to teacher verification.',
], 100+5*1640, 220+1024+40, 1440);

return {ok:true, rootId:root.id};
