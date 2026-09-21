// Clarion AI wireframes: Concept D (filterable inbox), a 4th design idea distinct from the
// other three: A groups by status in lanes, B groups by class in tabs, C lays everything out on
// a weekly timeline. D drops grouping chrome entirely and uses one flat, searchable, filterable
// list (like an email inbox) on the left with a detail pane on the right, sorted by recency
// instead of by class or status.
// Only builds AI Study Helper (24) and Discussions (25), since Dashboard and Road to Glory for
// this concept already exist elsewhere per the request.
// Pins use the same corner-hang style as build-wireframes.js (default -10,-10, hanging just
// outside the target's top-left corner) with clipsContent turned off on the full ancestor chain,
// so badges never sit on top of button/label text.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page,
// in the "Clarion AI, Wireframes" file. Safe to re-run: it deletes its own previous output first.
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
// Pin badge: hangs just outside the target's top-left corner by default (never on top of its
// label), with clipsContent turned off on the full ancestor chain so the overhang always renders.
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
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Concept D, filterable inbox','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
}
function newRoot(name,x,y){
  const root=frame('VERTICAL',{name,gap:0,fill:W,stroke:K,sw:2,clip:false});
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
function searchBar(parent,placeholder){
  const s=al(parent,'HORIZONTAL',{name:'Inbox search',px:12,py:9,gap:8,align:'CENTER',stroke:K,r:8,fill:W,fw:true});
  icon(s,16,'Search icon'); text(s,placeholder,'Regular',13,G3,{fw:true});
  return s;
}
function filterChips(parent,names,active){
  const row=al(parent,'HORIZONTAL',{name:'Filter chips',gap:6,fw:true});
  for(const n of names) chip(row,n,{dark:n===active});
  return row;
}

// --- clean slate for screens 24-25 ---
const NAMES=['24 · AI Study Helper, Filterable inbox (Concept D)','25 · Discussions, Filterable inbox (Concept D)'];
const toRemove=[];
for(const n of NAMES) toRemove.push(n,'Label '+n,'Sub '+n,'Spec · '+n);
for(const n of page.children.filter(c=>toRemove.includes(c.name))) n.remove();

// ================= 24 · AI Study Helper, Filterable inbox (Concept D) =================
{
  const NAME='24 · AI Study Helper, Filterable inbox (Concept D)', X=100+23*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'AI Helper');
  content.layoutMode='HORIZONTAL'; content.itemSpacing=0; content.paddingTop=0; content.paddingBottom=0; content.paddingLeft=0; content.paddingRight=0;

  const inbox=al(content,'VERTICAL',{name:'Conversation inbox',w:340,fh:true,px:16,py:20,gap:12,fill:G1});
  const ih=al(inbox,'VERTICAL',{gap:4,fw:true}); text(ih,'Study Helper','Bold',20,K); text(ih,'Every class conversation in one searchable, filterable list, sorted by recency instead of split into tabs or a weekly grid.','Regular',12,G3);
  const sBar=searchBar(inbox,'Search all conversations...');
  const chips=filterChips(inbox,['All','Unread','Flagged','By class'],'All');
  divider(inbox);
  function convoRow(parent,cls,preview,time,unread,active){
    const r=al(parent,'VERTICAL',{name:'Convo/'+cls,gap:4,fw:true,px:12,py:10,r:8,fill:active?W:null,stroke:active?K:null});
    const l1=al(r,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
    const l1l=al(l1,'HORIZONTAL',{gap:6,align:'CENTER'}); chip(l1l,cls); if(unread) circleEl(l1l,8,{fill:K,stroke:K});
    text(l1,time,'Regular',11,G3);
    text(r,preview,'Regular',12,unread?K:G3,{fw:true});
    return r;
  }
  const convos=[
    ['Biology 9B','Study plan, Bio test Fri: focus on TFTP rule and photosynthesis.','2m',true,true],
    ['Maths 9','Flashcards: Quadratics, 12 cards ready to review.','1h',true,false],
    ['English 9','Doubt: thesis statement for the essay draft.','Yesterday',false,false],
    ['History 9','Summarise my week: 3 tasks covered, 1 overdue.','Yesterday',false,false],
    ['Biology 9B','Prioritise my week: test Friday takes priority.','2d',false,false],
  ];
  const rows=[]; for(const [c,p,t,u,a] of convos) rows.push(convoRow(inbox,c,p,t,u,a));

  rectBox(content,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});

  const chat=al(content,'VERTICAL',{name:'Chat pane',gap:16,fw:true,fh:true,px:28,py:28});
  const chdr=al(chat,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const chl=al(chdr,'VERTICAL',{gap:4}); text(chl,'Study plan, Bio test Fri','Bold',20,K); chip(chl,'Biology 9B');
  chip(chdr,'Knows your classes, tasks and notes');
  divider(chat);
  const bubbleRow=al(chat,'HORIZONTAL',{name:'AI message',gap:12,fw:true});
  const mark=al(bubbleRow,'HORIZONTAL',{name:'AI avatar',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',16,W);
  const bubble=al(bubbleRow,'VERTICAL',{name:'Bubble',pad:14,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(bubble,'For Friday\'s Biology test, focus on the TFTP rule and the overall photosynthesis equation.','Regular',14,K,{fw:true});
  const actions=al(chat,'HORIZONTAL',{name:'Quick actions',gap:8,fw:true}); btn(actions,'Make a study plan'); btn(actions,'Generate flashcards'); btn(actions,'Ask a doubt');
  al(chat,'VERTICAL',{name:'Spacer',fh:true});
  const askBar=al(chat,'HORIZONTAL',{name:'Ask bar',px:16,py:12,gap:10,align:'CENTER',stroke:K,r:99,fill:W,fw:true});
  icon(askBar,20,'Ask icon'); text(askBar,'Ask about Biology 9B...','Regular',14,G3,{fw:true}); btn(askBar,'Send',{primary:true,py:8});

  pin(ih,1); pin(sBar,2); pin(chips,3); pin(inbox,4); pin(rows[0],5); pin(chdr,6); pin(bubbleRow,7); pin(actions,8); pin(askBar,9);

  specPanel(NAME,[
   {rows:[
    'Header: "Study Helper" 20px Bold, subtitle explains the concept: one searchable inbox instead of tabs, lanes, or a timeline.',
    'Search bar: plain text input, 8px radius, placeholder "Search all conversations...".',
    'Filter chips: All / Unread / Flagged / By class, pill row, the active filter filled black.',
    'Conversation inbox: fixed 340px sidebar, grey fill, list sorted by recency (most recent conversation first), not grouped by class.',
    'Conversation row: class tag chip, one-line message preview, relative time, a filled dot for unread; the open conversation gets a white card with a border.',
    'Chat pane header: thread title plus a class tag chip, and a chip describing what the AI already knows.',
    'AI message bubble: 32px avatar, grey bubble, 12px radius.',
    'Quick actions: Make a study plan / Generate flashcards / Ask a doubt, plain button row.',
    'Ask bar: bottom pill input, placeholder names the open conversation\'s class.',
   ]},
  ], 100+23*1640, 220+1024+40, 1440);
}

// ================= 25 · Discussions, Filterable inbox (Concept D) =================
{
  const NAME='25 · Discussions, Filterable inbox (Concept D)', X=100+24*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Discussions');
  content.layoutMode='HORIZONTAL'; content.itemSpacing=0; content.paddingTop=0; content.paddingBottom=0; content.paddingLeft=0; content.paddingRight=0;

  const inbox=al(content,'VERTICAL',{name:'Thread inbox',w:380,fh:true,px:16,py:20,gap:12,fill:G1});
  const ih=al(inbox,'VERTICAL',{gap:4,fw:true}); text(ih,'Discussions','Bold',20,K); text(ih,'Every thread across every class in one filterable list, instead of split by tabs, lanes, or a weekly strip.','Regular',12,G3);
  const sBar=searchBar(inbox,'Search all threads...');
  const chips=filterChips(inbox,['All classes','Unread','Pinned','From teacher'],'All classes');
  divider(inbox);
  function threadRow(parent,cls,title,snippet,replies,time,unread,active){
    const r=al(parent,'VERTICAL',{name:'Thread/'+title,gap:4,fw:true,px:12,py:10,r:8,fill:active?W:null,stroke:active?K:null});
    const l1=al(r,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
    const l1l=al(l1,'HORIZONTAL',{gap:6,align:'CENTER'}); chip(l1l,cls); if(unread) circleEl(l1l,8,{fill:K,stroke:K});
    text(l1,time,'Regular',11,G3);
    text(r,title,'Semi Bold',13,K,{fw:true});
    text(r,snippet+' · '+replies+' replies','Regular',12,G3,{fw:true});
    return r;
  }
  const threads=[
    ['Biology 9B','# Q&A, Biology 9B','Reminder: Friday test covers cell structure and photosynthesis.','6','10m',true,true],
    ['Maths 9','# Quadratics help','Can someone explain completing the square again?','3','40m',true,false],
    ['English 9','# Essay drafts','Ms Kaushal posted feedback on the first drafts.','9','2h',false,false],
    ['History 9','# Unit 2 sources','Pinned: primary source list for the unit 2 essay.','2','Yesterday',false,false],
  ];
  const rows=[]; for(const [c,t,s,r,tm,u,a] of threads) rows.push(threadRow(inbox,c,t,s,r,tm,u,a));

  rectBox(content,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});

  const feedCol=al(content,'VERTICAL',{name:'Thread pane',gap:16,fw:true,fh:true,px:28,py:28});
  const fh=al(feedCol,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(fh,'# Q&A, Biology 9B','Bold',22,K); chip(fh,'Pinned (1)');
  const feedCard=al(feedCol,'VERTICAL',{name:'Feed card',gap:12,fw:true,fh:true,px:20,py:16,stroke:K,r:12,fill:W,clip:true});
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

  pin(ih,1); pin(sBar,2); pin(chips,3); pin(inbox,4); pin(rows[0],5); pin(fh,6); pin(feedCard,7); pin(inp,8);

  specPanel(NAME,[
   {rows:[
    'Header: "Discussions" 20px Bold, subtitle explains the concept: one filterable list of every thread instead of splitting by class or status.',
    'Search bar: plain text input, 8px radius, placeholder "Search all threads...".',
    'Filter chips: All classes / Unread / Pinned / From teacher, pill row, the active filter filled black.',
    'Thread inbox: fixed 380px sidebar, grey fill, list sorted by recency across every class.',
    'Thread row: class tag chip, thread title, one-line snippet with reply count, relative time, a filled dot for unread; the open thread gets a white card with a border.',
    'Thread header: "# Q&A, Biology 9B" plus a Pinned count chip.',
    'Feed card: teacher and student posts, same avatar and chip pattern as the other concepts.',
    'Composer: bottom input pinned to the open thread\'s class.',
   ]},
  ], 100+24*1640, 220+1024+40, 1440);
}

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: Concept D built. Screens 24 (AI Study Helper) and 25 (Discussions). ' + dashCount + ' em dashes replaced.');
return { ok: true };
