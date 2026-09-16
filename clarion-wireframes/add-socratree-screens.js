// Clarion AI wireframes: adds 5 NEW screens (06-10), rebranded from the SocraTree reference
// layouts into Clarion's black-and-white style: pure black/white/grey, rounded corners,
// dashed strokes for pending/locked states. Each screen gets its own detailed spec panel below.
// Purely additive: does NOT touch screens 01-05 or their spec panels in any way.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page.
// Safe to re-run: it deletes its own previous output (these 5 screens + their panels) first.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const K={r:0,g:0,b:0}, W={r:1,g:1,b:1}, G1={r:0.94,g:0.94,b:0.94}, G2={r:0.82,g:0.82,b:0.82}, G3={r:0.45,g:0.45,b:0.45};
const S=c=>[{type:'SOLID',color:c}];
const page=figma.currentPage;

// --- helpers (same as the rest of the file) ---
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
function input(parent,placeholder,opts={}){
  const b=al(parent,'HORIZONTAL',{name:'Input',px:opts.px??12,py:opts.py??10,gap:8,align:'CENTER',fill:W,stroke:K,r:opts.r??8,fw:opts.fw,w:opts.w,h:opts.h,justify:opts.justify});
  text(b,placeholder,'Regular',opts.s??14,G3);
  return b;
}
function icon(parent,d,name){
  d=d||20; name=name||'Icon';
  const f=al(parent,'HORIZONTAL',{name,w:d,h:d,stroke:K,r:4,fill:G1,align:'CENTER',justify:'CENTER'});
  text(f,'○','Regular',Math.round(d*0.5),G3);
  return f;
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
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Low-fidelity wireframe, adapted from SocraTree reference','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
}
function newRoot(name,x,y){
  const root=frame('VERTICAL',{name,gap:0,fill:W,stroke:K,sw:2,clip:true});
  page.appendChild(root); root.resize(1440,1024); root.x=x; root.y=y;
  root.primaryAxisSizingMode='FIXED'; root.counterAxisSizingMode='FIXED';
  return root;
}
const NAV_ITEMS=['Home','AI Helper','Deadlines','Reminders','Classes','Customisation','Games','Discussions','Assignments'];
function shell(root,active){
  const top=al(root,'HORIZONTAL',{name:'Top bar',px:24,gap:16,align:'CENTER',fw:true,h:64,fill:W});
  const logo=al(top,'HORIZONTAL',{name:'Logo',gap:10,align:'CENTER'});
  const mark=al(logo,'HORIZONTAL',{name:'Logo mark',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',18,W);
  text(logo,'Clarion AI','Bold',20,K);
  al(top,'HORIZONTAL',{name:'Spacer',fw:true});
  chip(top,'EN'); chip(top,'Aa'); icon(top,32,'Bell'); circleEl(top,36);
  divider(root);
  const body=al(root,'HORIZONTAL',{name:'Body',gap:0,fw:true,fh:true});
  const side=al(body,'VERTICAL',{name:'Sidebar',w:240,fh:true,fill:G1,px:16,py:16,gap:4});
  for(const n of NAV_ITEMS){ const a=n===active; const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:8,fill:a?K:null}); icon(it,18,'Icon'); text(it,n,'Regular',15,a?W:K); }
  al(side,'VERTICAL',{name:'Spacer',fh:true});
  const user=al(side,'HORIZONTAL',{name:'User',gap:10,align:'CENTER',px:4,py:6}); circleEl(user,32); const ut=al(user,'VERTICAL',{gap:2}); text(ut,'Prithu S.','Semi Bold',14,K); text(ut,'Student, Year 9','Regular',12,G3);
  rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});
  const content=al(body,'VERTICAL',{name:'Content',px:32,py:32,gap:24,fw:true,fh:true});
  return content;
}

// --- 1. clean slate for just these 5 screens, so this is safe to re-run ---
const NAMES=['06 · Welcome','07 · Overview','08 · Ask Clarion','09 · Games','10 · Discussions'];
const toRemove=[];
for(const n of NAMES) toRemove.push(n,'Label '+n,'Sub '+n,'Spec · '+n);
for(const n of page.children.filter(c=>toRemove.includes(c.name))) n.remove();

