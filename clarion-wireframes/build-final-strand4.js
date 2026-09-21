// Clarion AI: Strand 4 final planning drawings. Colorized, de-cluttered, high-fidelity versions
// of only the winning designs from peer feedback (per the Criterion B doc):
//   Sign in + Dashboard  -> the common design shared by every wireframe
//   AI Study Helper      -> Wireframe 3's priority list (grouped by urgency, accent bar per row)
//   Discussions          -> Wireframe 4's filterable inbox (search + filters, list + detail pane)
//   Road to Glory        -> Wireframe 2's streak strip / gamification layout
// The logo is recreated as native vector shapes (gradient ring + triangle), not an uploaded
// image, so it can be reused and animated later without needing an asset upload.
// Sidebar nav items and the top-bar logo are wired as Figma prototype links (Smart Animate) so
// you can click through Dashboard / Discussions / AI Helper / Rewards in presentation mode.
// This assumes you've already cleared the canvas. Safe to re-run: it deletes its own previous
// output first by name.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const page = figma.currentPage;

// --- palette ---
const PURPLE={r:0.486,g:0.361,b:1}, BLUE={r:0.231,g:0.510,b:0.965};
const LBLUE={r:0.918,g:0.949,b:1}, LGREEN={r:0.918,g:0.984,b:0.941};
const AMBER={r:0.961,g:0.620,b:0.043}, WARM_BG={r:1,g:0.949,b:0.910};
const GREEN={r:0.086,g:0.639,b:0.290}, GREEN_BG={r:0.882,g:0.969,b:0.902};
const INK={r:0.122,g:0.161,b:0.216}, SUB={r:0.420,g:0.447,b:0.502};
const LINE={r:0.886,g:0.910,b:0.941}, WHITE={r:1,g:1,b:1}, SURFACE={r:0.976,g:0.980,b:0.988};
const S=c=>[{type:'SOLID',color:c}];
const GR=(c1,c2)=>[{type:'GRADIENT_LINEAR',gradientStops:[{position:0,color:{...c1,a:1}},{position:1,color:{...c2,a:1}}],gradientTransform:[[1,0,0],[0,1,0]]}];
const BRAND=GR(PURPLE,BLUE);

