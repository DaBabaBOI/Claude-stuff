// Clarion AI wireframes: the FULL Concept A set (Status board), applied consistently across the
// whole product, not just the Dashboard: AI Helper, Discussions, and Rewards all get a
// status-lane layout as their throughline idea, instead of the time-based (Concept C) or
// class-based (Concept B) organisation.
// - Screen 11 (Dashboard, Concept A sketch) already exists: this only ADDS pins to it by finding
//   its elements by name, it does not rebuild or move anything on that screen.
// - Screens 18-20 are built fresh with pins baked in, 6px inside their card from the start.
// Purely additive to the rest of the file: does not touch screens 01-17 or their panels.
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
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Concept A, status-first throughout','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
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
// shared status-lane row: N lanes side by side, each a header + stacked cards
function laneBoard(parent,lanes){
  const board=al(parent,'HORIZONTAL',{name:'Status board',gap:16,fw:true,fh:true});
  const laneFrames=[];
  for(const [name,count,warn,cards] of lanes){
    const lane=al(board,'VERTICAL',{name:'Lane/'+name,gap:12,fw:true,fh:true,px:14,py:14,stroke:K,r:12,fill:warn?G1:W,dash:warn?[4,3]:null});
    const lh=al(lane,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(lh,name,'Semi Bold',15,K); chip(lh,String(count),{dark:warn});
    const cardFrames=[];
    for(const [title,sub] of cards){
      const card=al(lane,'VERTICAL',{name:'Card',gap:6,fw:true,px:12,py:12,stroke:K,r:10,fill:W});
      text(card,title,'Semi Bold',13,K,{fw:true}); text(card,sub,'Regular',11,G3);
      cardFrames.push(card);
    }
    laneFrames.push({lane,cardFrames});
  }
  return {board,laneFrames};
}

// --- clean slate for screens 18-20 and for screen 11's pins/panel ---
const NAMES=['18 · AI Helper, Status board (Concept A)','19 · Discussions, Status board (Concept A)','20 · Road to Glory, Status board (Concept A)'];
const toRemove=[];
for(const n of NAMES) toRemove.push(n,'Label '+n,'Sub '+n,'Spec · '+n);
for(const n of page.children.filter(c=>toRemove.includes(c.name))) n.remove();

// ================= pins onto the EXISTING screen 11 (Dashboard, Concept A sketch) =================
{
  const root11=page.children.find(c=>c.name==='11 · Dashboard concept A, Status board');
  if(root11){
    for(const n of root11.findAll(c=>/^Pin \d+$/.test(c.name))) n.remove();
    const byName=n=>root11.findOne(c=>c.name===n);
    const boardFrame=byName('Status board');
    const overdueLane=root11.findOne(c=>c.name==='Lane/Overdue');
    const doneLane=root11.findOne(c=>c.name==='Lane/Done');
    const cal=byName('Calendar card');
    const ai=byName('AI suggestion card');
    [[boardFrame,2],[overdueLane,3],[doneLane,4],[cal,5],[ai,6]].forEach(([n,i])=>pin(n,i));
    figma.notify('Pins added to screen 11.');
  } else {
    figma.notify('Screen 11 not found, skipped its pins.');
  }
}

// ================= 18 · AI Helper, Status board (Concept A) =================
{
  const NAME='18 · AI Helper, Status board (Concept A)', X=100+17*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'AI Helper');

  const chdr=al(content,'VERTICAL',{gap:4,fw:true}); text(chdr,'Study Helper','Bold',24,K); text(chdr,'Every suggestion the AI makes lands in a status lane, so you can see what is urgent without reading the chat.','Regular',13,G3);

  const {board,laneFrames}=laneBoard(content,[
   ['Urgent',1,true,[['Finish the worksheet before it costs points','Cell structure worksheet, Biology 9B']]],
   ['This week',2,false,[['Photosynthesis flashcards','Suggested tonight, 40 min'],['Practice quiz, unit 3','Suggested for Wednesday']]],
   ['Later',1,false,[['Poetry essay outline','Not due until Thursday']]],
   ['Done',1,false,[['Map quiz revision','Completed and verified']]],
  ]);

  const chatCard=al(content,'VERTICAL',{name:'Chat preview card',px:20,py:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  const ch=al(chatCard,'HORIZONTAL',{gap:12,fw:true,align:'CENTER'}); const mark=al(ch,'HORIZONTAL',{w:32,h:32,fill:K,r:8,align:'CENTER',justify:'CENTER'}); text(mark,'C','Bold',16,W); text(ch,'Want me to move anything between lanes, or add a new suggestion?','Regular',14,K,{fw:true});
  const askBar=al(chatCard,'HORIZONTAL',{name:'Ask bar',px:16,py:10,gap:10,align:'CENTER',stroke:K,r:99,fill:W,fw:true}); icon(askBar,20,'Ask icon'); text(askBar,'Ask questions...','Regular',14,G3,{fw:true}); btn(askBar,'Send',{primary:true,py:8});

  pin(chdr,1); pin(board,2); pin(laneFrames[0].lane,3); pin(laneFrames[0].cardFrames[0],4); pin(laneFrames[3].lane,5); pin(chatCard,6); pin(askBar,7);

  specPanel(NAME,[
   {rows:[
    'Header: "Study Helper" 24px Bold, subtitle sets the Concept A framing directly, every suggestion lands in a lane instead of a chat thread you have to re-read.',
    'Status board: 4 lanes (Urgent, This week, Later, Done), same lane component as the Dashboard Concept A sketch, fills the width and available height.',
    'Urgent lane: #F0F0F0 fill, dashed 4,3 stroke, the same pending/attention marker used everywhere else in the product.',
    'Suggestion card inside a lane: corner radius 10px, 1.5px stroke, white fill, 12px padding; title 13px Semi Bold plus a one-line detail.',
    'Done lane: solid white fill, no dash, holds AI suggestions that were followed and later verified.',
    'Chat preview card below the board: corner radius 12px, 1.5px stroke, white fill; a single follow-up prompt rather than a full message history, since the lanes above already carry most of the information a chat history would.',
    'Ask bar: 99px radius pill, 1.5px stroke, with a Send button, unchanged styling from the rest of the product.',
   ]},
  ], 100+17*1640, 220+1024+40, 1440);
}

// ================= 19 · Discussions, Status board (Concept A) =================
{
  const NAME='19 · Discussions, Status board (Concept A)', X=100+18*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Discussions');

  const hdr=al(content,'VERTICAL',{gap:4,fw:true}); text(hdr,'Discussions','Bold',24,K); text(hdr,'Posts are grouped by whether they still need you, not by when they were posted.','Regular',13,G3);

  const {board,laneFrames}=laneBoard(content,[
   ['Needs your reply',1,true,[['Ananya R. asked a question','# Q&A, Biology 9B, 8 min ago']]],
   ['New',2,false,[['Friday test reminder','Ms Kaushal, # Announcements'],['Group project check-in','# Group project, Maths 9']]],
   ['Read',1,false,[['Extension request reply','Direct, Ms Kaushal']]],
   ['Resolved',1,false,[['Unit 2 summary thread','# Announcements, English 9']]],
  ]);

  const comp=al(content,'HORIZONTAL',{name:'Composer',gap:10,fw:true,align:'CENTER'}); circleEl(comp,32);
  const inp=al(comp,'HORIZONTAL',{name:'Input',px:12,py:10,gap:10,fw:true,stroke:K,r:12,align:'CENTER'}); text(inp,'Reply to whichever post you pick...','Regular',14,G3,{fw:true}); btn(inp,'Post',{primary:true,py:8});

  pin(hdr,1); pin(board,2); pin(laneFrames[0].lane,3); pin(laneFrames[0].cardFrames[0],4); pin(laneFrames[3].lane,5); pin(inp,6);

  specPanel(NAME,[
   {rows:[
    'Header: "Discussions" 24px Bold, subtitle sets the framing, grouped by whether the post still needs a reply from the student, not by timestamp.',
    'Status board: 4 lanes (Needs your reply, New, Read, Resolved), same lane component used across every Concept A screen.',
    '"Needs your reply" lane: #F0F0F0 fill, dashed 4,3 stroke, the strongest attention marker, reserved for posts that are genuinely waiting on the student.',
    'Post card inside a lane: corner radius 10px, 1.5px stroke, white fill; title line plus a channel and time or sender line underneath.',
    'Resolved lane: solid white fill, holds a thread that already reached a conclusion, kept visible rather than hidden so a student can still find it.',
    'Composer: 32px avatar, input at 12px radius with a 1.5px stroke, black Post button; placeholder text acknowledges that a reply could go to any lane\'s post rather than one fixed channel.',
   ]},
  ], 100+18*1640, 220+1024+40, 1440);
}

// ================= 20 · Road to Glory, Status board (Concept A) =================
{
  const NAME='20 · Road to Glory, Status board (Concept A)', X=100+19*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root,'Rewards');

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Road to Glory','Bold',28,K); text(hl,'Badges and rewards are grouped by how close you are to them, not laid out as one long list.','Regular',14,G3);
  chip(hdr,'240 pts, verified');

  const {board,laneFrames}=laneBoard(content,[
   ['Ready to redeem',2,false,[['Streak freeze','60 pts, you can afford this now'],['Gold avatar frame','40 pts, you can afford this now']]],
   ['Almost there',1,false,[['Darksword: +90 damage','150 pts, 90 pts to go']]],
   ['Locked badges',2,true,[['Class helper','Complete 5 verified tasks to unlock'],['30-day streak','19 days to go']]],
   ['Unlocked',1,false,[['Perfect week','Earned 8 Sep']]],
  ]);

  const lead=al(content,'VERTICAL',{name:'Class leaderboard card',px:20,py:16,gap:10,fw:true,stroke:K,r:12,fill:W});
  text(lead,'Class leaderboard','Semi Bold',16,K);
  for(const [rank,name,score,me] of [['1','Ananya R.',310,false],['2','Prithu S. (you)',240,true]]){
    const r=al(lead,'HORIZONTAL',{name:'Leader row',gap:10,fw:true,align:'CENTER',px:me?8:0,py:me?6:0,r:8,stroke:me?K:null});
    const rb=al(r,'HORIZONTAL',{w:26,h:26,r:99,fill:K,align:'CENTER',justify:'CENTER'}); text(rb,rank,'Bold',12,W);
    circleEl(r,26); text(r,name,me?'Semi Bold':'Regular',14,K,{fw:true}); text(r,String(score),'Bold',14,K);
  }

  pin(hdr,1); pin(board,2); pin(laneFrames[0].lane,3); pin(laneFrames[1].cardFrames[0],4); pin(laneFrames[2].lane,5); pin(lead,6);

  specPanel(NAME,[
   {rows:[
    'Header: "Road to Glory" 28px Bold, subtitle sets the framing, grouped by distance to the reward rather than a fixed catalogue order.',
    'Status board: 4 lanes (Ready to redeem, Almost there, Locked badges, Unlocked), same lane component used on every Concept A screen.',
    '"Ready to redeem" lane: rewards the student can already afford, each card states the cost plainly as "you can afford this now".',
    '"Almost there" card: names exactly how many points are left to go, for example "90 pts to go" for the Darksword upgrade, turning the abstract point balance into a concrete target.',
    'Locked badges lane: #F0F0F0 fill, dashed 4,3 stroke, each card states what specifically still needs to happen to unlock it rather than just saying "Locked".',
    'Class leaderboard card kept unchanged from the main Rewards screen, trimmed to the top 2 rows, for the same reason it appears on every alternative Rewards concept: it is not part of what any concept is exploring, so it stays constant for a fair comparison.',
   ]},
  ], 100+19*1640, 220+1024+40, 1440);
}

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: Concept A full set. Pins added to screen 11, screens 18-20 built with pins. ' + dashCount + ' em dashes replaced.');
return { ok: true };
