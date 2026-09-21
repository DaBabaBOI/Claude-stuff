// Clarion AI wireframes: ONE script that builds/refreshes EVERYTHING, including numbered pin
// markers placed directly on the real screens (not Figma's AI annotation feature, which isn't
// rendering reliably). Each pin number matches the same row number in that screen's own spec
// panel directly beneath it, so canvas and text always agree.
//
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page.
// Safe to re-run any number of times: it deletes its own previous output first (every screen,
// every pin, every spec panel), then rebuilds everything fresh. It never touches anything named
// "Annotation N" (a separate feature, Figma's own AI annotation tool) and leaves those
// exactly as they are.
// This single file is the only script you need to run.
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
  if(opts.align) t.textAlignHorizontal=opts.align;
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
  const c=al(parent,'HORIZONTAL',{name:'Chip/'+label,px:10,py:4,align:'CENTER',fill:opts.dark?K:(opts.plain?W:G1),stroke:K,r:99,dash:opts.dash});
  text(c,label,'Semi Bold',12,opts.dark?W:K);
  return c;
}
function divider(parent){ return rectBox(parent,{name:'Divider',h:1.5,fw:true,fill:K,stroke:null,r:0}); }
function toggle(parent,on){
  const t=al(parent,'HORIZONTAL',{name:'Toggle',w:44,h:24,r:99,fill:on?K:G1,stroke:K,align:'CENTER',justify:on?'MAX':'MIN',px:2});
  circleEl(t,20,{fill:W}); return t;
}
function input(parent,placeholder,opts={}){
  const b=al(parent,'HORIZONTAL',{name:'Input',px:12,py:opts.py??10,align:'CENTER',fill:W,stroke:K,r:8,fw:opts.fw,w:opts.w,h:opts.h});
  text(b,placeholder,'Regular',opts.s??14,G3);
  return b;
}
function imgph(parent,opts={}){
  const f=al(parent,'HORIZONTAL',{name:opts.name||'Image',w:opts.w??120,h:opts.h??80,fill:G1,stroke:K,r:opts.r??4,align:'CENTER',justify:'CENTER',fw:opts.fw,fh:opts.fh});
  text(f,opts.label||'IMG','Semi Bold',12,G3);
  return f;
}
function checkbox(parent,checked){
  const c=al(parent,'HORIZONTAL',{name:'Checkbox',w:20,h:20,stroke:K,r:4,fill:checked?K:W,align:'CENTER',justify:'CENTER'});
  if(checked) text(c,'✓','Bold',13,W);
  return c;
}
function icon(parent,d,name){
  d=d||20; name=name||'Icon';
  const f=al(parent,'HORIZONTAL',{name,w:d,h:d,stroke:K,r:4,fill:G1,align:'CENTER',justify:'CENTER'});
  text(f,'○','Regular',Math.round(d*0.5),G3);
  return f;
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
// A numbered pin badge, attached as a child of `node` so it travels with it. `node` must be an
// auto-layout frame (created via al/frame) since it needs ABSOLUTE positioning inside a layout
// parent. Matches the same number as the row it documents in that screen's spec panel below.
// Default position hangs the badge just outside the target's top-left corner (dx/dy default to
// -10,-10) so it never sits on top of the target's own label text; a few calls override dx/dy to
// aim at a specific spot instead. Since that default position pokes outside `node`'s own bounds,
// every ancestor up to the page has clipsContent turned off so the overhang always renders instead
// of being cropped.
function pin(node,number,dx,dy){
  if(!node||typeof node.appendChild!=='function') return null;
  const badge=figma.createFrame();
  badge.name='Pin '+number;
  badge.layoutMode='HORIZONTAL'; badge.primaryAxisAlignItems='CENTER'; badge.counterAxisAlignItems='CENTER';
  badge.fills=S(K); badge.strokes=S(W); badge.strokeWeight=2; badge.cornerRadius=99;
  node.appendChild(badge);
  badge.resize(24,24); badge.primaryAxisSizingMode='FIXED'; badge.counterAxisSizingMode='FIXED';
  badge.layoutPositioning='ABSOLUTE';
  badge.x=dx??-10; badge.y=dy??-10;
  text(badge,String(number),'Bold',12,W);
  let ancestor=node;
  while(ancestor && ancestor.type!=='PAGE'){
    if('clipsContent' in ancestor) ancestor.clipsContent=false;
    ancestor=ancestor.parent;
  }
  return badge;
}
// A spec panel is one or more sections. Each section can have an optional heading; its rows are
// numbered 1..N starting fresh within that section, so every panel reads as self-contained lists,
// and the screen-specific section's numbers match the pins placed on the screen above it.
function specPanel(title,sections,x,y,w){
  const f=frame('VERTICAL',{name:'Spec · '+title,gap:14,pad:24,fill:W,stroke:K,r:12,dash:[6,4]});
  page.appendChild(f); f.resize(w,100); f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='FIXED';
  f.x=x; f.y=y;
  text(f,title,'Bold',18,K);
  sections.forEach(sec=>{
    if(sec.heading) text(f,sec.heading,'Semi Bold',15,K);
    sec.rows.forEach((body,j)=>{
      const r=frame('HORIZONTAL',{name:'Row '+(j+1),gap:12}); r.counterAxisAlignItems='MIN';
      f.appendChild(r); r.layoutSizingHorizontal='FILL'; r.layoutSizingVertical='HUG';
      const n=frame('HORIZONTAL',{name:'Number',fill:K,r:99}); n.primaryAxisAlignItems='CENTER'; n.counterAxisAlignItems='CENTER';
      r.appendChild(n); n.resize(26,26); n.primaryAxisSizingMode='FIXED'; n.counterAxisSizingMode='FIXED';
      text(n,String(j+1),'Bold',12,W);
      text(r,body,'Regular',14,K,{fw:true});
    });
  });
  return f;
}

// --- 1. clean slate: remove every previous spec panel, notes panel, design tokens panel, and
//        every screen this script builds (root frame + its two floating label texts). Anything
//        named "Annotation N" (Figma's own AI annotation feature) is never touched. ---
const SCREEN_NAMES=['01 · Sign in & Join class','02 · Dashboard','03 · AI Study Helper','04 · Class Discussions','05 · Road to Glory','05 · Rewards & Gamification'];
const toRemove=[];
for(const n of SCREEN_NAMES){ toRemove.push(n,'Label '+n,'Sub '+n); }
for(const n of page.children.filter(c=>
  c.name.startsWith('Annotations · ')||c.name.startsWith('Notes · ')||c.name.startsWith('Spec · ')||
  c.name==='Design tokens'||toRemove.includes(c.name)
)) n.remove();
const leg=page.children.find(c=>c.name==='Legend');
if(leg){ for(const t of leg.findAll(n=>n.type==='TEXT'&&n.characters.startsWith('Source:'))) t.remove(); }

// --- 2. shared design tokens, folded into every screen's own panel (not a separate page) ---
const tokenRows=[
 'Canvas: every screen frame is 1440 x 1024px, a Desktop breakpoint.',
 'Black #000000: body text, strokes, primary button fill, active nav and tab states.',
 'White #FFFFFF: page background, card background, card and screen fills.',
 'Light grey #F0F0F0: sidebar background, secondary chip fill, hover and warm-colour placeholder surfaces.',
 'Mid grey #D1D1D1: avatar placeholder fill, image placeholder fill.',
 'Grey text #737373: secondary text, timestamps, input placeholder text.',
 'Corner radius 2px: badge tiles on the Road to Glory rewards page, deliberately sharper than everywhere else.',
 'Corner radius 4px: small icon tiles and checkboxes.',
 'Corner radius 6px: tabs, small chips, calendar day cells.',
 'Corner radius 8px: buttons, inputs, list rows, nav items, attachment chips.',
 'Corner radius 10px: flashcards, image placeholders, direct message post.',
 'Corner radius 12px: cards, panels, calendar container.',
 'Corner radius 16px: the sign-in card on screen 1.',
 'Corner radius 99px: pills, chips, circular avatars, toggle tracks, badge circles.',
 'Stroke: 1.5px solid black on every outlined card, button and input; 1px on calendar day cells.',
 'Dashed stroke (4,3 or 5,4 or 6,4): marks a pending, private or non-final state, for example a status still awaiting teacher verification.',
 'Typography: Inter throughout. Sizes run from 11px meta labels up to 36px on the sign-in headline. Semi Bold for labels and buttons, Bold for headlines and numbers, Regular for body copy.',
 'Spacing: 4 to 8px between a tightly paired icon and label, 12 to 16px between fields inside a card, 24 to 32px for page-level padding.',
];
// The little pin badges are numbered 1..N to match the numbered row of the same index in the
// section below with the same heading (not the "Design tokens" section, which stays unpinned
// since it describes system-wide values rather than one spot on this particular screen).
function screenLabel(name,x,y){
  const label=text(page,name,'Semi Bold',28,K); label.name='Label '+name; label.x=x; label.y=y-60;
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Low-fidelity wireframe','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
}
function newRoot(name,x,y){
  const root=frame('VERTICAL',{name,gap:0,fill:W,stroke:K,sw:2,clip:true});
  page.appendChild(root); root.resize(1440,1024); root.x=x; root.y=y;
  root.primaryAxisSizingMode='FIXED'; root.counterAxisSizingMode='FIXED';
  return root;
}

// ================= SCREEN 01 · Sign in & Join class =================
{
  const NAME='01 · Sign in & Join class', X=100, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const bodyRoot=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});

  const left=al(bodyRoot,'VERTICAL',{name:'Brand panel',w:600,fh:true,fill:G1,pad:64,gap:32,justify:'SPACE_BETWEEN'});
  const brandTop=al(left,'VERTICAL',{name:'Brand copy',gap:28,fw:true});
  const logoRow=al(brandTop,'HORIZONTAL',{name:'Logo',gap:12,align:'CENTER'});
  const mark=al(logoRow,'HORIZONTAL',{name:'Logo mark',w:40,h:40,fill:K,r:10,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',22,W);
  text(logoRow,'Clarion AI','Bold',24,K);
  text(brandTop,'One place for your tasks, deadlines, discussions and study help.','Bold',36,K,{w:472});
  text(brandTop,'Built for middle and high school students. Licensed by your school.','Regular',16,G3,{w:472});
  const feats=al(brandTop,'VERTICAL',{name:'Feature list',gap:14});
  const featRows=[];
  for(const f of ['Centralised dashboard, every class, every deadline','AI study helper, plans, flashcards, doubts (sources shown)','Teacher-verified rewards for finishing on time','Public and direct discussions with teachers']){
    const r=al(feats,'HORIZONTAL',{name:'Feature',gap:12,align:'CENTER'}); checkbox(r,true); text(r,f,'Regular',15,K); featRows.push(r);
  }
  const illo=imgph(left,{w:472,h:200,r:12,label:'Product illustration / screenshot'});

  const right=al(bodyRoot,'VERTICAL',{name:'Auth panel',fw:true,fh:true,fill:W,pad:48,gap:24,justify:'SPACE_BETWEEN',align:'CENTER'});
  const util=al(right,'HORIZONTAL',{name:'Utilities',gap:8,fw:true,justify:'MAX',align:'CENTER'});
  chip(util,'Language: English'); chip(util,'Aa Text size'); chip(util,'High contrast');

  const card=al(right,'VERTICAL',{name:'Auth card',w:440,pad:32,gap:16,stroke:K,r:16,fill:W});
  text(card,'Welcome back','Bold',28,K);
  text(card,'Sign in with your school account to see all your classes in one place.','Regular',14,G3,{w:376});
  const tabs=al(card,'HORIZONTAL',{name:'Tabs',gap:0,fw:true,stroke:K,r:8,clip:true});
  const t1=al(tabs,'HORIZONTAL',{name:'Tab/Sign in',py:10,fw:true,fill:K,justify:'CENTER'}); text(t1,'Sign in','Semi Bold',14,W);
  const t2=al(tabs,'HORIZONTAL',{name:'Tab/Create account',py:10,fw:true,fill:W,justify:'CENTER'}); text(t2,'Create account','Semi Bold',14,K);
  const emailInput=input(card,'School email',{fw:true});
  input(card,'Password',{fw:true});
  const rem=al(card,'HORIZONTAL',{name:'Remember row',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const remL=al(rem,'HORIZONTAL',{gap:8,align:'CENTER'}); checkbox(remL,false); text(remL,'Remember me','Regular',13,K);
  text(rem,'Forgot password?','Semi Bold',13,K);
  const signInBtn=btn(card,'Sign in',{primary:true,fw:true,py:12});
  btn(card,'Continue with Google Workspace',{fw:true,py:12});
  const orRow=al(card,'HORIZONTAL',{name:'Or',gap:12,fw:true,align:'CENTER'}); divider(orRow); text(orRow,'or join a class','Regular',12,G3); divider(orRow);
  text(card,'Have a 6-digit class code from your teacher?','Semi Bold',14,K);
  const code=al(card,'HORIZONTAL',{name:'Code inputs',gap:8,fw:true,justify:'SPACE_BETWEEN'});
  for(let i=0;i<6;i++){ const d=al(code,'HORIZONTAL',{name:'Digit '+(i+1),w:54,h:60,stroke:K,r:8,fill:W,align:'CENTER',justify:'CENTER'}); text(d,i<2?String(i+3):'','Semi Bold',24,K); }
  btn(card,'Join class',{fw:true,py:12});

  text(right,'Safe for students, teacher-monitored, no ads, works on phone, laptop and desktop','Regular',12,G3,{align:'CENTER'});

  pin(root,1,10,10);
  pin(left,2);
  pin(logoRow,3);
  pin(brandTop,4,220,88);
  pin(feats,5);
  pin(illo,6);
  pin(util,7);
  pin(card,8);
  pin(tabs,9);
  pin(emailInput,10);
  pin(signInBtn,11);
  pin(code,12);

  specPanel(NAME,[
   {rows:[
    'Frame: 1440 x 1024px, split into a fixed 600px left panel and a flexible right panel.',
    'Left brand panel: fill #F0F0F0, padding 64px on all sides, 32px gap between blocks.',
    'Logo mark: 40 x 40px square, fill #000000, corner radius 10px, white "C" set at 22px Bold.',
    'Headline: 36px Bold black text, capped at 472px width so it wraps to three lines.',
    'Feature checkboxes: 20 x 20px, corner radius 4px, checked state is filled #000000 with a white tick mark.',
    'Illustration placeholder: 472 x 200px box, corner radius 12px, 1.5px black stroke, fill #F0F0F0.',
    'Utility chips top right (language, text size, contrast): pill shape, corner radius 99px, padding 10px horizontal and 4px vertical, 1.5px black stroke.',
    'Auth card: fixed width 440px, padding 32px, 16px gap between fields, 1.5px black stroke, corner radius 16px, white fill.',
    'Sign in and Create account tabs: shared 8px radius container, each tab 10px vertical padding, active tab is filled #000000 with white 14px Semi Bold text.',
    'Text inputs: padding 12px horizontal and 10px vertical, corner radius 8px, 1.5px black stroke, placeholder text in #737373 at 14px.',
    'Primary button (Sign in): black fill, white 14px Semi Bold text, padding 16px horizontal and 12px vertical, corner radius 8px.',
    'Six-digit class code boxes: 54 x 60px each, corner radius 8px, 1.5px black stroke, 8px gap between boxes, digits set at 24px Semi Bold.',
   ]},
   {heading:'Design tokens', rows:tokenRows},
  ], 100, 220+1024+40, 1440);
}

// ================= SCREEN 02 · Dashboard =================
{
  const NAME='02 · Dashboard', X=100+1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);

  const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:W});
  const logo=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
  const mark=al(logo,'HORIZONTAL',{name:'Logo mark',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',18,W);
  text(logo,'Clarion AI','Bold',20,K);
  const search=al(top,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:460,h:40,stroke:K,r:99,fill:W}); icon(search,18,'Search icon'); text(search,'Search tasks, classes, discussions...','Regular',14,G3);
  al(top,'HORIZONTAL',{name:'Spacer',fw:true});
  chip(top,'EN'); chip(top,'Aa');
  icon(top,32,'Bell');
  const pts=al(top,'HORIZONTAL',{name:'Points',px:12,py:6,gap:6,align:'CENTER',stroke:K,r:4,fill:G1}); text(pts,'240 pts','Bold',13,K); text(pts,'verified','Regular',11,G3);
  circleEl(top,36);
  divider(root);

  const body=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});
  const side=al(body,'VERTICAL',{name:'Sidebar',w:240,fh:true,fill:G1,pad:16,gap:4});
  const navItems=['Dashboard','My classes','Calendar','Discussions','AI Helper','Rewards'];
  for(const n of navItems){ const a=n==='Dashboard'; const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:8,fill:a?K:null}); icon(it,18,'Icon'); text(it,n,'Regular',15,a?W:K); }
  al(side,'VERTICAL',{name:'Spacer',fh:true});
  const join=al(side,'VERTICAL',{name:'Join class card',pad:12,gap:8,fw:true,stroke:K,r:8,fill:W});
  text(join,'Join a class','Semi Bold',13,K); input(join,'6-digit code',{fw:true,s:13}); btn(join,'Join',{fw:true,py:8,s:13});
  const it2=al(side,'HORIZONTAL',{name:'Nav/Customise theme',px:12,py:10,gap:10,align:'CENTER',fw:true}); icon(it2,18,'Icon'); text(it2,'Customise theme','Regular',15,K);
  const it3=al(side,'HORIZONTAL',{name:'Nav/Settings',px:12,py:10,gap:10,align:'CENTER',fw:true}); icon(it3,18,'Icon'); text(it3,'Settings','Regular',15,K);
  divider(side);
  const user=al(side,'HORIZONTAL',{name:'User',gap:10,align:'CENTER',px:4,py:6}); circleEl(user,32); const ut=al(user,'VERTICAL',{gap:2}); text(ut,'Prithu S.','Semi Bold',14,K); text(ut,'Student, Year 9','Regular',12,G3);
  rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});
  const content=al(body,'HORIZONTAL',{name:'Content',fw:true,fh:true,fill:W,gap:0});

  const pageCol=al(content,'VERTICAL',{name:'Dashboard page',pad:32,gap:24,fw:true,fh:true});
  const hdr=al(pageCol,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Good morning, Prithu','Bold',28,K); text(hl,'Monday 14 September, 5 tasks due this week, 1 overdue','Regular',14,G3);
  const hr=al(hdr,'HORIZONTAL',{gap:10}); btn(hr,'+ Add task'); btn(hr,'Ask AI helper',{primary:true});

  const stats=al(pageCol,'HORIZONTAL',{name:'Stats',gap:16,fw:true});
  const statData=[['Due today','2','Maths, English'],['Overdue','1','warm colour in hi-fi'],['Due this week','5','across 4 classes'],['Streak','6 days','240 pts, teacher-verified']];
  const statCards=[];
  for(const [l,v,n] of statData){ const c=al(stats,'VERTICAL',{name:'Stat/'+l,pad:16,gap:6,fw:true,stroke:K,r:12,fill:l==='Overdue'?G1:W}); text(c,l,'Regular',13,G3); text(c,v,'Bold',28,K); text(c,n,'Regular',12,G3); statCards.push(c); }

  const main=al(pageCol,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
  const leftCol=al(main,'VERTICAL',{name:'Left column',gap:16,fw:true,fh:true});
  const tasks=al(leftCol,'VERTICAL',{name:'Upcoming tasks card',stroke:K,r:12,fill:W,fw:true,fh:true,clip:true});
  const th=al(tasks,'HORIZONTAL',{name:'Card header',px:20,py:14,fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  text(th,'Upcoming tasks','Semi Bold',18,K);
  const tabsRow=al(th,'HORIZONTAL',{gap:4}); for(const t of ['All','Today','Week','Done']){ const a=t==='All'; const b=al(tabsRow,'HORIZONTAL',{name:'Tab/'+t,px:12,py:6,r:99,fill:a?K:null,stroke:a?K:null}); text(b,t,'Semi Bold',13,a?W:K); }
  divider(tasks);
  const rows=[
   [false,'Cell structure worksheet','Biology 9B','Due yesterday','OVERDUE',{dark:true},'-10 pts if not done'],
   [false,'Quadratics practice set','Maths 9','Due today, 5:00 pm','Due today',{},'+20 pts'],
   [false,'Poetry analysis, first draft','English 9','Due Thu 17 Sep','Approaching',{},'+30 pts'],
   [false,'Source evaluation (WW1)','History 9','Due Mon 21 Sep','',null,'+25 pts'],
   [true,'Lab report, enzymes','Chemistry 9','Submitted today','Awaiting teacher verification',{dash:[4,3],plain:true},'+30 pts pending'],
   [true,'Map quiz, rivers','Geography 9','Verified by Mr Rao','Verified','',{dark:true}],
  ];
  const taskRowFrames=[]; let overdueStatusChip=null, pendingStatusChip=null;
  for(const [done,title,cls,due,status,so,pts] of rows){
    const r=al(tasks,'HORIZONTAL',{name:'Task row',px:20,py:14,gap:14,fw:true,align:'CENTER'});
    checkbox(r,done);
    const mid=al(r,'VERTICAL',{gap:4,fw:true}); text(mid,title,'Semi Bold',15,done?G3:K); const meta=al(mid,'HORIZONTAL',{gap:8,align:'CENTER'}); chip(meta,cls); text(meta,due,'Regular',12,G3);
    const rightBox=al(r,'HORIZONTAL',{gap:10,align:'CENTER'});
    let statusChipNode=null;
    if(status){ statusChipNode=chip(rightBox,status,so||{}); }
    text(rightBox,typeof pts==='string'?pts:'Verified','Regular',12,G3);
    taskRowFrames.push(r);
    if(status==='OVERDUE') overdueStatusChip=statusChipNode;
    if(status==='Awaiting teacher verification') pendingStatusChip=statusChipNode;
    divider(tasks);
  }
  const tf=al(tasks,'HORIZONTAL',{name:'Card footer',px:20,py:12,fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(tf,'Rewards are added only after your teacher confirms completion.','Regular',12,G3); text(tf,'View all tasks','Semi Bold',13,K);

  const right=al(main,'VERTICAL',{name:'Right column',gap:16,w:400,fh:true});
  const cal=al(right,'VERTICAL',{name:'Calendar card',pad:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  const ch=al(cal,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(ch,'‹','Bold',16,K); text(ch,'September 2026','Semi Bold',15,K); text(ch,'›','Bold',16,K);
  const wk=al(cal,'HORIZONTAL',{gap:4,fw:true}); for(const d of ['M','T','W','T','F','S','S']){ const c=al(wk,'HORIZONTAL',{fw:true,justify:'CENTER'}); text(c,d,'Semi Bold',11,G3); }
  const marks={14:'today',13:'overdue',15:'due',17:'due',21:'due',25:'test'};
  const start=1;
  for(let r=0;r<5;r++){ const row=al(cal,'HORIZONTAL',{gap:4,fw:true}); for(let c=0;c<7;c++){ const idx=r*7+c; const n=idx-start+1; const cell=al(row,'VERTICAL',{name:'Day',fw:true,h:36,r:6,align:'CENTER',justify:'CENTER',gap:2,fill:n===14?K:null,stroke:n>=1&&n<=30?K:null,sw:1}); if(n>=1&&n<=30){ text(cell,String(n),'Regular',12,n===14?W:K); const m=marks[n]; if(m&&m!=='today'){ rectBox(cell,{w:m==='overdue'?18:6,h:6,r:99,fill:K,stroke:null}); } } } }
  const legRow=al(cal,'HORIZONTAL',{gap:12,fw:true,align:'CENTER'}); for(const [l,w] of [['Due',6],['Overdue (red in hi-fi)',18],['Test',6]]){ const g=al(legRow,'HORIZONTAL',{gap:4,align:'CENTER'}); rectBox(g,{w,h:6,r:99,fill:K,stroke:null}); text(g,l,'Regular',11,G3); }

  const disc=al(right,'VERTICAL',{name:'Recent discussions card',pad:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  const dh=al(disc,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(dh,'Recent discussions','Semi Bold',15,K); text(dh,'Open','Semi Bold',12,K);
  for(const [who,chan,msg,t,badge] of [['Ms Kaushal','Biology 9B, # Q&A','Friday test covers unit 3 only...','2m','Teacher'],['Ananya R.','Maths 9, # Group project','Can we meet at lunch to finish...','18m','']]){
    const r=al(disc,'HORIZONTAL',{gap:10,fw:true,align:'MIN'}); circleEl(r,32); const m=al(r,'VERTICAL',{gap:2,fw:true}); const l1=al(m,'HORIZONTAL',{gap:6,align:'CENTER'}); text(l1,who,'Semi Bold',13,K); if(badge) chip(l1,badge,{dark:true}); text(m,chan,'Regular',11,G3); text(m,msg,'Regular',12,K,{w:260}); text(r,t,'Regular',11,G3);
  }

  const ai=al(right,'VERTICAL',{name:'AI suggestion card',pad:16,gap:10,fw:true,stroke:K,r:12,fill:G1});
  const ah=al(ai,'HORIZONTAL',{gap:8,align:'CENTER'}); const mk=al(ah,'HORIZONTAL',{w:24,h:24,fill:K,r:6,align:'CENTER',justify:'CENTER'}); text(mk,'C','Bold',13,W); text(ah,'AI helper suggests','Semi Bold',13,K);
  text(ai,'You have 3 tasks due in the next 48 hours and a Biology test on Friday. Want a 2-hour-a-night study plan?','Regular',13,K,{w:336});
  const ab=al(ai,'HORIZONTAL',{gap:8}); btn(ab,'Create plan',{primary:true,py:8,s:13}); btn(ab,'Prioritise tasks',{py:8,s:13});

  pin(top,1,10,10);
  pin(search,2);
  pin(pts,3);
  pin(top,4,-10,54);
  pin(side,5);
  pin(statCards[1],6);
  pin(tasks,7);
  pin(taskRowFrames[1],8);
  pin(overdueStatusChip||pendingStatusChip,9);
  pin(cal,10);
  pin(ai,11);
  pin(disc,12);

  specPanel(NAME,[
   {rows:[
    'Top bar: full width, 64px tall, white fill, 1.5px black border along the bottom edge only.',
    'Logo mark 32 x 32px, corner radius 8px. Search bar 460px wide and 40px tall, pill shaped at 99px radius, 1.5px black stroke.',
    'Points chip: corner radius 4px (intentionally squarer than other chips), 1.5px black stroke, #F0F0F0 fill, 13px Bold text.',
    'Avatar circle: 36px diameter, #D1D1D1 fill, 1.5px black stroke.',
    'Sidebar: fixed width 240px, #F0F0F0 fill, 16px padding. Nav item padding 12px horizontal and 10px vertical, corner radius 8px; the active item is filled #000000 with white 15px Semi Bold text.',
    'Stat cards: four equal columns, 16px padding, corner radius 12px, 1.5px black stroke. The Overdue card is filled #F0F0F0 here to mark the spot that becomes a warm red in the final build. Value text is 28px Bold.',
    'Upcoming tasks card: corner radius 12px, 1.5px black stroke, white fill. Header padding 20px horizontal, 14px vertical. Filter pills (All, Today, Week, Done) are 99px radius.',
    'Task rows: 20px horizontal padding, 14px vertical padding, separated by 1.5px black dividers. Checkbox is 20 x 20px at 4px radius.',
    'Status chips: 99px pill radius. Overdue and Verified use a solid #000000 fill. "Awaiting teacher verification" uses a dashed 4,3 stroke instead of a solid fill, to read as pending.',
    'Calendar card: corner radius 12px, 16px padding. Day cells are roughly 36 to 44px square, 6px radius, 1px black stroke; the current day is filled solid #000000.',
    'AI suggestion card: corner radius 12px, #F0F0F0 fill. AI mark is 24 x 24px, 6px radius, black square with a white "C".',
    'Recent discussions: 32px circular avatars, Teacher badge chip filled #000000 with white text.',
   ]},
   {heading:'Design tokens', rows:tokenRows},
  ], 100+1640, 220+1024+40, 1440);
}

// ================= SCREEN 03 · AI Study Helper =================
{
  const NAME='03 · AI Study Helper', X=100+1640*2, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);

  const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:W});
  const logo=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
  const markT=al(logo,'HORIZONTAL',{name:'Logo mark',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(markT,'C','Bold',18,W);
  text(logo,'Clarion AI','Bold',20,K);
  const searchT=al(top,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:460,h:40,stroke:K,r:99,fill:W}); icon(searchT,18,'Search icon'); text(searchT,'Search tasks, classes, discussions...','Regular',14,G3);
  al(top,'HORIZONTAL',{name:'Spacer',fw:true});
  chip(top,'EN'); chip(top,'Aa'); icon(top,32,'Bell');
  const ptsT=al(top,'HORIZONTAL',{name:'Points',px:12,py:6,gap:6,align:'CENTER',stroke:K,r:4,fill:G1}); text(ptsT,'240 pts','Bold',13,K); text(ptsT,'verified','Regular',11,G3);
  circleEl(top,36);
  divider(root);

  const body=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});
  const side=al(body,'VERTICAL',{name:'Sidebar',w:240,fh:true,fill:G1,pad:16,gap:4});
  const navItems=['Dashboard','My classes','Calendar','Discussions','AI Helper','Rewards'];
  for(const n of navItems){ const a=n==='AI Helper'; const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:8,fill:a?K:null}); icon(it,18,'Icon'); text(it,n,'Regular',15,a?W:K); }
  al(side,'VERTICAL',{name:'Spacer',fh:true});
  const joinT=al(side,'VERTICAL',{name:'Join class card',pad:12,gap:8,fw:true,stroke:K,r:8,fill:W}); text(joinT,'Join a class','Semi Bold',13,K); input(joinT,'6-digit code',{fw:true,s:13}); btn(joinT,'Join',{fw:true,py:8,s:13});
  rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});
  const content=al(body,'HORIZONTAL',{name:'Content',fw:true,fh:true,fill:W,gap:0});

  const left=al(content,'VERTICAL',{name:'Chats panel',w:280,fh:true,pad:16,gap:8,fill:W});
  btn(left,'+ New chat',{primary:true,fw:true});
  text(left,'RECENT','Semi Bold',11,G3);
  const chats=[['Study plan, Bio test Fri',true],['Flashcards: Quadratics',false],['Doubt: photosynthesis equation',false],['Summarise: History unit 2',false],['Prioritise my week',false]];
  for(const [n,a] of chats){ const it=al(left,'VERTICAL',{name:'Chat/'+n,px:12,py:10,gap:2,fw:true,r:8,fill:a?G1:null,stroke:a?K:null}); text(it,n,'Regular',14,K); text(it,a?'Today':'Yesterday','Regular',11,G3); }
  al(left,'VERTICAL',{name:'Spacer',fh:true});
  const note=al(left,'VERTICAL',{name:'Trust note',pad:12,gap:6,fw:true,stroke:K,r:8,fill:G1,dash:[4,3]});
  text(note,'Every answer shows its sources','Semi Bold',12,K); text(note,'Target: 5% or lower hallucination on complex topics. Teachers can review AI chats.','Regular',11,G3,{w:224});
  rectBox(content,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});

  const main=al(content,'VERTICAL',{name:'Chat column',fw:true,fh:true,gap:0});
  const hdr=al(main,'HORIZONTAL',{name:'Chat header',px:24,py:14,fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:2}); text(hl,'Study Helper','Bold',20,K); text(hl,'Knows your classes, tasks and notes, teacher-monitored','Regular',12,G3);
  const hrr=al(hdr,'HORIZONTAL',{gap:8,align:'CENTER'}); chip(hrr,'Context: Biology 9B'); chip(hrr,'Mode: Study plan'); icon(hrr,32,'More');
  divider(main);
  const msgs=al(main,'VERTICAL',{name:'Messages',px:24,py:20,gap:16,fw:true,fh:true});

  function aiMark(p){ const m=al(p,'HORIZONTAL',{name:'AI avatar',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(m,'C','Bold',16,W); return m; }
  const m1=al(msgs,'HORIZONTAL',{name:'AI message',gap:12,fw:true}); const mark1=aiMark(m1);
  const b1=al(m1,'VERTICAL',{name:'Bubble',pad:16,gap:12,w:640,stroke:K,r:12,fill:G1});
  text(b1,'Hi Prithu! You have a Biology test on Friday and 2 tasks due before then. What would you like to do?','Regular',14,K,{w:608});
  const qa=al(b1,'HORIZONTAL',{gap:8}); btn(qa,'Make a study plan',{py:8,s:13}); btn(qa,'Generate flashcards',{py:8,s:13}); btn(qa,'Ask a doubt',{py:8,s:13}); btn(qa,'Summarise my week',{py:8,s:13});

  const m2=al(msgs,'HORIZONTAL',{name:'User message',gap:12,fw:true,justify:'MAX'});
  const b2=al(m2,'VERTICAL',{name:'Bubble',pad:14,w:460,fill:K,r:12}); text(b2,'Make me a study plan for the Biology test, I can do about 2 hours a night, and I still have the cell structure worksheet to finish.','Regular',14,W,{w:432});
  circleEl(m2,32);

  const m3=al(msgs,'HORIZONTAL',{name:'AI message',gap:12,fw:true}); aiMark(m3);
  const b3=al(m3,'VERTICAL',{name:'Bubble',pad:16,gap:12,w:640,stroke:K,r:12,fill:G1});
  const t3=al(b3,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(t3,'Study plan, Biology test (Fri 18 Sep)','Semi Bold',15,K); chip(t3,'3 nights, ~2 h each');
  const plan=al(b3,'VERTICAL',{gap:0,fw:true,stroke:K,r:8,fill:W,clip:true});
  const days=[['Mon (tonight)','45 min','Finish Cell structure worksheet (overdue task)','30 min','Read notes p.3-6 and self-check'],['Tue','60 min','Photosynthesis, 12 flashcards and recall','40 min','Diagram: chloroplast, label from memory'],['Wed','45 min','Practice quiz (unit 3)','45 min','Review weak spots from the quiz']];
  days.forEach(([d,t1,a1,t2,a2],i)=>{ const r=al(plan,'HORIZONTAL',{px:12,py:10,gap:12,fw:true,align:'MIN'}); text(r,d,'Semi Bold',13,K,{w:96}); const c=al(r,'VERTICAL',{gap:4,fw:true}); text(c,t1+' - '+a1,'Regular',13,K,{w:440}); text(c,t2+' - '+a2,'Regular',13,G3,{w:440}); if(i<days.length-1) divider(plan); });
  const src=al(b3,'HORIZONTAL',{gap:6,align:'CENTER',fw:true}); text(src,'Sources:','Semi Bold',12,G3); chip(src,'Bio unit 3 notes.pdf',{plain:true}); chip(src,'Task: Cell structure worksheet',{plain:true}); chip(src,'# Q&A, 14 Sep (Ms Kaushal)',{plain:true});
  const act=al(b3,'HORIZONTAL',{gap:8,fw:true,align:'CENTER'}); const addCalBtn=btn(act,'Add to calendar',{primary:true,py:8,s:13}); btn(act,'Make flashcards from this',{py:8,s:13}); btn(act,'Edit plan',{py:8,s:13}); al(act,'HORIZONTAL',{fw:true}); text(act,'Helpful? Yes / No','Regular',12,G3);

  const m4=al(msgs,'HORIZONTAL',{name:'AI message',gap:12,fw:true}); aiMark(m4);
  const b4=al(m4,'VERTICAL',{name:'Bubble',pad:16,gap:10,w:640,stroke:K,r:12,fill:G1});
  text(b4,'Preview of tonight\'s flashcards (1 of 12), tap to flip:','Regular',14,K);
  const fc=al(b4,'HORIZONTAL',{gap:12,fw:true});
  const f1=al(fc,'VERTICAL',{name:'Flashcard front',pad:16,gap:6,fw:true,h:84,stroke:K,r:10,fill:W,justify:'CENTER',align:'CENTER'}); text(f1,'FRONT','Semi Bold',10,G3); text(f1,'Where does photosynthesis happen?','Semi Bold',14,K,{align:'CENTER'});
  al(fc,'VERTICAL',{name:'Flashcard back',pad:16,gap:6,fw:true,h:84,stroke:K,r:10,fill:W,justify:'CENTER',align:'CENTER',dash:[5,4]});

  const sug=al(main,'HORIZONTAL',{name:'Suggested prompts',px:24,py:8,gap:8,fw:true});
  for(const s of ['Explain photosynthesis simply','Quiz me on unit 3','Summarise today\'s discussion','What should I do first?']) chip(sug,s);
  const comp=al(main,'VERTICAL',{name:'Composer',px:24,pt:8,pb:16,gap:8,fw:true});
  const inp=al(comp,'HORIZONTAL',{name:'Input',px:12,py:10,gap:10,fw:true,stroke:K,r:12,align:'CENTER'});
  icon(inp,24,'Attach'); text(inp,'Ask anything about your classes, tasks or notes...','Regular',14,G3,{fw:true}); icon(inp,24,'Mic'); const sendBtn=btn(inp,'Send',{primary:true,py:8});
  text(comp,'AI can make mistakes, check the sources shown. Your teacher can view AI chats for safety.','Regular',11,G3);

  pin(left,1,10,10);
  pin(hdr,2);
  pin(mark1,3);
  pin(b1,4);
  pin(b2,5);
  pin(qa,6);
  pin(plan,7);
  pin(src,8);
  pin(fc,9);
  pin(inp,10);
  pin(sendBtn,11);

  specPanel(NAME,[
   {rows:[
    'Chats panel: fixed width 280px, white fill, 16px padding. Chat list item padding 12px horizontal, 10px vertical, corner radius 8px; the active chat is filled #F0F0F0 with a 1.5px black stroke.',
    'Chat header: 24px horizontal padding, 14px vertical padding. Context and mode chips are 99px radius pills with a 1.5px black stroke.',
    'AI avatar mark: 32 x 32px, black fill, corner radius 8px, white "C" set at 16px Bold.',
    'AI message bubble: maximum width 640px, 16px padding, corner radius 12px, #F0F0F0 fill, no stroke.',
    'User message bubble: black fill, white text, 14px padding, corner radius 12px, aligned to the right edge of the column.',
    'Quick action buttons inside bubbles: corner radius 8px, 1.5px black stroke, 12px horizontal and 8px vertical padding, 13px Semi Bold text.',
    'Study plan table: corner radius 8px, 1.5px black stroke, white fill, each row padded 12px horizontal and 10px vertical, separated by 1.5px black dividers.',
    'Source chips: 99px pill radius, 1.5px black stroke, white fill, 12px Semi Bold text.',
    'Flashcard preview: two cards side by side, each 84px tall, corner radius 10px. The front card has a solid 1.5px black stroke; the back card uses a dashed 5,4 stroke to signal it is the flipped, hidden-until-tapped state.',
    'Composer input: corner radius 12px, 1.5px black stroke, 12px horizontal and 10px vertical padding, placeholder text in #737373.',
    'Send button: black fill, white text, corner radius 8px, 16px horizontal and 8px vertical padding.',
   ]},
   {heading:'Design tokens', rows:tokenRows},
  ], 100+1640*2, 220+1024+40, 1440);
}

// ================= SCREEN 04 · Class Discussions =================
{
  const NAME='04 · Class Discussions', X=100+1640*3, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);

  const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:W});
  const logo=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
  const markT=al(logo,'HORIZONTAL',{name:'Logo mark',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(markT,'C','Bold',18,W);
  text(logo,'Clarion AI','Bold',20,K);
  const searchT=al(top,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:460,h:40,stroke:K,r:99,fill:W}); icon(searchT,18,'Search icon'); text(searchT,'Search tasks, classes, discussions...','Regular',14,G3);
  al(top,'HORIZONTAL',{name:'Spacer',fw:true});
  chip(top,'EN'); chip(top,'Aa'); icon(top,32,'Bell');
  const ptsT=al(top,'HORIZONTAL',{name:'Points',px:12,py:6,gap:6,align:'CENTER',stroke:K,r:4,fill:G1}); text(ptsT,'240 pts','Bold',13,K); text(ptsT,'verified','Regular',11,G3);
  circleEl(top,36);
  divider(root);

  const body=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});
  const side=al(body,'VERTICAL',{name:'Sidebar',w:240,fh:true,fill:G1,pad:16,gap:4});
  const navItems=['Dashboard','My classes','Calendar','Discussions','AI Helper','Rewards'];
  for(const n of navItems){ const a=n==='Discussions'; const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:8,fill:a?K:null}); icon(it,18,'Icon'); text(it,n,'Regular',15,a?W:K); }
  al(side,'VERTICAL',{name:'Spacer',fh:true});
  const joinT=al(side,'VERTICAL',{name:'Join class card',pad:12,gap:8,fw:true,stroke:K,r:8,fill:W}); text(joinT,'Join a class','Semi Bold',13,K); input(joinT,'6-digit code',{fw:true,s:13}); btn(joinT,'Join',{fw:true,py:8,s:13});
  rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});
  const content=al(body,'HORIZONTAL',{name:'Content',fw:true,fh:true,fill:W,gap:0});

  const left=al(content,'VERTICAL',{name:'Channel list',w:280,fh:true,pad:16,gap:6,fill:W});
  const lh=al(left,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(lh,'Discussions','Bold',18,K); icon(lh,28,'New');
  input(left,'Search discussions',{fw:true,s:13});
  text(left,'CLASSES','Semi Bold',11,G3);
  const classes=[['Biology 9B',['# Announcements','# Q&A','# Group project']],['Maths 9',['# Announcements','# Q&A']],['English 9',['# Announcements']]];
  let unreadBadge=null;
  for(const [cls,chs] of classes){
    const g=al(left,'VERTICAL',{name:'Class/'+cls,gap:2,fw:true});
    const gh=al(g,'HORIZONTAL',{px:8,py:6,gap:6,fw:true,align:'CENTER'}); text(gh,'v','Regular',11,K); text(gh,cls,'Semi Bold',14,K);
    for(const ch of chs){ const a=cls==='Biology 9B'&&ch==='# Q&A'; const it=al(g,'HORIZONTAL',{name:'Channel/'+ch,pl:24,pr:10,py:6,fw:true,r:6,fill:a?K:null,justify:'SPACE_BETWEEN',align:'CENTER'}); text(it,ch,'Regular',14,a?W:K); if(ch==='# Announcements'&&cls==='Maths 9'){ const b=al(it,'HORIZONTAL',{w:18,h:18,r:99,fill:K,align:'CENTER',justify:'CENTER'}); text(b,'1','Bold',10,W); unreadBadge=b; } }
  }
  text(left,'DIRECT MESSAGES','Semi Bold',11,G3);
  for(const [n,b] of [['Ms Kaushal, Biology','2'],['Mr Rao, Maths',''],['Study group, Ananya, Vir','']]){ const it=al(left,'HORIZONTAL',{name:'DM/'+n,px:8,py:6,gap:8,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'}); const l=al(it,'HORIZONTAL',{gap:8,align:'CENTER'}); circleEl(l,24); text(l,n,'Regular',13,K); if(b){ const bb=al(it,'HORIZONTAL',{w:18,h:18,r:99,fill:K,align:'CENTER',justify:'CENTER'}); text(bb,b,'Bold',10,W); } }
  al(left,'VERTICAL',{name:'Spacer',fh:true});
  text(left,'Teachers can see every public and direct message.','Regular',11,G3,{w:248});
  rectBox(content,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});

  const main=al(content,'VERTICAL',{name:'Feed column',fw:true,fh:true,gap:0});
  const hdr=al(main,'HORIZONTAL',{name:'Feed header',px:24,py:12,fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:2}); text(hl,'# Q&A, Biology 9B','Bold',20,K); text(hl,'24 members, teacher-monitored, messages sync in under 10 seconds','Regular',12,G3);
  const hr=al(hdr,'HORIZONTAL',{gap:10,align:'CENTER'});
  const tog=al(hr,'HORIZONTAL',{name:'Public/Direct toggle',stroke:K,r:99,clip:true,gap:0});
  const p1=al(tog,'HORIZONTAL',{px:14,py:6,fill:K}); text(p1,'Public','Semi Bold',13,W);
  const p2=al(tog,'HORIZONTAL',{px:14,py:6,fill:W}); text(p2,'Direct','Semi Bold',13,K);
  chip(hr,'Pinned (2)'); icon(hr,32,'Members');
  divider(main);
  const pinBar=al(main,'HORIZONTAL',{name:'Pinned bar',px:24,py:8,gap:10,fw:true,fill:G1,align:'CENTER'}); chip(pinBar,'PINNED',{dark:true}); text(pinBar,'Friday test covers unit 3 only (cell structure and photosynthesis), Ms Kaushal','Semi Bold',13,K); text(pinBar,'View all','Regular',12,K);
  divider(main);
  const feed=al(main,'VERTICAL',{name:'Feed',px:24,py:20,gap:16,fw:true,fh:true});
  let firstTeacherChip=null, firstAttachChip=null, firstAvatarRow=null;
  function post(p,{who,role,time,body,replies,indent,extra}){
    indent=indent||0;
    const r=al(p,'HORIZONTAL',{name:'Post/'+who,gap:12,fw:true,pl:indent});
    const av=circleEl(r,36);
    const c=al(r,'VERTICAL',{gap:6,fw:true});
    const l1=al(c,'HORIZONTAL',{gap:8,align:'CENTER'}); text(l1,who,'Semi Bold',14,K); let roleChip=null; if(role) roleChip=chip(l1,role,{dark:role==='Teacher'}); text(l1,time,'Regular',12,G3);
    text(c,body,'Regular',14,K,{w:620-indent});
    let attachChip=null;
    if(extra) attachChip=extra(c);
    const a=al(c,'HORIZONTAL',{gap:16,align:'CENTER'}); text(a,replies,'Semi Bold',12,K); text(a,'Reply','Regular',12,G3); text(a,'React','Regular',12,G3); text(a,'Ask AI to summarise','Regular',12,G3);
    if(!firstAvatarRow) firstAvatarRow=r;
    if(role==='Teacher'&&!firstTeacherChip) firstTeacherChip=roleChip;
    if(attachChip&&!firstAttachChip) firstAttachChip=attachChip;
    return r;
  }
  post(feed,{who:'Ms Kaushal',role:'Teacher',time:'10 min ago',body:'Reminder: the Friday test covers cell structure and photosynthesis only. Bring your lab notebooks. The worksheet from Monday is still due; I will verify submissions tonight so your points go through.',replies:'12 replies',extra:(c)=>{ const attRow=al(c,'HORIZONTAL',{gap:8,align:'CENTER',px:10,py:8,stroke:K,r:8,fill:G1}); al(attRow,'HORIZONTAL',{w:20,h:24,stroke:K,r:3,fill:W}); text(attRow,'Unit 3 revision sheet.pdf, 2 pages','Regular',12,K); return attRow; }});
  divider(feed);
  post(feed,{who:'Ananya R.',role:'Student',time:'8 min ago',body:'Do we need to know the light-dependent reactions in detail, or just the overall equation?',replies:'3 replies'});
  post(feed,{who:'Ms Kaushal',role:'Teacher',time:'5 min ago',indent:48,body:'Just the overall equation and where it happens. Detail comes next term.',replies:'1 reply'});
  divider(feed);
  const dm=al(feed,'VERTICAL',{name:'Direct message post',gap:8,fw:true,pad:12,stroke:K,r:10,dash:[5,4]});
  const dmh=al(dm,'HORIZONTAL',{gap:8,align:'CENTER'}); chip(dmh,'DIRECT',{dark:true}); text(dmh,'Only you and Ms Kaushal can see this, teachers-of-record are notified','Regular',12,G3);
  post(dm,{who:'You',role:'',time:'2 min ago',body:'Could I get a one-day extension on the cell structure worksheet? I was off sick on Monday.',replies:'Awaiting reply'});
  divider(main);
  const comp=al(main,'VERTICAL',{name:'Composer',px:24,pt:12,pb:16,gap:8,fw:true});
  const row=al(comp,'HORIZONTAL',{gap:10,fw:true,align:'CENTER'}); circleEl(row,32);
  const inp=al(row,'HORIZONTAL',{name:'Input',px:12,py:10,gap:10,fw:true,stroke:K,r:12,align:'CENTER'}); text(inp,'Reply in # Q&A, switch to Direct to message Ms Kaushal privately','Regular',14,G3,{fw:true}); icon(inp,24,'Attach'); const postBtn=btn(inp,'Post',{primary:true,py:8});
  text(comp,'Be kind. Teachers can view all messages. Links are scanned for scams and phishing.','Regular',11,G3);

  const right=al(content,'VERTICAL',{name:'Class panel',w:260,fh:true,pad:16,gap:12,fill:W});
  text(right,'About this class','Semi Bold',14,K);
  const tr=al(right,'HORIZONTAL',{gap:10,align:'CENTER'}); circleEl(tr,36); const tt=al(tr,'VERTICAL',{gap:2}); text(tt,'Ms Seema Kaushal','Semi Bold',13,K); text(tt,'Teacher, Biology 9B','Regular',11,G3);
  const codeRow=al(right,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER',px:10,py:8,stroke:K,r:8,fill:G1}); text(codeRow,'Class code','Regular',12,G3); text(codeRow,'34 19 02','Bold',14,K);
  divider(right);
  text(right,'Members (24)','Semi Bold',14,K);
  for(const n of ['Ms Kaushal, Teacher','Ananya R.','Vir M.','Prithu S. (you)','Aarav K.']){ const r=al(right,'HORIZONTAL',{gap:8,align:'CENTER'}); circleEl(r,24); text(r,n,'Regular',13,K); }
  text(right,'+ 19 more','Regular',12,G3);
  divider(right);
  text(right,'Related tasks','Semi Bold',14,K);
  for(const [t,s] of [['Cell structure worksheet','Overdue'],['Unit 3 test','Fri 18 Sep']]){ const r=al(right,'VERTICAL',{gap:4,fw:true,px:10,py:8,stroke:K,r:8}); text(r,t,'Semi Bold',13,K); chip(r,s,{dark:s==='Overdue'}); }
  al(right,'VERTICAL',{fh:true});
  btn(right,'Report a message',{fw:true,py:8,s:13});

  pin(left,1,10,10);
  pin(unreadBadge?unreadBadge.parent:left,2);
  pin(hdr,3);
  pin(pinBar,4);
  pin(firstAvatarRow,5);
  pin(firstTeacherChip?firstTeacherChip.parent:feed,6);
  pin(dm,7);
  pin(firstAttachChip||feed,8);
  pin(inp,9);
  pin(right,10);

  specPanel(NAME,[
   {rows:[
    'Channel list: fixed width 280px, white fill, 16px padding. Channel row corner radius 6px; the active channel is filled #000000 with white text.',
    'Unread badge: 18 x 18px circle, 99px radius, black fill, white 10px Bold number.',
    'Feed header: 24px horizontal padding, 12px vertical padding. Public and Direct toggle shares one 99px radius pill container; the active segment is filled #000000.',
    'Pinned bar: #F0F0F0 fill, 24px horizontal and 8px vertical padding. Pinned chip is filled #000000.',
    'Post avatar: 36px circle, #D1D1D1 fill, 1.5px black stroke.',
    'Teacher badge chip: 99px radius, black fill, white 12px Semi Bold text.',
    'Direct message post: whole block has a 10px corner radius and a dashed 5,4 black stroke (instead of solid) to mark it as private. Its Direct label chip is filled #000000.',
    'Attachment chip (for example the revision sheet PDF): corner radius 8px, 1.5px black stroke, #F0F0F0 fill.',
    'Composer: input corner radius 12px with a 1.5px black stroke; Post button is black fill, white text, corner radius 8px.',
    'Right class panel: fixed width 260px. Class code chip is corner radius 8px, #F0F0F0 fill, value set at 14px Bold. Member avatars are 24px circles. Related task chips are 99px pills.',
   ]},
   {heading:'Design tokens', rows:tokenRows},
  ], 100+1640*3, 220+1024+40, 1440);
}

// ================= SCREEN 05 · Road to Glory (rewards / gamification) =================
{
  const NAME='05 · Road to Glory', X=100+4*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);

  const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:W});
  const logo=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
  const mark=al(logo,'HORIZONTAL',{name:'Logo mark',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',18,W);
  text(logo,'Clarion AI','Bold',20,K);
  const search=al(top,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:460,h:40,stroke:K,r:99,fill:W}); rectBox(search,{w:18,h:18,r:4,fill:G1}); text(search,'Search tasks, classes, discussions...','Regular',14,G3);
  al(top,'HORIZONTAL',{name:'Spacer',fw:true});
  chip(top,'EN'); chip(top,'Aa');
  rectBox(top,{w:32,h:32,r:8,fill:G1});
  const pts=al(top,'HORIZONTAL',{name:'Points',px:12,py:6,gap:6,align:'CENTER',stroke:K,r:4,fill:G1}); text(pts,'240 pts','Bold',13,K); text(pts,'verified','Regular',11,G3);
  circleEl(top,36);
  divider(root);

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

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Road to Glory','Bold',28,K); text(hl,'Points are added only after your teacher checks your work.','Regular',14,G3);
  btn(hdr,'Redeem history');

  const stats=al(content,'HORIZONTAL',{name:'Stat row',gap:16,fw:true});
  const s1=al(stats,'VERTICAL',{name:'Stat/Verified',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W}); text(s1,'Verified points','Regular',13,G3); text(s1,'240 pts','Bold',28,K); text(s1,'since 1 Sep','Regular',12,G3);
  const s2=al(stats,'VERTICAL',{name:'Stat/Pending',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W,dash:[4,3]}); text(s2,'Pending verification','Regular',13,G3); text(s2,'12 pts','Bold',28,K); text(s2,'1 task awaiting teacher check','Regular',12,G3);
  const s3=al(stats,'VERTICAL',{name:'Stat/Streak',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W}); text(s3,'Current streak','Regular',13,G3); text(s3,'6 days','Bold',28,K); text(s3,'streak breaks turn warm-coloured in hi-fi','Regular',12,G3);

  const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
  const left=al(main,'VERTICAL',{name:'Left column',gap:20,fw:true,fh:true});

  const badgeCard=al(left,'VERTICAL',{name:'Badges card',px:20,py:16,gap:14,fw:true,stroke:K,r:12,fill:W});
  text(badgeCard,'Badges','Semi Bold',18,K);
  const grid=al(badgeCard,'HORIZONTAL',{name:'Badge grid',gap:12,fw:true});
  const badgeData=[
   ['Perfect week',true,'Earned 8 Sep',[[0,1,1,0],[1,1,1,1],[1,0,0,1],[0,1,1,0]]],
   ['Early bird',true,'Earned 3 Sep',[[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1]]],
   ['Class helper',false,'Locked',[[0,0,1,0],[0,1,1,0],[1,1,1,1],[0,0,1,0]]],
   ['30-day streak',false,'Locked',[[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]]],
  ];
  let firstPixelIcon=null, lockedTile=null;
  badgeData.forEach(([name,unlocked,sub2,pattern],idx)=>{
    const tile=al(grid,'VERTICAL',{name:'Badge/'+name,px:14,py:14,gap:8,align:'CENTER',justify:'CENTER',r:2,fw:true,fill:unlocked?W:G1,stroke:K,dash:unlocked?null:[4,3]});
    const px=pixelIcon(tile,pattern); if(idx===0) firstPixelIcon=px;
    text(tile,name,'Semi Bold',13,K,{align:'CENTER'});
    text(tile,sub2,'Regular',11,G3);
    if(!unlocked&&!lockedTile) lockedTile=tile;
  });
  text(badgeCard,'Sharp 2px corners on badge tiles only, everywhere else uses 8 to 16px, the pixelated sharp-corner treatment the design spec calls for on gamification elements.','Regular',12,G3,{fw:true});

  const redeem=al(left,'VERTICAL',{name:'Redeem card',px:20,py:16,gap:0,fw:true,stroke:K,r:12,fill:W,clip:true});
  text(redeem,'Redeem your points','Semi Bold',18,K);
  text(redeem,'Spend verified points on in-app extras, nothing a teacher needs to arrange.','Regular',12,G3,{fw:true});
  const redeemRows=[['Streak freeze (skip a day)',60,true],['Unlock "Ocean" theme colours',30,true],['Gold avatar frame',40,true],['Darksword: +90 damage per turn',150,true],['"Founder" profile badge',300,false]];
  for(const [name,cost,afford] of redeemRows){
    const r=al(redeem,'HORIZONTAL',{name:'Redeem row',py:12,gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
    const rl=al(r,'VERTICAL',{gap:2}); text(rl,name,'Semi Bold',14,K); text(rl,cost+' pts','Regular',12,G3);
    btn(r,afford?'Redeem':'Need '+(cost-240)+' more',{primary:afford,disabled:!afford,py:8,s:13});
    divider(redeem);
  }

  const activity=al(left,'VERTICAL',{name:'Activity card',px:20,py:16,gap:0,fw:true,stroke:K,r:12,fill:W,clip:true});
  text(activity,'Recent activity','Semi Bold',18,K);
  const actRows=[['Map quiz verified by Mr Rao','+20 pts',false],['Reading log verified by Ms Kaushal','+15 pts',false],['Lab report submitted, awaiting verification','+30 pts pending',true]];
  for(const [what,pt,pending] of actRows){
    const r=al(activity,'HORIZONTAL',{name:'Activity row',py:12,gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
    text(r,what,'Regular',14,K,{fw:true});
    chip(r,pt,{dark:!pending,dash:pending?[4,3]:null});
    divider(activity);
  }

  const right=al(main,'VERTICAL',{name:'Right column',w:380,gap:20,fh:true});

  const lead=al(right,'VERTICAL',{name:'Class leaderboard card',px:20,py:16,gap:12,fw:true,stroke:K,r:12,fill:W});
  const lh=al(lead,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(lh,'Class leaderboard','Semi Bold',16,K); const classToggle=toggle(lh,true);
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

  pin(top,1,10,10);
  pin(stats,2);
  pin(grid,3);
  pin(firstPixelIcon,4);
  pin(lockedTile,5);
  pin(redeem,6);
  pin(activity,7);
  pin(lead,8);
  pin(classToggle,9);
  pin(school,10);
  pin(info,11);

  specPanel(NAME,[
   {rows:[
    'Frame: 1440 x 1024px, same top bar and sidebar shell as the Dashboard, with Rewards set as the active nav item.',
    'Stat row: 3 equal cards, 16px padding, corner radius 12px, 1.5px black stroke. The Pending card uses a dashed 4,3 stroke instead of solid, to mark it as not yet confirmed.',
    'Badge tiles: 4 across, roughly 300 x 150px each, corner radius 2px. Deliberately sharp, unlike the 8 to 16px used elsewhere, matching the design brief note that gamification elements get sharp corners.',
    'Badge pixel icon: 40 x 40px square, a 4 x 4 grid of 8 x 8px blocks with 2px gaps, black or grey-outlined.',
    'Locked badge: #F0F0F0 fill, dashed 4,3 black stroke. Unlocked badge: white fill, solid 1.5px black stroke.',
    'Redeem row: rewards are in-app and game-style, for example a streak freeze, a theme colour unlock, an avatar frame, a weapon upgrade, or a profile badge, never a real-world prize a teacher or school would need to arrange. 12px vertical row padding, 1.5px divider, Redeem button at 8px radius, black fill when affordable, #F0F0F0 fill and grey text with a "need X more" label when not.',
    'Activity row: same pattern as the Dashboard task list. Verified points use a solid black 99px pill, pending points use a dashed 4,3 pill.',
    'Class leaderboard card: corner radius 12px, 1.5px black stroke, scoped to the student\'s own class. Rank badge is a 28px circle at 99px radius. The current student\'s row gets an added 1.5px black outline and 8px padding.',
    'Visibility toggle: 44 x 24px pill track at 99px radius, 20px white knob. Filled black with the knob on the right when visible to classmates, filled #F0F0F0 with the knob on the left when off.',
    'School leaderboard card: same 12px radius and 1.5px stroke, scoped to the whole year group and anonymised by default, shown with the toggle off. Lists the top 3 students school-wide, then a highlighted "Your rank" row so a student outside the top 3 still sees where they stand.',
    'Why teacher-verified info card: #F0F0F0 fill, corner radius 12px, one short paragraph tying points and both leaderboards back to teacher verification.',
   ]},
   {heading:'Design tokens', rows:tokenRows},
  ], 100+4*1640, 220+1024+40, 1440);
}

// --- final safety net: replace every em dash anywhere on the page ---
const special=[
 ['Biology test — I can','Biology test. I can'],
 ['(1 of 12) — tap','(1 of 12), tap'],
 ['AI can make mistakes — check','AI can make mistakes, check'],
 ['photosynthesis) — Ms Kaushal','photosynthesis) · Ms Kaushal'],
 ['still due — I will','still due; I will'],
];
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters;
  for(const [a,b] of special) s=s.split(a).join(b);
  s=s.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

// --- move Figma's own viewport to show everything at once ---
figma.viewport.scrollAndZoomIntoView(page.children);

figma.notify('Done: all 5 screens rebuilt with numbered pins on the canvas, 5 self-contained spec panels, '+dashCount+' em dashes replaced.');
return {ok:true};