// --- helpers ---
function frame(dir,opts={}){
  const f=figma.createFrame();
  f.name=opts.name||'Frame'; f.layoutMode=dir; f.itemSpacing=opts.gap??8;
  f.paddingTop=opts.pt??opts.py??opts.pad??0; f.paddingBottom=opts.pb??opts.py??opts.pad??0;
  f.paddingLeft=opts.pl??opts.px??opts.pad??0; f.paddingRight=opts.pr??opts.px??opts.pad??0;
  f.fills=opts.fill?(Array.isArray(opts.fill)?opts.fill:S(opts.fill)):[]; f.strokes=opts.stroke?S(opts.stroke):[];
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
  const t=figma.createText(); t.fontName={family:'Inter',style}; t.characters=chars; t.fontSize=size;
  t.fills=Array.isArray(color)?color:S(color);
  parent.appendChild(t);
  if(opts.w){ t.textAutoResize='HEIGHT'; t.resize(opts.w,t.height); }
  if(opts.fw){ t.textAutoResize='HEIGHT'; t.resize(200,t.height); t.layoutSizingHorizontal='FILL'; }
  if(opts.align) t.textAlignHorizontal=opts.align;
  return t;
}
function rectBox(parent,opts={}){
  const r=figma.createRectangle(); r.name=opts.name||'Box'; r.resize(opts.w??24,opts.h??24);
  r.fills=opts.fill===null?[]:(Array.isArray(opts.fill)?opts.fill:S(opts.fill??WHITE));
  r.strokes=opts.stroke===null?[]:S(opts.stroke??LINE);
  r.strokeWeight=opts.sw??1.5; r.cornerRadius=opts.r??0; if(opts.dash) r.dashPattern=opts.dash;
  parent.appendChild(r); if(opts.fw) r.layoutSizingHorizontal='FILL'; if(opts.fh) r.layoutSizingVertical='FILL';
  return r;
}
function circleEl(parent,d,opts={}){
  const e=figma.createEllipse(); e.name=opts.name||'Circle'; e.resize(d,d);
  e.fills=Array.isArray(opts.fill)?opts.fill:S(opts.fill??LINE); e.strokes=opts.stroke===null?[]:S(opts.stroke??LINE); e.strokeWeight=opts.sw??1.5;
  parent.appendChild(e); return e;
}
function btn(parent,label,opts={}){
  const b=al(parent,'HORIZONTAL',{name:'Button/'+label,px:opts.px??16,py:opts.py??10,gap:8,align:'CENTER',justify:'CENTER',fill:opts.primary?BRAND:(opts.disabled?SURFACE:WHITE),stroke:opts.primary?null:LINE,r:opts.r??10,fw:opts.fw,w:opts.w,h:opts.h});
  text(b,label,'Semi Bold',opts.s??14,opts.primary?WHITE:(opts.disabled?SUB:INK));
  return b;
}
function chip(parent,label,opts={}){
  const c=al(parent,'HORIZONTAL',{name:'Chip/'+label,px:10,py:4,align:'CENTER',fill:opts.active?BRAND:(opts.tint||SURFACE),stroke:opts.active?null:LINE,r:99,dash:opts.dash});
  text(c,label,'Semi Bold',12,opts.active?WHITE:(opts.color||SUB));
  return c;
}
function divider(parent){ return rectBox(parent,{name:'Divider',h:1,fw:true,fill:LINE,stroke:null,r:0}); }
function icon(parent,d,glyph,color){
  d=d||20;
  const f=al(parent,'HORIZONTAL',{name:'Icon',w:d,h:d,align:'CENTER',justify:'CENTER'});
  text(f,glyph||'○','Regular',Math.round(d*0.6),color||SUB);
  return f;
}
// Logo mark: gradient "C" ring with a triangle inside, native vectors (no uploaded image).
function logoMark(parent,size){
  const wrap=al(parent,'HORIZONTAL',{name:'Logo mark',w:size,h:size,align:'CENTER',justify:'CENTER'});
  wrap.layoutMode='NONE'; wrap.primaryAxisSizingMode='FIXED'; wrap.counterAxisSizingMode='FIXED'; wrap.resize(size,size);
  const ring=figma.createEllipse(); ring.name='Ring'; ring.resize(size,size);
  ring.fills=[]; ring.strokes=BRAND; ring.strokeWeight=size*0.16; ring.strokeCap='ROUND';
  const gap=Math.PI*0.24;
  ring.arcData={startingAngle:gap/2,endingAngle:Math.PI*2-gap/2,innerRadius:0};
  wrap.appendChild(ring); ring.x=0; ring.y=0;
  const tri=figma.createPolygon(); tri.name='Triangle'; tri.pointCount=3;
  const ts=size*0.32; tri.resize(ts,ts); tri.rotation=90; tri.fills=S(BLUE);
  wrap.appendChild(tri); tri.x=size*0.5-ts*0.38; tri.y=size*0.5-ts*0.5;
  return wrap;
}
function shell(root,active,navRefs){
  const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:WHITE});
  const logoRow=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
  logoMark(logoRow,28);
  text(logoRow,'Clarion','Bold',19,INK);
  navRefs.logo=logoRow;
  const search=al(top,'HORIZONTAL',{name:'Search',px:14,gap:8,align:'CENTER',w:380,h:38,r:99,fill:LBLUE}); icon(search,16,'⌕',SUB); text(search,'Search tasks, classes, discussions','Regular',13,SUB);
  al(top,'HORIZONTAL',{name:'Spacer',fw:true});
  icon(top,28,'🔔',SUB);
  const pts=al(top,'HORIZONTAL',{name:'Points',px:12,py:6,gap:6,align:'CENTER',r:99,fill:LBLUE}); text(pts,'240 pts','Bold',13,PURPLE);
  circleEl(top,34,{fill:GR(LBLUE,LGREEN)});
  divider(root);
  const body=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});
  const side=al(body,'VERTICAL',{name:'Sidebar',w:224,fh:true,fill:SURFACE,pad:14,gap:2});
  const navItems=[['Dashboard','🏠'],['Discussions','💬'],['AI Helper','✨'],['Rewards','🏆']];
  for(const [n,g] of navItems){
    const a=n===active;
    const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:10,fill:a?BRAND:null});
    icon(it,18,g,a?WHITE:SUB); text(it,n,'Semi Bold',14,a?WHITE:INK);
    navRefs[n]=it;
  }
  al(side,'VERTICAL',{name:'Spacer',fh:true});
  const user=al(side,'HORIZONTAL',{name:'User',gap:10,align:'CENTER',px:6,py:6}); circleEl(user,32,{fill:GR(LBLUE,LGREEN)}); const ut=al(user,'VERTICAL',{gap:1}); text(ut,'Prithu S.','Semi Bold',13,INK); text(ut,'Student, Year 9','Regular',11,SUB);
  rectBox(body,{name:'V divider',w:1,fh:true,fill:LINE,stroke:null,r:0});
  const content=al(body,'VERTICAL',{name:'Content',px:32,py:28,gap:22,fw:true,fh:true,fill:SURFACE});
  return content;
}
function screenLabel(name,x,y){
  const label=text(page,name,'Semi Bold',26,INK); label.name='Label '+name; label.x=x; label.y=y-56;
  const sub=text(page,'Clarion · Desktop 1440x1024 · Final (Strand 4)','Regular',13,SUB); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
}
function newRoot(name,x,y){
  const root=frame('VERTICAL',{name,gap:0,fill:WHITE,stroke:LINE,sw:1,clip:true});
  page.appendChild(root); root.resize(1440,1024); root.x=x; root.y=y;
  root.primaryAxisSizingMode='FIXED'; root.counterAxisSizingMode='FIXED';
  return root;
}