// ================= 06 · Welcome (splash) =================
{
  const NAME='06 · Welcome', X=100+5*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Home');
  content.counterAxisAlignItems='CENTER'; content.primaryAxisAlignItems='CENTER'; content.fills=S(W);

  const centre=al(content,'VERTICAL',{name:'Welcome centre',gap:20,align:'CENTER',w:640});
  const mark=al(centre,'HORIZONTAL',{name:'Big mark',w:64,h:64,fill:K,r:16,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',32,W);
  text(centre,'Clarion AI','Bold',44,K,{align:'CENTER'});
  text(centre,'Growth in every step.','Regular',18,G3,{align:'CENTER'});
  const askBar=al(centre,'HORIZONTAL',{name:'Ask bar',px:20,py:14,gap:10,align:'CENTER',stroke:K,r:99,fill:W,w:520});
  icon(askBar,20,'Ask icon'); text(askBar,'Ask Clarion anything...','Regular',15,G3,{fw:true});
  const helperRow=al(centre,'HORIZONTAL',{name:'Helper row',gap:10,align:'CENTER'});
  circleEl(helperRow,28); chip(helperRow,'Invite a classmate'); icon(helperRow,28,'Help');

  specPanel(NAME,[
   {rows:[
    'Frame: 1440 x 1024px, same top bar and sidebar shell as the rest of the product, with Home set as the active nav item.',
    'Content area is centred both ways instead of left-aligned, since this is a one-off landing moment rather than a working screen.',
    'Big mark: 64 x 64px black square, corner radius 16px, white "C" at 32px Bold; the same logo mark used everywhere else, scaled up.',
    'Wordmark: "Clarion AI" 44px Bold black, centred.',
    'Tagline: "Growth in every step." 18px Regular grey #737373, centred, adapted directly from the SocraTree reference.',
    'Ask bar: 520px wide, 99px radius pill, 1.5px black stroke, 20px/14px padding, placeholder "Ask Clarion anything..." 15px grey with a leading search-style icon.',
    'Helper row: a 28px avatar, an "Invite a classmate" pill chip, and a help icon, mirroring the small icon row under the input in the original reference.',
   ]},
  ], 100+5*1640, 220+1024+40, 1440);
}

// ================= 07 · Overview =================
{
  const NAME='07 · Overview', X=100+6*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Home');

  text(content,'Overview','Bold',28,K);

  const stats=al(content,'HORIZONTAL',{name:'Stat row',gap:16,fw:true});
  const s1=al(stats,'VERTICAL',{name:'Stat/Deadlines',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W}); text(s1,'Deadlines','Regular',13,G3); text(s1,'3 upcoming','Bold',20,K); text(s1,'next one in 2 days','Regular',12,G3);
  const s2=al(stats,'VERTICAL',{name:'Stat/Reminders',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W}); text(s2,'Reminders','Regular',13,G3); text(s2,'2 active','Bold',20,K); text(s2,'set by your teachers','Regular',12,G3);
  const s3=al(stats,'VERTICAL',{name:'Stat/Performance',px:16,py:16,gap:6,fw:true,stroke:K,r:12,fill:W}); text(s3,'Performance','Regular',13,G3); text(s3,'78%','Bold',20,K); text(s3,'average this term','Regular',12,G3);

  const discCard=al(content,'VERTICAL',{name:'Discussions preview card',px:20,py:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  const dh=al(discCard,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(dh,'Discussions','Semi Bold',18,K); text(dh,'Open','Semi Bold',12,K);
  const dRow=al(discCard,'HORIZONTAL',{gap:10,fw:true,align:'MIN'}); circleEl(dRow,32); const dm=al(dRow,'VERTICAL',{gap:2,fw:true}); text(dm,'Ms Aarti Moon','Semi Bold',13,K); text(dm,'It\'s coming close to time for a good research question, so make sure you\'re on track for the upcoming SA.','Regular',13,K,{w:520});

  const notesCard=al(content,'VERTICAL',{name:'Quick study notes card',px:20,py:16,gap:12,fw:true,stroke:K,r:12,fill:W,fh:true});
  text(notesCard,'Quick study notes','Semi Bold',18,K);
  const notesRow=al(notesCard,'HORIZONTAL',{gap:12,fw:true});
  for(const [subj,note] of [['English','Annotate quotes before the essay'],['History','Use the TFTP rule for sources'],['Maths','Show full working for every step'],['Science','Label diagrams, always']]){
    const c=al(notesRow,'VERTICAL',{name:'Note/'+subj,px:14,py:14,gap:8,fw:true,stroke:K,r:12,fill:W});
    text(c,subj,'Semi Bold',14,K); text(c,note,'Regular',12,G3,{fw:true}); btn(c,'View',{py:6,s:12,fw:true});
  }

  specPanel(NAME,[
   {rows:[
    'Frame: same shell as the rest of the product; sidebar Home is active since this is the landing dashboard.',
    'Page title "Overview" 28px Bold sits above the content, matching the header pattern used on every other screen.',
    'Stat row: 3 equal cards, 16px padding, corner radius 12px, 1.5px black stroke: Deadlines, Reminders, Performance. Value text 20px Bold, smaller than the Dashboard screen\'s 28px since these are secondary summaries here rather than the page\'s main focus.',
    'Discussions preview card: corner radius 12px, 1.5px black stroke; a single most-recent post shown as a 32px avatar plus name and message, "Open" link in the header to go to the full Discussions screen.',
    'Quick study notes card: corner radius 12px, fills remaining height; four subject sub-cards in a row (English, History, Maths, Science), each with a one-line study tip and a "View" button, corner radius 12px, 14px padding, directly adapted from the reference\'s subject-card row.',
   ]},
  ], 100+6*1640, 220+1024+40, 1440);
}

// ================= 08 · Ask Clarion =================
{
  const NAME='08 · Ask Clarion', X=100+7*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'AI Helper');
  content.layoutMode='HORIZONTAL'; content.gap=24;

  const left=al(content,'VERTICAL',{name:'Chat column',gap:16,fw:true,fh:true});
  text(left,'Clarion AI','Bold',20,K);
  const bubbleRow=al(left,'HORIZONTAL',{name:'AI message',gap:12,fw:true});
  const mark=al(bubbleRow,'HORIZONTAL',{name:'AI avatar',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',16,W);
  const bubble=al(bubbleRow,'VERTICAL',{name:'Bubble',pad:16,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(bubble,'In today\'s history lesson we covered the TFTP rule. It will help you form a strong research question ahead of the SA. Try Topic, Fact, Time and Place: once you can name all four for your source, you\'re ready to write your question.','Regular',14,K,{fw:true});
  al(left,'VERTICAL',{name:'Spacer',fh:true});
  const askBar=al(left,'HORIZONTAL',{name:'Ask bar',px:16,py:12,gap:10,align:'CENTER',stroke:K,r:99,fill:W,fw:true});
  icon(askBar,20,'Ask icon'); text(askBar,'Ask questions...','Regular',14,G3,{fw:true}); btn(askBar,'Send',{primary:true,py:8});

  const right=al(content,'VERTICAL',{name:'Topic panel',w:400,gap:12,fh:true,px:20,py:16,stroke:K,r:12,fill:W});
  text(right,'Topic','Semi Bold',13,G3);
  text(right,'History research, All History','Bold',20,K);
  chip(right,'Source: Ms Aarti Moon, 3rd May');
  text(right,'A good research question names a clear topic, a checkable fact, and a time and place. Aim for a question you could answer with primary sources from class.','Regular',14,K,{fw:true});
  btn(right,'Elaborate',{fw:true,py:10});

  specPanel(NAME,[
   {rows:[
    'Frame: same shell as the rest of the product; sidebar AI Helper is active. Unlike the Study Helper screen, this is a single focused query rather than a multi-chat history, adapted from the reference\'s simpler two-panel layout.',
    'Left chat column: header "Clarion AI" 20px Bold; one AI message bubble (32px avatar, #F0F0F0 fill, 12px radius, 16px padding); an ask bar pinned to the bottom, 99px radius pill, 1.5px stroke, with a Send button.',
    'Right topic panel: fixed width 400px, corner radius 12px, 1.5px stroke, white fill; small "Topic" label, a bold title, a source chip naming the teacher and date, a summary paragraph, and a full-width "Elaborate" button, the wireframe expression of the reference\'s persistent side card.',
   ]},
  ], 100+7*1640, 220+1024+40, 1440);
}

// ================= 09 · Games =================
{
  const NAME='09 · Games', X=100+8*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Games');

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  text(hdr,'Games','Bold',28,K);
  const search=al(hdr,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:280,h:40,stroke:K,r:99,fill:W}); icon(search,18,'Search icon'); text(search,'Search games...','Regular',14,G3);

  const grid=al(content,'VERTICAL',{name:'Game grid',gap:16,fw:true});
  const row1=al(grid,'HORIZONTAL',{gap:16,fw:true});
  const row2=al(grid,'HORIZONTAL',{gap:16,fw:true});
  function gameTile(parent,name,sub,locked){
    const t=al(parent,'VERTICAL',{name:'Game/'+name,px:20,py:20,gap:6,fw:true,fh:true,stroke:K,r:12,fill:locked?G1:W,dash:locked?[4,3]:null});
    text(t,name,'Semi Bold',18,K); text(t,sub,'Regular',12,G3,{fw:true});
    return t;
  }
  gameTile(row1,'Tug of War','Class vs class, points on the line');
  gameTile(row1,'Two Player Games','Challenge a classmate');
  gameTile(row2,'Quizzes','Practice questions, instant feedback');
  gameTile(row2,'Firefighter','Coming soon', true);

  specPanel(NAME,[
   {rows:[
    'Frame: same shell as the rest of the product; sidebar Games is active.',
    'Header: "Games" 28px Bold on the left, a 280 x 40px search bar (99px radius pill) on the right, placeholder "Search games...".',
    'Game grid: 2 x 2 tiles, 16px gap, each tile fills equal width and height, corner radius 12px, 20px padding.',
    'Available tiles (Tug of War, Two Player Games, Quizzes): white fill, solid 1.5px black stroke, name 18px Semi Bold, one-line description 12px grey.',
    'Locked tile (Firefighter): #F0F0F0 fill, dashed 4,3 stroke instead of solid, the same locked treatment used for badges on Road to Glory, subtitle reads "Coming soon".',
   ]},
  ], 100+8*1640, 220+1024+40, 1440);
}

// ================= 10 · Discussions (simple feed) =================
{
  const NAME='10 · Discussions', X=100+9*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Discussions');

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  text(hdr,'Discussions','Bold',28,K);
  const search=al(hdr,'HORIZONTAL',{name:'Search',px:12,gap:8,align:'CENTER',w:280,h:40,stroke:K,r:99,fill:W}); icon(search,18,'Search icon'); text(search,'Search discussions...','Regular',14,G3);

  const feed=al(content,'VERTICAL',{name:'Feed',gap:16,fw:true});
  function post(parent,title,body,when){
    const p=al(parent,'VERTICAL',{name:'Post/'+title,px:20,py:16,gap:8,fw:true,stroke:K,r:12,fill:W});
    const top=al(p,'HORIZONTAL',{gap:10,align:'CENTER',fw:true}); circleEl(top,32); const m=al(top,'VERTICAL',{gap:2,fw:true}); const l1=al(m,'HORIZONTAL',{gap:8,align:'CENTER'}); text(l1,'Ms Aarti Moon','Semi Bold',13,K); chip(l1,'Teacher',{dark:true}); text(m,'Uploaded '+when,'Regular',11,G3);
    text(p,title,'Bold',16,K);
    text(p,body,'Regular',14,K,{fw:true});
    const foot=al(p,'HORIZONTAL',{gap:16,align:'CENTER'}); text(foot,'Reply','Regular',12,G3); text(foot,'React','Regular',12,G3); text(foot,'Ask AI to summarise','Regular',12,G3);
    return p;
  }
  post(feed,'TFTP RULE PRACTICE','Hello students, today in class we practised the TFTP rule, which will help you make a good research question and prior points for the upcoming SA. Try TFTP: Topic, Fact, Time and Place. Please apply this rule, aiming for at least a 70% correct rate on the practice set.','23rd May');
  post(feed,'SA REMINDER','Hope you all prepared for your Summative Assessment tomorrow at the back of your mind! Come with a fully charged laptop tomorrow.','3rd May');

  specPanel(NAME,[
   {rows:[
    'Frame: same shell as the rest of the product; sidebar Discussions is active. A simpler single-feed layout than the Class Discussions screen, with no channel list or class panel, adapted directly from the reference.',
    'Header: "Discussions" 28px Bold plus a 280 x 40px search bar, placeholder "Search discussions...".',
    'Post card: corner radius 12px, 1.5px black stroke, white fill, 20px/16px padding. Header row is a 32px avatar, teacher name 13px Semi Bold, a solid black Teacher chip, and "Uploaded [date]" 11px grey underneath.',
    'Post title: 16px Bold, in capitals in the source content ("TFTP RULE PRACTICE", "SA REMINDER") to read as an announcement heading.',
    'Post body: 14px Regular, full width.',
    'Footer row: "Reply", "React", "Ask AI to summarise" 12px grey links, matching the footer pattern used on the Class Discussions screen.',
   ]},
  ], 100+9*1640, 220+1024+40, 1440);
}

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: 5 new Clarion screens (06-10) added with spec panels, ' + dashCount + ' em dashes replaced.');
return { ok: true };
