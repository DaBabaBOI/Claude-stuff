// Clarion AI wireframes: the FULL Concept B set (Class tabs), applied consistently across the
// whole product, not just the Dashboard: AI Helper, Discussions, and Rewards all get a
// class-tab layout as their throughline idea, instead of the time-based (Concept C) or
// status-based (Concept A) organisation.
// - Screen 12 (Dashboard, Concept B sketch) already exists: this only ADDS pins to it by finding
//   its elements by name, it does not rebuild or move anything on that screen.
// - Screens 21-23 are built fresh with pins baked in, 6px inside their card from the start.
// Purely additive to the rest of the file: does not touch screens 01-20 or their panels.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page,
// in the "Clarion AI, Wireframes" file (not Socratree Design).
// Safe to re-run: it deletes its own previous output first, then rebuilds.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const K={r:0,g:0,b:0}, W={r:1,g:1,b:1}, G1={r:0.94,g:0.94,b:0.94}, G2={r:0.82,g:0.82,b:0.82}, G3={r:0.45,g:0.45,b:0.45};
const S=c=>[{type:'SOLID',color:c}];
const page=figma.currentPage;

// --- helpers (identical to the rest of the file) ---
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
function icon(parent,d,name){
  d=d||20; name=name||'Icon';
  const f=al(parent,'HORIZONTAL',{name,w:d,h:d,stroke:K,r:4,fill:G1,align:'CENTER',justify:'CENTER'});
  text(f,'○','Regular',Math.round(d*0.5),G3);
  return f;
}
function pin(node,number){
  if(!node||typeof node.appendChild!=='function') return null;
  const badge=figma.createFrame();
  badge.name='Pin '+number;
  badge.layoutMode='HORIZONTAL'; badge.primaryAxisAlignItems='CENTER'; badge.counterAxisAlignItems='CENTER';
  badge.fills=S(K); badge.strokes=S(W); badge.strokeWeight=2; badge.cornerRadius=99;
  node.appendChild(badge);
  badge.resize(24,24); badge.primaryAxisSizingMode='FIXED'; badge.counterAxisSizingMode='FIXED';
  badge.layoutPositioning='ABSOLUTE';
  badge.x=6; badge.y=6;
  const t=figma.createText(); t.fontName={family:'Inter',style:'Bold'}; t.characters=String(number); t.fontSize=12; t.fills=S(W);
  badge.appendChild(t);
  return badge;
}
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
function screenLabel(name,x,y){
  const label=text(page,name,'Semi Bold',28,K); label.name='Label '+name; label.x=x; label.y=y-60;
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Concept B, class-first throughout','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
}
function newRoot(name,x,y){
  const root=frame('VERTICAL',{name,gap:0,fill:W,stroke:K,sw:2,clip:true});
  page.appendChild(root); root.resize(1440,1024); root.x=x; root.y=y;
  root.primaryAxisSizingMode='FIXED'; root.counterAxisSizingMode='FIXED';
  return root;
}
function shell(root,active){
  const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:W});
  const logo=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
  const mark=al(logo,'HORIZONTAL',{name:'Logo mark',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',18,W);
  text(logo,'Clarion AI','Bold',20,K);
  const search=al(top,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:400,h:40,stroke:K,r:99,fill:W}); icon(search,18,'Search icon'); text(search,'Search tasks, classes, discussions...','Regular',14,G3);
  al(top,'HORIZONTAL',{name:'Spacer',fw:true});
  chip(top,'EN'); chip(top,'Aa'); icon(top,32,'Bell');
  const pts=al(top,'HORIZONTAL',{name:'Points',px:12,py:6,gap:6,align:'CENTER',stroke:K,r:4,fill:G1}); text(pts,'240 pts','Bold',13,K); text(pts,'verified','Regular',11,G3);
  circleEl(top,36);
  divider(root);
  const body=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});
  const side=al(body,'VERTICAL',{name:'Sidebar',w:240,fh:true,fill:G1,pad:16,gap:4});
  const navItems=['Dashboard','My classes','Calendar','Discussions','AI Helper','Rewards'];
  for(const n of navItems){ const a=n===active; const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:8,fill:a?K:null}); icon(it,18,'Icon'); text(it,n,'Regular',15,a?W:K); }
  al(side,'VERTICAL',{name:'Spacer',fh:true});
  const user=al(side,'HORIZONTAL',{name:'User',gap:10,align:'CENTER',px:4,py:6}); circleEl(user,32); const ut=al(user,'VERTICAL',{gap:2}); text(ut,'Prithu S.','Semi Bold',14,K); text(ut,'Student, Year 9','Regular',12,G3);
  rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});
  const content=al(body,'VERTICAL',{name:'Content',px:32,py:32,gap:24,fw:true,fh:true});
  return content;
}
// shared class-tabs row: pills, one active
function classTabs(parent,active,names){
  const tabs=al(parent,'HORIZONTAL',{name:'Class tabs',gap:8,fw:true});
  const tabFrames=[];
  for(const c of names){ const a=c===active; const t=al(tabs,'HORIZONTAL',{name:'Tab/'+c,px:16,py:10,r:99,fill:a?K:null,stroke:K}); text(t,c,'Semi Bold',14,a?W:K); tabFrames.push(t); }
  return {tabs,tabFrames};
}