// --- clean slate ---
const NAMES=['F1 · Sign in','F2 · Dashboard','F3 · AI Study Helper','F4 · Discussions','F5 · Road to Glory'];
const toRemove=[]; for(const n of NAMES) toRemove.push(n,'Label '+n,'Sub '+n);
for(const n of page.children.filter(c=>toRemove.includes(c.name))) n.remove();

const roots={}, refs={};
const X0=100, GAPX=1600, Y=220;

// ================= F1 · Sign in =================
{
  const NAME='F1 · Sign in', X=X0+0*GAPX;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y); roots[NAME]=root;
  root.layoutMode='HORIZONTAL'; root.itemSpacing=0;
  const left=al(root,'VERTICAL',{name:'Brand panel',w:600,fh:true,px:64,py:64,gap:32,fill:GR(LBLUE,LGREEN)});
  logoMark(left,48);
  text(left,'Everything for class, in one place.','Bold',34,INK,{w:460});
  const feats=al(left,'VERTICAL',{gap:12});
  for(const f of ['Tasks and deadlines across every class','An AI helper that knows your work','Discussions with teachers and classmates','Rewards for staying on track']){
    const row=al(feats,'HORIZONTAL',{gap:10,align:'CENTER'}); circleEl(row,8,{fill:BRAND,stroke:null}); text(row,f,'Regular',14,INK);
  }
  al(left,'VERTICAL',{name:'Illustration',w:472,h:180,r:16,fill:WHITE});
  const right=al(root,'VERTICAL',{name:'Right',fw:true,fh:true,align:'CENTER',justify:'CENTER',fill:WHITE});
  const card=al(right,'VERTICAL',{name:'Auth card',w:420,px:32,py:32,gap:20,r:16,stroke:LINE,fill:WHITE});
  const tabs=al(card,'HORIZONTAL',{name:'Tabs',gap:6,fw:true,fill:SURFACE,r:10,pad:4});
  const t1=al(tabs,'HORIZONTAL',{px:14,py:8,r:8,fill:BRAND,fw:true,justify:'CENTER'}); text(t1,'Sign in','Semi Bold',13,WHITE);
  const t2=al(tabs,'HORIZONTAL',{px:14,py:8,r:8,fw:true,justify:'CENTER'}); text(t2,'Join a class','Semi Bold',13,SUB);
  function fieldInput(label,placeholder){
    const w=al(card,'VERTICAL',{gap:6,fw:true}); text(w,label,'Semi Bold',12,SUB);
    const i=al(w,'HORIZONTAL',{px:12,py:10,r:10,stroke:LINE,fw:true}); text(i,placeholder,'Regular',14,SUB);
    return w;
  }
  fieldInput('Email','you@school.edu');
  fieldInput('Password','••••••••');
  btn(card,'Sign in',{primary:true,fw:true,justify:'CENTER',r:10});
  text(card,'New here? Ask your teacher for a class code.','Regular',12,SUB);
}

