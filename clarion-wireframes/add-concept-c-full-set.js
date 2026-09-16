// Clarion AI wireframes: the FULL Concept C set (Timeline-first), applied consistently across
// the whole product, not just the Dashboard: AI Helper, Discussions, and Rewards all get a
// week-based organising strip as their throughline idea. Every screen gets numbered pins on the
// canvas, positioned fully inside their card from the start (6,6 inset) so they can't be clipped,
// each matching the row number in that screen's own spec panel below it.
// - Screen 14 (Dashboard, Timeline) already exists: this only ADDS pins to it by finding its
//   elements by name, it does not rebuild or move anything on that screen.
// - Screens 15-17 are built fresh with pins baked in.
// Purely additive to the rest of the file: does not touch screens 01-13 or their panels.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page,
// in the "Clarion AI, Wireframes" file (not Socratree Design).
// Safe to re-run: it deletes its own previous output (15-17 + their panels, and 14's pins/spec)
// first, then rebuilds.
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
function checkbox(parent,checked){
  const c=al(parent,'HORIZONTAL',{name:'Checkbox',w:18,h:18,stroke:K,r:4,fill:checked?K:W,align:'CENTER',justify:'CENTER'});
  if(checked) text(c,'✓','Bold',12,W);
  return c;
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
  badge.x=6; badge.y=6; // fully inside the card from the start, never clipped
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
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Concept C, timeline-first throughout','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
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
// compact week strip reused on every Concept C screen: 7 small day cells, today filled black,
// an optional small marker dot under a day that has something relevant that day
function weekStrip(parent,markDays){
  const strip=al(parent,'HORIZONTAL',{name:'Week strip',gap:6,fw:true});
  const days=[['Mon','14',true],['Tue','15',false],['Wed','16',false],['Thu','17',false],['Fri','18',false],['Sat','19',false],['Sun','20',false]];
  for(const [d,n,today] of days){
    const cell=al(strip,'VERTICAL',{name:'Day/'+d,gap:4,fw:true,align:'CENTER',px:8,py:8,r:8,fill:today?K:null,stroke:today?null:K});
    text(cell,d,'Semi Bold',11,today?W:K,{align:'CENTER'});
    text(cell,n,'Regular',10,today?W:G3,{align:'CENTER'});
    if(markDays[d]) rectBox(cell,{w:6,h:6,r:99,fill:today?W:K,stroke:null});
  }
  return strip;
}

// --- clean slate for screens 15-17 and for screen 14's pins/panel, so this is safe to re-run ---
const NAMES15_17=['15 · AI Helper, Timeline (Concept C)','16 · Discussions, Timeline (Concept C)','17 · Road to Glory, Timeline (Concept C)'];
const toRemove=[];
for(const n of NAMES15_17) toRemove.push(n,'Label '+n,'Sub '+n,'Spec · '+n);
for(const n of page.children.filter(c=>toRemove.includes(c.name))) n.remove();

// ================= pins onto the EXISTING screen 14 (Dashboard, Timeline) =================
{
  const root14=page.children.find(c=>c.name==='14 · Dashboard, Timeline (full)');
  if(root14){
    for(const n of root14.findAll(c=>/^Pin \d+$/.test(c.name))) n.remove();
    const byName=n=>root14.findOne(c=>c.name===n);
    const topBar=byName('Top bar');
    const stats=byName('Stats');
    const timeline=byName('Week timeline card');
    const daysRow=byName('Day columns');
    const mondayCol=root14.findOne(c=>c.name==='Day/Mon');
    const focusCard=byName('Todays focus card');
    const aiCard=byName('AI suggestion card');
    const discCard=byName('Recent discussions card');
    [[topBar||root14,1],[stats,2],[timeline,3],[daysRow,4],[mondayCol,5],[focusCard,7],[aiCard,8]].forEach(([n,i])=>pin(n,i));
    // row 6 in that spec panel is the footer note on the timeline card itself
    pin(timeline,6);
    figma.notify('Pins added to screen 14.');
  } else {
    figma.notify('Screen 14 not found, skipped its pins, it still needs to exist before this can pin it.');
  }
}

// ================= 15 · AI Helper, Timeline (Concept C) =================
{
  const NAME='15 · AI Helper, Timeline (Concept C)', X=100+14*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'AI Helper');
  content.layoutMode='HORIZONTAL'; content.itemSpacing=24;

  const left=al(content,'VERTICAL',{name:'Chat column',gap:16,fw:true,fh:true});
  const chdr=al(left,'VERTICAL',{gap:2}); text(chdr,'Study Helper','Bold',20,K); text(chdr,'Plans go straight onto this week\'s timeline instead of a separate calendar link.','Regular',12,G3);
  const bubbleRow=al(left,'HORIZONTAL',{name:'AI message',gap:12,fw:true});
  const mark=al(bubbleRow,'HORIZONTAL',{name:'AI avatar',w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',16,W);
  const bubble=al(bubbleRow,'VERTICAL',{name:'Bubble',pad:16,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(bubble,'Hi Prithu! You have a Biology test on Friday. Want a study plan spread across this week\'s free days?','Regular',14,K,{fw:true});
  const userRow=al(left,'HORIZONTAL',{name:'User message',gap:12,fw:true,justify:'MAX'});
  const userBubble=al(userRow,'VERTICAL',{name:'Bubble',pad:14,w:420,fill:K,r:12}); text(userBubble,'Yes please, I can do about an hour on the free days.','Regular',14,W,{w:392});
  circleEl(userRow,32);

  const planCard=al(left,'VERTICAL',{name:'Plan bubble',pad:16,gap:10,fw:true,stroke:K,r:12,fill:G1});
  text(planCard,'Study plan, added to your timeline','Semi Bold',15,K);
  const planTable=al(planCard,'VERTICAL',{name:'Plan table',gap:0,fw:true,stroke:K,r:8,fill:W,clip:true});
  const planRows=[['Tue','Photosynthesis flashcards, 40 min','Add to Tue'],['Wed','Practice quiz, unit 3, 45 min','Add to Wed'],['Sat','Light recap before the test, 30 min','Add to Sat']];
  planRows.forEach(([day,detail,label],i)=>{
    const r=al(planTable,'HORIZONTAL',{px:12,py:10,gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
    const l=al(r,'VERTICAL',{gap:2}); text(l,day,'Semi Bold',13,K); text(l,detail,'Regular',12,G3,{w:320});
    btn(r,label,{py:6,s:12});
    if(i<planRows.length-1) divider(planTable);
  });
  al(left,'VERTICAL',{name:'Spacer',fh:true});
  const askBar=al(left,'HORIZONTAL',{name:'Ask bar',px:16,py:12,gap:10,align:'CENTER',stroke:K,r:99,fill:W,fw:true});
  icon(askBar,20,'Ask icon'); text(askBar,'Ask questions...','Regular',14,G3,{fw:true}); btn(askBar,'Send',{primary:true,py:8});

  const right=al(content,'VERTICAL',{name:'Timeline panel',w:340,gap:16,fh:true,px:20,py:16,stroke:K,r:12,fill:W});
  text(right,'This week','Semi Bold',15,K);
  const strip=weekStrip(right,{Tue:true,Wed:true,Sat:true});
  text(right,'Dots mark days that already have a study session added from this chat.','Regular',11,G3,{fw:true});
  divider(right);
  text(right,'This week\'s plan','Semi Bold',13,K);
  for(const [day,detail] of [['Tue','Photosynthesis flashcards'],['Wed','Practice quiz, unit 3'],['Sat','Light recap']]){
    const r=al(right,'HORIZONTAL',{gap:8,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'}); text(r,day,'Semi Bold',12,K); text(r,detail,'Regular',12,G3);
  }

  pin(left,1); pin(bubbleRow,2); pin(userRow,3); pin(planTable,4); pin(askBar,5); pin(right,6); pin(strip,7);

  specPanel(NAME,[
   {rows:[
    'Left chat column: same message-bubble pattern as the main AI Study Helper screen (32px avatar, #F0F0F0 AI bubble, black user bubble), but the subtitle under the header sets the Concept C framing directly: plans attach to the week rather than a separate calendar.',
    'AI greeting and user reply: unchanged bubble styling, 12px radius, 1.5px stroke where relevant.',
    'User message bubble: black fill, white text, right-aligned, same as elsewhere in the product.',
    'Study plan table: corner radius 8px, 1.5px stroke, white fill, each row padded 12px/10px with a 1.5px divider. The key difference from the original AI Helper: every row ends in an "Add to [Day]" button instead of one generic "Add to calendar" button, since each entry targets a specific day on the strip on the right.',
    'Ask bar: pinned to the bottom of the column, 99px radius pill, 1.5px stroke, with a Send button.',
    'Timeline panel: fixed width 340px, corner radius 12px, 1.5px stroke, white fill; holds the week strip and a short summary list, so the student can see the whole week\'s plan without leaving the chat.',
    'Week strip: 7 compact day cells, 8px radius, today (Monday) filled solid black; a small dot marks a day that already has a study session, filling in as the student accepts suggestions from the chat.',
   ]},
  ], 100+14*1640, 220+1024+40, 1440);
}

// ================= 16 · Discussions, Timeline (Concept C) =================
{
  const NAME='16 · Discussions, Timeline (Concept C)', X=100+15*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Discussions');

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'# Q&A, Biology 9B','Bold',24,K); text(hl,'This week\'s activity is shown as a strip, so a missed day\'s announcement is never buried in a long scroll.','Regular',13,G3);
  chip(hdr,'Pinned (1)');

  const stripCard=al(content,'VERTICAL',{name:'Activity strip card',gap:10,fw:true,px:20,py:16,stroke:K,r:12,fill:W});
  text(stripCard,'This week\'s activity','Semi Bold',15,K);
  const strip=weekStrip(stripCard,{Mon:true,Wed:true});
  text(stripCard,'Monday: pinned test reminder. Wednesday: a student question and reply.','Regular',11,G3,{fw:true});

  const pinBar=al(content,'HORIZONTAL',{name:'Pinned bar',px:20,py:10,gap:10,fw:true,fill:G1,r:8,align:'CENTER'}); chip(pinBar,'PINNED',{dark:true}); text(pinBar,'Friday test covers unit 3 only, cell structure and photosynthesis, Ms Kaushal','Semi Bold',13,K,{fw:true});

  const feed=al(content,'VERTICAL',{name:'Feed',gap:16,fw:true,fh:true});
  function post(parent,who,role,when,body,replies,indent){
    const r=al(parent,'HORIZONTAL',{name:'Post',gap:12,fw:true,pl:indent||0});
    circleEl(r,36);
    const c=al(r,'VERTICAL',{gap:6,fw:true});
    const l1=al(c,'HORIZONTAL',{gap:8,align:'CENTER'}); text(l1,who,'Semi Bold',14,K); if(role) chip(l1,role,{dark:role==='Teacher'}); text(l1,when,'Regular',12,G3);
    text(c,body,'Regular',14,K,{fw:true});
    const a=al(c,'HORIZONTAL',{gap:16,align:'CENTER'}); text(a,replies,'Semi Bold',12,K); text(a,'Reply','Regular',12,G3); text(a,'Ask AI to summarise','Regular',12,G3);
    return r;
  }
  const p1=post(feed,'Ms Kaushal','Teacher','Mon, 10 min ago','Reminder: the Friday test covers cell structure and photosynthesis only.','12 replies');
  divider(feed);
  const p2=post(feed,'Ananya R.','Student','Wed, 8 min ago','Do we need the light-dependent reactions in detail, or just the overall equation?','3 replies');

  const comp=al(content,'HORIZONTAL',{name:'Composer',gap:10,fw:true,align:'CENTER'}); circleEl(comp,32);
  const inp=al(comp,'HORIZONTAL',{name:'Input',px:12,py:10,gap:10,fw:true,stroke:K,r:12,align:'CENTER'}); text(inp,'Reply in # Q&A...','Regular',14,G3,{fw:true}); btn(inp,'Post',{primary:true,py:8});

  pin(hdr,1); pin(stripCard,2); pin(strip,3); pin(pinBar,4); pin(p1,5); pin(p2,6); pin(inp,7);

  specPanel(NAME,[
   {rows:[
    'Header: "# Q&A, Biology 9B" 24px Bold, subtitle explains the Concept C framing directly, a strip instead of a scroll for finding what happened when.',
    'Activity strip card: corner radius 12px, 1.5px stroke, white fill; holds the week strip plus a one-line caption naming which days had activity and what kind.',
    'Week strip: same 7-cell component as the AI Helper and Dashboard Concept C screens for visual consistency; dots mark Monday (a pinned post) and Wednesday (a question and reply).',
    'Pinned bar: #F0F0F0 fill, 8px radius, a solid black PINNED chip, same styling as the main Discussions screen\'s pinned bar.',
    'Teacher post: 36px avatar, name, Teacher chip (solid black), timestamp now includes the day name (Mon, Wed) since the strip above references days directly.',
    'Student post and reply: same row pattern, no special styling difference from the main Discussions screen.',
    'Composer: 32px avatar, input at 12px radius with a 1.5px stroke, black Post button, unchanged from the rest of the product.',
   ]},
  ], 100+15*1640, 220+1024+40, 1440);
}

// ================= 17 · Road to Glory, Timeline (Concept C) =================
{
  const NAME='17 · Road to Glory, Timeline (Concept C)', X=100+16*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Rewards');

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Road to Glory','Bold',28,K); text(hl,'Your streak is shown as a week strip, not just a number, so a gap is visible before it becomes a habit.','Regular',14,G3);
  btn(hdr,'Redeem history');

  const streakCard=al(content,'VERTICAL',{name:'Streak strip card',gap:10,fw:true,px:20,py:16,stroke:K,r:12,fill:W});
  const sh=al(streakCard,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(sh,'This week\'s streak','Semi Bold',18,K); chip(sh,'6 days','dark');
  const strip=weekStrip(streakCard,{Mon:true,Tue:true,Wed:true,Thu:true,Fri:true,Sat:true});
  text(streakCard,'Each dot is a day verified by a teacher. Sunday has no dot yet, it is still to come.','Regular',12,G3,{fw:true});

  const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
  const left=al(main,'VERTICAL',{name:'Left column',gap:16,fw:true,fh:true});

  const badgeCard=al(left,'VERTICAL',{name:'Badges card',px:20,py:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  text(badgeCard,'Badges','Semi Bold',18,K);
  const bgrid=al(badgeCard,'HORIZONTAL',{name:'Badge grid',gap:12,fw:true});
  for(const [name,unlocked] of [['Perfect week',true],['30-day streak',false]]){
    const tile=al(bgrid,'VERTICAL',{name:'Badge/'+name,px:14,py:14,gap:6,align:'CENTER',justify:'CENTER',r:2,fw:true,fill:unlocked?W:G1,stroke:K,dash:unlocked?null:[4,3]});
    text(tile,name,'Semi Bold',13,K,{align:'CENTER'});
  }

  const redeem=al(left,'VERTICAL',{name:'Redeem card',px:20,py:16,gap:0,fw:true,stroke:K,r:12,fill:W,clip:true});
  text(redeem,'Redeem your points','Semi Bold',18,K);
  for(const [name,cost] of [['Streak freeze (skip a day)',60],['Gold avatar frame',40],['Darksword: +90 damage per turn',150]]){
    const r=al(redeem,'HORIZONTAL',{py:12,gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
    const rl=al(r,'VERTICAL',{gap:2}); text(rl,name,'Semi Bold',14,K); text(rl,cost+' pts','Regular',12,G3);
    btn(r,'Redeem',{primary:true,py:8,s:13});
    divider(redeem);
  }

  const right=al(main,'VERTICAL',{name:'Right column',w:340,gap:16,fh:true});
  const lead=al(right,'VERTICAL',{name:'Class leaderboard card',px:20,py:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  text(lead,'Class leaderboard','Semi Bold',16,K);
  for(const [rank,name,score,me] of [['1','Ananya R.',310,false],['2','Prithu S. (you)',240,true]]){
    const r=al(lead,'HORIZONTAL',{name:'Leader row',gap:10,fw:true,align:'CENTER',px:me?8:0,py:me?6:0,r:8,stroke:me?K:null});
    const rb=al(r,'HORIZONTAL',{w:26,h:26,r:99,fill:K,align:'CENTER',justify:'CENTER'}); text(rb,rank,'Bold',12,W);
    circleEl(r,26); text(r,name,me?'Semi Bold':'Regular',14,K,{fw:true}); text(r,String(score),'Bold',14,K);
  }
  const info=al(right,'VERTICAL',{name:'Why verified card',px:20,py:16,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(info,'Why teacher-verified?','Semi Bold',15,K);
  text(info,'Points can only be earned by finishing real classwork, confirmed by a teacher.','Regular',13,K,{fw:true});

  pin(streakCard,1); pin(strip,2); pin(badgeCard,3); pin(redeem,4); pin(lead,5); pin(info,6);

  specPanel(NAME,[
   {rows:[
    'Streak strip card: corner radius 12px, 1.5px stroke, white fill; header pairs "This week\'s streak" with a solid black "6 days" chip.',
    'Week strip: the same 7-cell component used on every Concept C screen; a filled dot on Monday through Saturday shows each already-verified day, Sunday is left blank since it has not happened yet, the gap itself is the point of this concept.',
    'Badges card: kept from the main Road to Glory screen but trimmed to 2 tiles to leave room for the streak strip as the new hero element; same 2px sharp-corner treatment, dashed stroke on the locked one.',
    'Redeem card: same reward list and button behaviour as the main Road to Glory screen, trimmed to 3 items, including the Darksword item.',
    'Class leaderboard: trimmed to the top 2 rows, same rank-badge and current-student-outline styling as the main Rewards screen.',
    'Why teacher-verified info card: unchanged copy and styling from the main Rewards screen, still the anti-gaming statement tying rewards back to teacher confirmation.',
   ]},
  ], 100+16*1640, 220+1024+40, 1440);
}

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: Concept C full set. Pins added to screen 14, screens 15-17 built with pins. ' + dashCount + ' em dashes replaced.');
return { ok: true };