// --- clean slate for screens 21-23 and for screen 12's pins/panel ---
const NAMES=['21 · AI Helper, Class tabs (Concept B)','22 · Discussions, Class tabs (Concept B)','23 · Road to Glory, Class tabs (Concept B)'];
const toRemove=[];
for(const n of NAMES) toRemove.push(n,'Label '+n,'Sub '+n,'Spec · '+n);
for(const n of page.children.filter(c=>toRemove.includes(c.name))) n.remove();

// ================= pins onto the EXISTING screen 12 (Dashboard, Concept B sketch) =================
{
  const root12=page.children.find(c=>c.name==='12 · Dashboard concept B, Class tabs');
  if(root12){
    for(const n of root12.findAll(c=>/^Pin \d+$/.test(c.name))) n.remove();
    const byName=n=>root12.findOne(c=>c.name===n);
    const tabsFrame=byName('Class tabs');
    const classCard=byName('Active class card');
    const strip=byName('Overview strip');
    const ai=byName('AI suggestion card');
    [[tabsFrame,2],[classCard,3],[strip,4],[ai,5]].forEach(([n,i])=>pin(n,i));
    figma.notify('Pins added to screen 12.');
  } else {
    figma.notify('Screen 12 not found, skipped its pins.');
  }
}

// ================= 21 · AI Helper, Class tabs (Concept B) =================
{
  const NAME='21 · AI Helper, Class tabs (Concept B)', X=100+20*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'AI Helper');

  const chdr=al(content,'VERTICAL',{gap:4,fw:true}); text(chdr,'Study Helper','Bold',24,K); text(chdr,'A separate conversation per class, so switching subjects does not mean scrolling past unrelated messages.','Regular',13,G3);
  const {tabs,tabFrames}=classTabs(content,'Biology 9B',['Biology 9B','Maths 9','English 9','History 9']);

  const chatCard=al(content,'VERTICAL',{name:'Class chat card',gap:12,fw:true,fh:true,px:20,py:20,stroke:K,r:12,fill:W});
  const ch=al(chatCard,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(ch,'Biology 9B','Semi Bold',18,K); chip(ch,'2 messages in this class');
  divider(chatCard);
  const bubbleRow=al(chatCard,'HORIZONTAL',{name:'AI message',gap:12,fw:true});
  const mark=al(bubbleRow,'HORIZONTAL',{name:'AI avatar',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',16,W);
  const bubble=al(bubbleRow,'VERTICAL',{name:'Bubble',pad:14,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(bubble,'For Friday\'s Biology test, focus on the TFTP rule and the overall photosynthesis equation.','Regular',14,K,{fw:true});
  al(chatCard,'VERTICAL',{name:'Spacer',fh:true});
  const askBar=al(chatCard,'HORIZONTAL',{name:'Ask bar',px:16,py:12,gap:10,align:'CENTER',stroke:K,r:99,fill:W,fw:true});
  icon(askBar,20,'Ask icon'); text(askBar,'Ask about Biology 9B...','Regular',14,G3,{fw:true}); btn(askBar,'Send',{primary:true,py:8});

  pin(chdr,1); pin(tabs,2); pin(chatCard,3); pin(bubbleRow,4); pin(askBar,5);

  specPanel(NAME,[
   {rows:[
    'Header: "Study Helper" 24px Bold, subtitle sets the Concept B framing directly, a separate conversation per class instead of one shared thread.',
    'Class tabs: pill row, 99px radius each, 16px/10px padding, the active class filled #000000 with white text, same tab component used on every Concept B screen.',
    'Class chat card: fills the remaining width and height, corner radius 12px, 1.5px stroke, 20px padding; header names the class and how many messages exist in it.',
    'AI message bubble: 32px avatar, #F0F0F0 fill, 12px radius, 14px padding, the reply is scoped to only what that class needs, no mention of Maths or English tasks here.',
    'Ask bar: pinned to the bottom of the card, 99px radius pill, 1.5px stroke; placeholder text names the active class directly, "Ask about Biology 9B...".',
   ]},
  ], 100+20*1640, 220+1024+40, 1440);
}

// ================= 22 · Discussions, Class tabs (Concept B) =================
{
  const NAME='22 · Discussions, Class tabs (Concept B)', X=100+21*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Discussions');

  const hdr=al(content,'VERTICAL',{gap:4,fw:true}); text(hdr,'Discussions','Bold',24,K); text(hdr,'Same tab bar as the Dashboard and AI Helper, so switching classes feels identical everywhere in the product.','Regular',13,G3);
  const {tabs,tabFrames}=classTabs(content,'Biology 9B',['Biology 9B','Maths 9','English 9','History 9']);

  const feedCard=al(content,'VERTICAL',{name:'Class feed card',gap:12,fw:true,fh:true,px:20,py:20,stroke:K,r:12,fill:W,clip:true});
  const fh=al(feedCard,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(fh,'# Q&A, Biology 9B','Semi Bold',18,K); chip(fh,'Pinned (1)');
  divider(feedCard);
  function post(parent,who,role,when,body){
    const r=al(parent,'HORIZONTAL',{name:'Post',gap:12,fw:true});
    circleEl(r,32);
    const c=al(r,'VERTICAL',{gap:4,fw:true});
    const l1=al(c,'HORIZONTAL',{gap:8,align:'CENTER'}); text(l1,who,'Semi Bold',13,K); if(role) chip(l1,role,{dark:role==='Teacher'}); text(l1,when,'Regular',11,G3);
    text(c,body,'Regular',13,K,{fw:true});
    return r;
  }
  const p1=post(feedCard,'Ms Kaushal','Teacher','10 min ago','Reminder: the Friday test covers cell structure and photosynthesis only.');
  divider(feedCard);
  const p2=post(feedCard,'Ananya R.','Student','8 min ago','Do we need the light-dependent reactions in detail, or just the overall equation?');
  al(feedCard,'VERTICAL',{name:'Spacer',fh:true});
  const comp=al(feedCard,'HORIZONTAL',{name:'Composer',gap:10,fw:true,align:'CENTER'}); circleEl(comp,28);
  const inp=al(comp,'HORIZONTAL',{name:'Input',px:12,py:8,gap:10,fw:true,stroke:K,r:12,align:'CENTER'}); text(inp,'Reply in Biology 9B...','Regular',13,G3,{fw:true}); btn(inp,'Post',{primary:true,py:6,s:13});

  pin(hdr,1); pin(tabs,2); pin(feedCard,3); pin(p1,4); pin(p2,5); pin(inp,6);

  specPanel(NAME,[
   {rows:[
    'Header: "Discussions" 24px Bold, subtitle notes that the same tab component appears on the Dashboard, AI Helper and here, so the pattern is learned once.',
    'Class tabs: identical styling and behaviour to the Dashboard and AI Helper Concept B screens.',
    'Class feed card: fills the remaining height, corner radius 12px, 1.5px stroke, clips content; header shows the channel name and a Pinned count for that class specifically.',
    'Teacher post: 32px avatar, Teacher chip (solid black), same row pattern as the main Discussions screen but slightly tightened (13px title instead of 14px) since the card has less vertical room with tabs above it.',
    'Student post: same row pattern, no Teacher chip.',
    'Composer: pinned to the bottom of the card, placeholder names the active class, "Reply in Biology 9B...", so it is always clear which class a reply goes to.',
   ]},
  ], 100+21*1640, 220+1024+40, 1440);
}

// ================= 23 · Road to Glory, Class tabs (Concept B) =================
{
  const NAME='23 · Road to Glory, Class tabs (Concept B)', X=100+22*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Rewards');

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Road to Glory','Bold',28,K); text(hl,'Points and leaderboards are shown per class, since a class is also the unit teachers verify work in.','Regular',14,G3);
  chip(hdr,'240 pts total, verified');

  const {tabs,tabFrames}=classTabs(content,'Biology 9B',['Biology 9B','Maths 9','English 9','History 9']);

  const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
  const left=al(main,'VERTICAL',{name:'Class rewards card',gap:16,fw:true,fh:true,px:20,py:20,stroke:K,r:12,fill:W});
  const ch=al(left,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(ch,'Biology 9B','Semi Bold',20,K); text(ch,'90 pts earned in this class','Regular',13,G3);
  divider(left);
  text(left,'Badges from this class','Semi Bold',15,K);
  const bgrid=al(left,'HORIZONTAL',{name:'Badge grid',gap:12,fw:true});
  for(const [name,unlocked] of [['Perfect week',true],['Class helper',false]]){
    const tile=al(bgrid,'VERTICAL',{name:'Badge/'+name,px:14,py:14,gap:6,align:'CENTER',justify:'CENTER',r:2,fw:true,fill:unlocked?W:G1,stroke:K,dash:unlocked?null:[4,3]});
    text(tile,name,'Semi Bold',13,K,{align:'CENTER'});
  }

  const right=al(main,'VERTICAL',{name:'Right column',w:340,gap:16,fh:true});
  const lead=al(right,'VERTICAL',{name:'Class leaderboard card',px:20,py:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  text(lead,'Biology 9B leaderboard','Semi Bold',16,K);
  for(const [rank,name,score,me] of [['1','Ananya R.',95,false],['2','Prithu S. (you)',90,true]]){
    const r=al(lead,'HORIZONTAL',{name:'Leader row',gap:10,fw:true,align:'CENTER',px:me?8:0,py:me?6:0,r:8,stroke:me?K:null});
    const rb=al(r,'HORIZONTAL',{w:26,h:26,r:99,fill:K,align:'CENTER',justify:'CENTER'}); text(rb,rank,'Bold',12,W);
    circleEl(r,26); text(r,name,me?'Semi Bold':'Regular',14,K,{fw:true}); text(r,String(score),'Bold',14,K);
  }
  const info=al(right,'VERTICAL',{name:'Why verified card',px:20,py:16,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(info,'Why per class?','Semi Bold',15,K);
  text(info,'Your teacher only sees and verifies work for their own class, so points and rankings are scoped the same way.','Regular',13,K,{fw:true});

  pin(hdr,1); pin(tabs,2); pin(left,3); pin(bgrid,4); pin(lead,5); pin(info,6);

  specPanel(NAME,[
   {rows:[
    'Header: "Road to Glory" 28px Bold, subtitle explains the rationale directly, points are grouped by class because verification itself happens per class.',
    'Class tabs: identical styling to the other three Concept B screens.',
    'Class rewards card: fills the remaining width and height, corner radius 12px, 1.5px stroke, 20px padding; header states the class and how many of the student\'s total points came from it specifically.',
    'Badge grid: only badges earned in this class are shown, same tile styling as the main Rewards screen, 2px sharp radius, dashed stroke on the locked one.',
    'Class leaderboard: scored on points earned in this class only, not the student\'s total, so the numbers are smaller than on the main Rewards screen and differ from class to class.',
    'Why per class info card: a new explanatory note this concept needs that the others do not, since scoping points by class is a less obvious idea than a single site-wide total.',
   ]},
  ], 100+22*1640, 220+1024+40, 1440);
}

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: Concept B full set. Pins added to screen 12, screens 21-23 built with pins. ' + dashCount + ' em dashes replaced.');
return { ok: true };
