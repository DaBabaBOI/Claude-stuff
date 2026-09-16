// Clarion AI wireframes: adds screen 14, a FULL, fully-detailed Dashboard built on Concept C
// (the Timeline idea from screen 13), same completeness as the original Dashboard (screen 02):
// stat row, full week timeline with real tasks distributed across days, a detailed "Today's
// focus" task list, an AI suggestion card, and a recent discussions card.
// Purely additive: does NOT touch or replace any existing screen, including 13, the sketch
// stays as-is for comparison in your doc.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page,
// in the "Clarion AI, Wireframes" file (not Socratree Design).
// Safe to re-run: it deletes its own previous output (this one screen + its panel) first.
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
  const c=al(parent,'HORIZONTAL',{name:'Checkbox',w:20,h:20,stroke:K,r:4,fill:checked?K:W,align:'CENTER',justify:'CENTER'});
  if(checked) text(c,'✓','Bold',13,W);
  return c;
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
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Developed from Concept C (screen 13)','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
}
function newRoot(name,x,y){
  const root=frame('VERTICAL',{name,gap:0,fill:W,stroke:K,sw:2,clip:true});
  page.appendChild(root); root.resize(1440,1024); root.x=x; root.y=y;
  root.primaryAxisSizingMode='FIXED'; root.counterAxisSizingMode='FIXED';
  return root;
}
function shell(root){
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
  for(const n of navItems){ const a=n==='Dashboard'; const it=al(side,'HORIZONTAL',{name:'Nav/'+n,px:12,py:10,gap:10,align:'CENTER',fw:true,r:8,fill:a?K:null}); icon(it,18,'Icon'); text(it,n,'Regular',15,a?W:K); }
  al(side,'VERTICAL',{name:'Spacer',fh:true});
  const join=al(side,'VERTICAL',{name:'Join class card',px:12,py:12,gap:8,fw:true,stroke:K,r:8,fill:W});
  text(join,'Join a class','Semi Bold',13,K);
  const user=al(side,'HORIZONTAL',{name:'User',gap:10,align:'CENTER',px:4,py:6}); circleEl(user,32); const ut=al(user,'VERTICAL',{gap:2}); text(ut,'Prithu S.','Semi Bold',14,K); text(ut,'Student, Year 9','Regular',12,G3);
  rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});
  const content=al(body,'VERTICAL',{name:'Content',px:32,py:32,gap:24,fw:true,fh:true});
  return content;
}

// --- clean slate for just this screen, so this is safe to re-run ---
const NAME='14 · Dashboard, Timeline (full)';
for(const n of page.children.filter(c=>[NAME,'Label '+NAME,'Sub '+NAME,'Spec · '+NAME].includes(c.name))) n.remove();

const X=100+13*1640, Y=220;
screenLabel(NAME,X,Y);
const root=newRoot(NAME,X,Y);
const content=shell(root);

// Header, same completeness as the original Dashboard (screen 02)
const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Good morning, Prithu','Bold',28,K); text(hl,'Monday 14 September, 5 tasks due this week, 1 overdue','Regular',14,G3);
const hr=al(hdr,'HORIZONTAL',{gap:10}); btn(hr,'+ Add task'); btn(hr,'Ask AI helper',{primary:true});

// Stat row, unchanged from screen 02
const stats=al(content,'HORIZONTAL',{name:'Stats',gap:16,fw:true});
const statData=[['Due today','2','Maths, English'],['Overdue','1','warm colour in hi-fi'],['Due this week','5','across 4 classes'],['Streak','6 days','240 pts, teacher-verified']];
for(const [l,v,n] of statData){ const c=al(stats,'VERTICAL',{name:'Stat/'+l,pad:16,gap:6,fw:true,stroke:K,r:12,fill:l==='Overdue'?G1:W}); text(c,l,'Regular',13,G3); text(c,v,'Bold',28,K); text(c,n,'Regular',12,G3); }