// ================= F2 · Dashboard =================
{
  const NAME='F2 · Dashboard', X=X0+1*GAPX;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y); roots[NAME]=root;
  const nav={}; refs[NAME]=nav;
  const content=shell(root,'Dashboard',nav);

  const hdr=al(content,'VERTICAL',{gap:2,fw:true}); text(hdr,'Good morning, Prithu','Bold',24,INK); text(hdr,'Here is what needs your attention today.','Regular',13,SUB);

  const stats=al(content,'HORIZONTAL',{name:'Stats',gap:14,fw:true});
  function statCard(label,value,tint,color){ const c=al(stats,'VERTICAL',{gap:4,px:18,py:16,r:14,fw:true,fill:tint}); text(c,value,'Bold',24,color||INK); text(c,label,'Regular',12,SUB); return c; }
  statCard('Total tasks','12',WHITE);
  statCard('Due this week','5',LBLUE,PURPLE);
  statCard('Overdue','1',WARM_BG,AMBER);
  statCard('Points','240',LGREEN,GREEN);

  const mid=al(content,'HORIZONTAL',{name:'Mid row',gap:20,fw:true,fh:true});
  const tasks=al(mid,'VERTICAL',{name:'Tasks card',gap:4,px:20,py:18,r:16,stroke:LINE,fill:WHITE,fw:true,fh:true});
  const th=al(tasks,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(th,'Your tasks','Bold',17,INK); chip(tasks,'5 due this week',{tint:LBLUE,color:PURPLE});
  divider(tasks);
  function taskRow(title,cls,due,state){
    const r=al(tasks,'HORIZONTAL',{gap:12,align:'CENTER',fw:true,py:10});
    rectBox(r,{w:18,h:18,r:5,fill:WHITE,stroke:LINE});
    const c=al(r,'VERTICAL',{gap:2,fw:true}); text(c,title,'Semi Bold',14,INK); text(c,cls,'Regular',12,SUB);
    chip(r,due,state==='overdue'?{tint:WARM_BG,color:AMBER}:state==='soon'?{tint:LBLUE,color:PURPLE}:{tint:GREEN_BG,color:GREEN});
    return r;
  }
  taskRow('Finish cell structure worksheet','Biology 9B','Overdue','overdue');
  divider(tasks);
  taskRow('Quadratics problem set','Maths 9','Due tomorrow','soon');
  divider(tasks);
  taskRow('Essay first draft','English 9','Due Friday','soon');
  divider(tasks);
  taskRow('Unit 2 source list','History 9','Done','done');

  const rightCol=al(mid,'VERTICAL',{name:'Right column',w:340,gap:16,fh:true});
  const cal=al(rightCol,'VERTICAL',{name:'Calendar',gap:10,px:18,py:16,r:16,stroke:LINE,fill:WHITE,fw:true}); text(cal,'This week','Bold',14,INK);
  const days=al(cal,'HORIZONTAL',{gap:6,fw:true});
  ['M','T','W','T','F','S','S'].forEach((d,i)=>{ const dc=al(days,'VERTICAL',{w:36,h:36,r:8,align:'CENTER',justify:'CENTER',fill:i===2?BRAND:null}); text(dc,d,'Semi Bold',12,i===2?WHITE:SUB); });
  const ai=al(rightCol,'VERTICAL',{name:'AI suggestion',gap:8,px:18,py:16,r:16,fill:GR(LBLUE,LGREEN),fw:true}); text(ai,'AI suggestion','Semi Bold',13,PURPLE); text(ai,'Start the Biology worksheet first, it is overdue.','Regular',13,INK,{fw:true});
  const disc=al(rightCol,'VERTICAL',{name:'Recent discussions',gap:10,px:18,py:16,r:16,stroke:LINE,fill:WHITE,fw:true}); text(disc,'Recent discussions','Bold',14,INK);
  const dr=al(disc,'HORIZONTAL',{gap:10,align:'CENTER',fw:true}); circleEl(dr,28,{fill:LBLUE}); const dc=al(dr,'VERTICAL',{gap:1,fw:true}); text(dc,'Ms Kaushal','Semi Bold',12,INK); text(dc,'Reminder: Friday test covers...','Regular',11,SUB);
}

// ================= F3 · AI Study Helper (winner: Wireframe 3, priority list) =================
{
  const NAME='F3 · AI Study Helper', X=X0+2*GAPX;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y); roots[NAME]=root;
  const nav={}; refs[NAME]=nav;
  const content=shell(root,'AI Helper',nav);

  const hdr=al(content,'VERTICAL',{gap:2,fw:true}); text(hdr,'Study Helper','Bold',24,INK); text(hdr,'Ask anything about your classes, tasks or notes.','Regular',13,SUB);

  const list=al(content,'VERTICAL',{name:'Priority list',gap:0,px:4,py:4,r:16,stroke:LINE,fill:WHITE,fw:true});
  function priRow(title,cls,tag,tone){
    const colors={urgent:[AMBER,WARM_BG],week:[PURPLE,LBLUE],done:[SUB,SURFACE]};
    const [bar,tint]=colors[tone];
    const r=al(list,'HORIZONTAL',{gap:14,align:'CENTER',fw:true,px:16,py:14});
    rectBox(r,{w:4,h:36,r:2,fill:bar,stroke:null});
    const c=al(r,'VERTICAL',{gap:2,fw:true}); text(c,title,'Semi Bold',14,tone==='done'?SUB:INK); text(c,cls,'Regular',12,SUB);
    chip(r,tag,{tint,color:bar});
    return r;
  }
  priRow('Biology test Friday, revise cell structure','Biology 9B','Urgent','urgent');
  divider(list);
  priRow('Quadratics problem set','Maths 9','This week','week');
  divider(list);
  priRow('Essay first draft feedback','English 9','This week','week');
  divider(list);
  priRow('Unit 2 source list','History 9','Done','done');

  const chatCard=al(content,'VERTICAL',{name:'Chat preview',gap:12,px:20,py:18,r:16,stroke:LINE,fill:WHITE,fw:true,fh:true});
  const bubbleRow=al(chatCard,'HORIZONTAL',{gap:12,fw:true});
  const mark=al(bubbleRow,'HORIZONTAL',{w:32,h:32,r:16,fill:BRAND,align:'CENTER',justify:'CENTER'}); logoMark(mark,20);
  const bubble=al(bubbleRow,'VERTICAL',{pad:14,gap:8,fw:true,r:14,fill:LBLUE}); text(bubble,'For Friday\'s Biology test, focus on the TFTP rule and the overall photosynthesis equation.','Regular',14,INK,{fw:true});
  al(chatCard,'VERTICAL',{name:'Spacer',fh:true});
  const askBar=al(chatCard,'HORIZONTAL',{px:16,py:12,gap:10,align:'CENTER',r:99,stroke:LINE,fw:true});
  icon(askBar,20,'✎',SUB); text(askBar,'Ask about Biology 9B...','Regular',14,SUB,{fw:true}); btn(askBar,'Send',{primary:true,py:8});
}