// Full week timeline, the concept's centrepiece, now carrying the real task set
const timeline=al(content,'VERTICAL',{name:'Week timeline card',gap:12,fw:true,px:20,py:20,stroke:K,r:12,fill:W});
const th=al(timeline,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(th,'This week','Semi Bold',18,K); text(th,'14 to 20 September','Regular',13,G3);
const daysRow=al(timeline,'HORIZONTAL',{name:'Day columns',gap:8,fw:true});
const weekData=[
 ['Mon','14',true,[['Cell structure worksheet','OVERDUE',true],['Quadratics practice set','Due 5:00 pm',false]]],
 ['Tue','15',false,[]],
 ['Wed','16',false,[]],
 ['Thu','17',false,[['Poetry analysis, first draft','+30 pts',false]]],
 ['Fri','18',false,[['Unit 3 test, Biology','Test',false]]],
 ['Sat','19',false,[]],
 ['Sun','20',false,[]],
];
for(const [d,n,today,items] of weekData){
  const col=al(daysRow,'VERTICAL',{name:'Day/'+d,gap:8,fw:true,fh:true,px:10,py:10,r:8,fill:today?K:null,stroke:today?null:K});
  text(col,d+' '+n,'Semi Bold',13,today?W:K);
  for(const [title,tag,warn] of items){
    const cardChip=al(col,'VERTICAL',{gap:2,fw:true,px:8,py:6,r:6,fill:warn?G1:(today?W:G1),stroke:warn?K:null,dash:warn?[4,3]:null});
    text(cardChip,title,'Semi Bold',11,K,{fw:true}); text(cardChip,tag,'Regular',10,G3);
  }
}
text(timeline,'Deadlines further out than this week (for example Source evaluation, due Mon 21 Sep) appear once that week comes into view, so the timeline never has to scroll sideways.','Regular',12,G3,{fw:true});

// Main: detailed Today's focus list + right column
const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
const focus=al(main,'VERTICAL',{name:'Todays focus card',gap:0,fw:true,fh:true,stroke:K,r:12,fill:W,clip:true});
const fh=al(focus,'HORIZONTAL',{px:20,py:14,fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(fh,'Today\'s focus','Semi Bold',18,K); text(fh,'Monday 14 Sep','Regular',12,G3);
divider(focus);
const focusRows=[
 [false,'Cell structure worksheet','Biology 9B','Due yesterday','OVERDUE',{dark:true},'-10 pts if not done'],
 [false,'Quadratics practice set','Maths 9','Due today, 5:00 pm','Due today',{},'+20 pts'],
 [true,'Lab report, enzymes','Chemistry 9','Submitted today','Awaiting teacher verification',{dash:[4,3],plain:true},'+30 pts pending'],
];
for(const [done,title,cls,due,status,so,pts] of focusRows){
  const r=al(focus,'HORIZONTAL',{name:'Task row',px:20,py:14,gap:14,fw:true,align:'CENTER'});
  checkbox(r,done);
  const mid=al(r,'VERTICAL',{gap:4,fw:true}); text(mid,title,'Semi Bold',15,done?G3:K); const meta=al(mid,'HORIZONTAL',{gap:8,align:'CENTER'}); chip(meta,cls); text(meta,due,'Regular',12,G3);
  const rightBox=al(r,'HORIZONTAL',{gap:10,align:'CENTER'}); chip(rightBox,status,so||{}); text(rightBox,pts,'Regular',12,G3);
  divider(focus);
}
const ff=al(focus,'HORIZONTAL',{px:20,py:12,fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(ff,'Rewards are added only after your teacher confirms completion.','Regular',12,G3); text(ff,'View this week\'s tasks','Semi Bold',13,K);

const right=al(main,'VERTICAL',{name:'Right column',w:360,gap:16,fh:true});
const ai=al(right,'VERTICAL',{name:'AI suggestion card',pad:16,gap:10,fw:true,stroke:K,r:12,fill:G1});
const ah=al(ai,'HORIZONTAL',{gap:8,align:'CENTER'}); const mk=al(ah,'HORIZONTAL',{w:24,h:24,fill:K,r:6,align:'CENTER',justify:'CENTER'}); text(mk,'C','Bold',13,W); text(ah,'AI helper suggests','Semi Bold',13,K);
text(ai,'You have 3 tasks due in the next 48 hours and a Biology test on Friday. Wednesday and the weekend are clear. Want a study plan slotted into those gaps?','Regular',13,K,{w:320});
const ab=al(ai,'HORIZONTAL',{gap:8}); btn(ab,'Create plan',{primary:true,py:8,s:13}); btn(ab,'Prioritise tasks',{py:8,s:13});

const disc=al(right,'VERTICAL',{name:'Recent discussions card',pad:16,gap:10,fw:true,stroke:K,r:12,fill:W});
const dh=al(disc,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(dh,'Recent discussions','Semi Bold',15,K); text(dh,'Open','Semi Bold',12,K);
for(const [who,chan,msg,t,badge] of [['Ms Kaushal','Biology 9B, # Q&A','Friday test covers unit 3 only...','2m','Teacher'],['Ananya R.','Maths 9, # Group project','Can we meet at lunch to finish...','18m','']]){
  const r=al(disc,'HORIZONTAL',{gap:10,fw:true,align:'MIN'}); circleEl(r,32); const m=al(r,'VERTICAL',{gap:2,fw:true}); const l1=al(m,'HORIZONTAL',{gap:6,align:'CENTER'}); text(l1,who,'Semi Bold',13,K); if(badge) chip(l1,badge,{dark:true}); text(m,chan,'Regular',11,G3); text(m,msg,'Regular',12,K,{w:260}); text(r,t,'Regular',11,G3);
}

specPanel(NAME,[
 {rows:[
  'Frame: 1440 x 1024px, same top bar and sidebar shell as every other screen, Dashboard active in the nav.',
  'Header and stat row: identical to the original Dashboard (screen 02), unchanged, so this stays directly comparable to it. Value text 28px Bold, Overdue card filled #F0F0F0.',
  'Week timeline card: full width, corner radius 12px, 1.5px black stroke, 20px padding. Replaces the mini calendar from screen 02 as the primary date view.',
  'Day columns: 7 equal columns, 8px gap, 10px padding, corner radius 8px. Today (Monday 14) is filled solid black with white text; the rest are outlined only, matching the concept sketch on screen 13.',
  'Task chip inside a day: corner radius 6px, 11px Semi Bold title, 10px grey tag. Monday carries two chips (the overdue worksheet, dashed 4,3 and #F0F0F0 fill; and the task due today, solid). Thursday and Friday carry one chip each for the essay and the test.',
  'Footer note under the timeline explains what happens once a task falls outside the visible week, this is the concept\'s main open question, called out directly rather than left implicit.',
  'Today\'s focus card: corner radius 12px, 1.5px black stroke, fills the remaining height, clips content. Same row structure as the task list on screen 02 (checkbox, title, class chip, due text, status chip, points), scoped to only today\'s three items instead of the whole week, since the timeline above already covers the week view.',
  'Right column: the same AI suggestion card and recent discussions card as screen 02, at 360px width, unchanged in style; the AI suggestion copy is updated to reference the free days the timeline makes visible (Wednesday and the weekend).',
 ]},
], 100+13*1640, 220+1024+40, 1440);

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: full Timeline Dashboard (screen 14) added, ' + dashCount + ' em dashes replaced.');
return { ok: true };