// ================= F4 · Discussions (winner: Wireframe 4, filterable inbox) =================
{
  const NAME='F4 · Discussions', X=X0+3*GAPX;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y); roots[NAME]=root;
  const nav={}; refs[NAME]=nav;
  const content=shell(root,'Discussions',nav);
  content.layoutMode='HORIZONTAL'; content.itemSpacing=0; content.paddingTop=0; content.paddingBottom=0; content.paddingLeft=0; content.paddingRight=0;

  const inbox=al(content,'VERTICAL',{name:'Thread inbox',w:360,fh:true,px:16,py:20,gap:12,fill:WHITE});
  text(inbox,'Discussions','Bold',20,INK);
  const search=al(inbox,'HORIZONTAL',{px:12,py:9,gap:8,align:'CENTER',r:10,fill:SURFACE,fw:true}); icon(search,16,'⌕',SUB); text(search,'Search threads','Regular',13,SUB,{fw:true});
  const chips=al(inbox,'HORIZONTAL',{gap:6,fw:true}); chip(chips,'All',{active:true}); chip(chips,'Unread'); chip(chips,'Pinned');
  divider(inbox);
  function threadRow(cls,title,snippet,time,unread,active){
    const r=al(inbox,'VERTICAL',{gap:4,fw:true,px:12,py:10,r:12,fill:active?LBLUE:null});
    const l1=al(r,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
    const l1l=al(l1,'HORIZONTAL',{gap:6,align:'CENTER'}); chip(l1l,cls,{tint:active?WHITE:SURFACE}); if(unread) circleEl(l1l,7,{fill:AMBER,stroke:null});
    text(l1,time,'Regular',11,SUB);
    text(r,title,'Semi Bold',13,INK,{fw:true});
    text(r,snippet,'Regular',12,SUB,{fw:true});
    return r;
  }
  threadRow('Biology 9B','# Q&A, Biology 9B','Reminder: Friday test covers cell structure.','10m',true,true);
  threadRow('Maths 9','# Quadratics help','Can someone explain completing the square?','40m',true,false);
  threadRow('English 9','# Essay drafts','Ms Kaushal posted feedback on the drafts.','2h',false,false);

  rectBox(content,{w:1,fh:true,fill:LINE,stroke:null,r:0});

  const pane=al(content,'VERTICAL',{name:'Thread pane',gap:16,fw:true,fh:true,px:28,py:24});
  const ph=al(pane,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(ph,'# Q&A, Biology 9B','Bold',20,INK); chip(ph,'Pinned',{tint:LBLUE,color:PURPLE});
  const feedCard=al(pane,'VERTICAL',{name:'Feed card',gap:12,fw:true,fh:true,px:20,py:16,r:16,stroke:LINE,fill:WHITE});
  function post(who,role,when,body){
    const r=al(feedCard,'HORIZONTAL',{gap:12,fw:true});
    circleEl(r,32,{fill:LBLUE});
    const c=al(r,'VERTICAL',{gap:4,fw:true});
    const l1=al(c,'HORIZONTAL',{gap:8,align:'CENTER'}); text(l1,who,'Semi Bold',13,INK); if(role) chip(l1,role,{active:role==='Teacher'}); text(l1,when,'Regular',11,SUB);
    text(c,body,'Regular',13,INK,{fw:true});
  }
  post('Ms Kaushal','Teacher','10 min ago','Reminder: the Friday test covers cell structure and photosynthesis only.');
  divider(feedCard);
  post('Ananya R.',null,'8 min ago','Do we need the light-dependent reactions in detail, or just the overall equation?');
  al(feedCard,'VERTICAL',{name:'Spacer',fh:true});
  const comp=al(feedCard,'HORIZONTAL',{gap:10,fw:true,align:'CENTER'}); circleEl(comp,28,{fill:LBLUE});
  const inp=al(comp,'HORIZONTAL',{px:12,py:8,gap:10,fw:true,r:99,stroke:LINE,align:'CENTER'}); text(inp,'Reply in Biology 9B...','Regular',13,SUB,{fw:true}); btn(inp,'Post',{primary:true,py:6,s:13});
}

// ================= F5 · Road to Glory (winner: Wireframe 2, streak strip) =================
{
  const NAME='F5 · Road to Glory', X=X0+4*GAPX;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y); roots[NAME]=root;
  const nav={}; refs[NAME]=nav;
  const content=shell(root,'Rewards',nav);

  const hdr=al(content,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:2}); text(hl,'Road to Glory','Bold',26,INK); text(hl,'Keep your streak going to unlock rewards.','Regular',13,SUB);
  chip(hdr,'240 pts, verified',{tint:LGREEN,color:GREEN});

  const streak=al(content,'VERTICAL',{name:'Streak strip',gap:12,px:20,py:18,r:16,stroke:LINE,fill:WHITE,fw:true});
  const sh=al(streak,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(sh,'This week\'s streak','Bold',15,INK); chip(sh,'4 day streak',{active:true});
  const week=al(streak,'HORIZONTAL',{gap:8,fw:true});
  [true,true,true,true,false,false,false].forEach((v,i)=>{ const d=al(week,'VERTICAL',{w:48,h:48,r:12,align:'CENTER',justify:'CENTER',fill:v?BRAND:SURFACE}); text(d,'MTWTFSS'[i],'Semi Bold',12,v?WHITE:SUB); });

  const mid=al(content,'HORIZONTAL',{gap:20,fw:true,fh:true});
  const badges=al(mid,'VERTICAL',{name:'Badges',gap:12,px:20,py:18,r:16,stroke:LINE,fill:WHITE,w:340}); text(badges,'Badges','Bold',15,INK);
  const brow=al(badges,'HORIZONTAL',{gap:12,fw:true});
  function badgeTile(label,unlocked){ const t=al(brow,'VERTICAL',{gap:8,px:14,py:14,r:2,align:'CENTER',fw:true,fill:unlocked?GR(LBLUE,LGREEN):SURFACE,stroke:unlocked?null:LINE,dash:unlocked?null:[4,3]}); rectBox(t,{w:40,h:40,r:2,fill:unlocked?BRAND:WHITE,stroke:unlocked?null:LINE}); text(t,label,'Semi Bold',11,unlocked?INK:SUB,{align:'CENTER'}); }
  badgeTile('Early bird',true); badgeTile('Perfect week',false);

  const redeem=al(mid,'VERTICAL',{name:'Redeem',gap:10,px:20,py:18,r:16,stroke:LINE,fill:WHITE,fw:true}); text(redeem,'Redeem','Bold',15,INK);
  function redeemRow(label,cost,can){ const r=al(redeem,'HORIZONTAL',{gap:12,align:'CENTER',fw:true,py:8}); const c=al(r,'VERTICAL',{gap:1,fw:true}); text(c,label,'Semi Bold',13,INK); text(c,cost+' pts','Regular',11,SUB); btn(r,can?'Redeem':'Locked',{primary:can,disabled:!can,py:6,s:12}); }
  redeemRow('Choose next class game',80,true);
  divider(redeem);
  redeemRow('Homework pass',150,false);
  divider(redeem);
  redeemRow('Custom theme unlock',220,false);

  const lb=al(content,'VERTICAL',{name:'Leaderboard',gap:10,px:20,py:18,r:16,stroke:LINE,fill:WHITE,fw:true});
  const lh=al(lb,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(lh,'Biology 9B leaderboard','Semi Bold',15,INK); chip(lh,'You: #3');
  function rankRow(rank,name,pts,me){ const r=al(lb,'HORIZONTAL',{gap:12,align:'CENTER',fw:true,py:8,px:me?10:0,r:me?10:0,fill:me?LBLUE:null}); const rc=al(r,'HORIZONTAL',{w:26,h:26,r:99,align:'CENTER',justify:'CENTER',fill:rank<=1?BRAND:SURFACE}); text(rc,String(rank+1),'Bold',12,rank<=1?WHITE:SUB); text(r,name,'Semi Bold',13,INK,{fw:true}); text(r,pts+' pts','Regular',12,SUB); }
  rankRow(0,'Ananya R.',310,false);
  rankRow(2,'Prithu S. (you)',240,true);
}

// --- wire sidebar nav + logo as clickable prototype links (Smart Animate) ---
const targetFor={'Dashboard':'F2 · Dashboard','Discussions':'F4 · Discussions','AI Helper':'F3 · AI Study Helper','Rewards':'F5 · Road to Glory'};
let wired=0, failed=0;
for(const screenName of Object.keys(refs)){
  const nav=refs[screenName];
  for(const [key,node] of Object.entries(nav)){
    const destName = key==='logo' ? 'F2 · Dashboard' : targetFor[key];
    if(!destName || !roots[destName]) continue;
    if(node.type!=='FRAME' || typeof node.setReactionsAsync!=='function') continue;
    try{
      await node.setReactionsAsync([{
        trigger:{type:'ON_CLICK'},
        actions:[{type:'NODE',destinationId:roots[destName].id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_IN_AND_OUT'},duration:0.3},preserveScrollPosition:false}]
      }]);
      wired++;
    }catch(e){ failed++; }
  }
}

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: 5 final screens built. ' + wired + ' nav links wired' + (failed?(', '+failed+' failed'):'') + '. ' + dashCount + ' em dashes replaced.');
return { ok:true, wired, failed };
