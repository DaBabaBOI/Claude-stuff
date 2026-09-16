// Clarion AI wireframes: adds 3 ALTERNATIVE Dashboard concepts (11-13), same product, three
// different information-architecture ideas, for Criterion B Strand 2 ("a range of feasible
// design ideas"). Same black-and-white style as everything else. Each gets its own spec panel.
// Purely additive: does NOT touch screens 01-10 or their spec panels in any way.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page,
// in the "Clarion AI, Wireframes" file (not Socratree Design).
// Safe to re-run: it deletes its own previous output (these 3 screens + panels) first.
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
  const sub=text(page,'Clarion AI · Desktop 1440x1024 · Design idea, alternative Dashboard concept','Regular',14,G3); sub.name='Sub '+name; sub.x=x; sub.y=y-24;
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
  const user=al(side,'HORIZONTAL',{name:'User',gap:10,align:'CENTER',px:4,py:6}); circleEl(user,32); const ut=al(user,'VERTICAL',{gap:2}); text(ut,'Prithu S.','Semi Bold',14,K); text(ut,'Student, Year 9','Regular',12,G3);
  rectBox(body,{name:'V divider',w:1.5,fh:true,fill:K,stroke:null,r:0});
  const content=al(body,'VERTICAL',{name:'Content',px:32,py:32,gap:24,fw:true,fh:true});
  return content;
}

// --- 1. clean slate for just these 3 screens, so this is safe to re-run ---
const NAMES=['11 · Dashboard concept A, Status board','12 · Dashboard concept B, Class tabs','13 · Dashboard concept C, Timeline'];
const toRemove=[];
for(const n of NAMES) toRemove.push(n,'Label '+n,'Sub '+n,'Spec · '+n);
for(const n of page.children.filter(c=>toRemove.includes(c.name))) n.remove();

// ================= 11 · Concept A: Status board (kanban-style triage) =================
{
  const NAME='11 · Dashboard concept A, Status board', X=100+10*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root);

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Good morning, Prithu','Bold',28,K); text(hl,'Tasks grouped by status instead of a single list, so what needs attention is obvious at a glance.','Regular',14,G3);
  btn(hdr,'+ Add task');

  const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
  const board=al(main,'HORIZONTAL',{name:'Status board',gap:16,fw:true,fh:true});
  const lanes=[
    ['Overdue','1',true,[['Cell structure worksheet','Biology 9B','-10 pts if not done']]],
    ['Due today','2',false,[['Quadratics practice set','Maths 9','+20 pts'],['Poetry analysis, first draft','English 9','+30 pts']]],
    ['Due this week','3',false,[['Source evaluation (WW1)','History 9','+25 pts'],['Lab report, enzymes','Chemistry 9','+30 pts pending'],['Reading log','English 9','+15 pts']]],
    ['Done','2',false,[['Map quiz, rivers','Geography 9','Verified'],['Reading response','English 9','Verified']]],
  ];
  for(const [name,count,warn,cards] of lanes){
    const lane=al(board,'VERTICAL',{name:'Lane/'+name,gap:12,fw:true,fh:true,px:14,py:14,stroke:K,r:12,fill:warn?G1:W,dash:warn?[4,3]:null});
    const lh=al(lane,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(lh,name,'Semi Bold',15,K); chip(lh,count,{dark:name==='Overdue'});
    for(const [title,cls,pts] of cards){
      const card=al(lane,'VERTICAL',{name:'Task card',gap:6,fw:true,px:12,py:12,stroke:K,r:10,fill:W});
      text(card,title,'Semi Bold',13,K,{fw:true}); chip(card,cls); text(card,pts,'Regular',11,G3);
    }
  }

  const right=al(main,'VERTICAL',{name:'Right column',w:340,gap:16,fh:true});
  const cal=al(right,'VERTICAL',{name:'Calendar card',pad:16,gap:8,fw:true,stroke:K,r:12,fill:W});
  text(cal,'September 2026','Semi Bold',15,K); text(cal,'Full calendar unchanged from the main Dashboard design.','Regular',12,G3,{fw:true});
  const ai=al(right,'VERTICAL',{name:'AI suggestion card',pad:16,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(ai,'AI helper suggests','Semi Bold',13,K); text(ai,'Clear the Overdue lane first, it is the only warm-coloured lane in hi-fi.','Regular',13,K,{fw:true});

  specPanel(NAME,[
   {rows:[
    'Core idea: replace the single chronological task list with four status lanes (Overdue, Due today, Due this week, Done) side by side, so triage is spatial rather than requiring the student to scan a whole list top to bottom.',
    'Lane: fills equal width and available height, 14px padding, corner radius 12px, 1.5px black stroke. The Overdue lane uses #F0F0F0 fill and a dashed 4,3 stroke, the same "needs attention" marker used elsewhere in the product.',
    'Lane header: name 15px Semi Bold plus a count chip, black fill only on the Overdue lane\'s chip for emphasis.',
    'Task card: corner radius 10px, 1.5px black stroke, 12px padding, white fill; title 13px Semi Bold, a class chip, and a one-line points or status note.',
    'Right column keeps the same calendar and AI suggestion cards as the main Dashboard design, both narrowed to 340px, so the two concepts stay comparable.',
    'Trade-off versus the main design: faster to see what is overdue and what is done, but loses the single ranked "what do I do first" ordering that the chronological list gives, and needs horizontal space for four lanes, which will be tight on a laptop screen.',
   ]},
  ], 100+10*1640, 220+1024+40, 1440);
}

// ================= 12 · Concept B: Class tabs =================
{
  const NAME='12 · Dashboard concept B, Class tabs', X=100+11*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root);

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Good morning, Prithu','Bold',28,K); text(hl,'Browse by class instead of by deadline, useful on a day you are only thinking about one subject.','Regular',14,G3);
  const strip=al(hdr,'HORIZONTAL',{name:'Overview strip',gap:12});
  chip(strip,'2 due today'); chip(strip,'1 overdue',{dark:true}); chip(strip,'6 day streak');

  const tabs=al(content,'HORIZONTAL',{name:'Class tabs',gap:8,fw:true});
  const classNames=['Biology 9B','Maths 9','English 9','History 9'];
  for(const c of classNames){ const a=c==='Biology 9B'; const t=al(tabs,'HORIZONTAL',{name:'Tab/'+c,px:16,py:10,r:99,fill:a?K:null,stroke:K}); text(t,c,'Semi Bold',14,a?W:K); }

  const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
  const classCard=al(main,'VERTICAL',{name:'Active class card',gap:16,fw:true,fh:true,px:20,py:20,stroke:K,r:12,fill:W});
  const ch=al(classCard,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(ch,'Biology 9B','Semi Bold',20,K); text(ch,'Ms Seema Kaushal, Teacher','Regular',13,G3);
  divider(classCard);
  text(classCard,'Tasks in this class','Semi Bold',15,K);
  for(const [title,due,status] of [['Cell structure worksheet','Due yesterday','OVERDUE'],['Unit 3 test','Fri 18 Sep','Due soon']]){
    const r=al(classCard,'HORIZONTAL',{gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
    const l=al(r,'HORIZONTAL',{gap:10,align:'CENTER'}); checkbox(l,false); const m=al(l,'VERTICAL',{gap:2}); text(m,title,'Semi Bold',14,K); text(m,due,'Regular',12,G3);
    chip(r,status,{dark:status==='OVERDUE'});
  }
  divider(classCard);
  text(classCard,'Latest discussion','Semi Bold',15,K);
  const dRow=al(classCard,'HORIZONTAL',{gap:10,fw:true,align:'MIN'}); circleEl(dRow,32); const dm=al(dRow,'VERTICAL',{gap:2,fw:true}); text(dm,'Ms Kaushal','Semi Bold',13,K); text(dm,'Friday test covers unit 3 only, cell structure and photosynthesis.','Regular',13,K,{w:400});

  const right=al(main,'VERTICAL',{name:'Right column',w:340,gap:16,fh:true});
  const ai=al(right,'VERTICAL',{name:'AI suggestion card',pad:16,gap:8,fw:true,stroke:K,r:12,fill:G1});
  text(ai,'AI helper suggests','Semi Bold',13,K); text(ai,'Biology 9B has your only overdue task. Want a plan to clear it before switching classes?','Regular',13,K,{fw:true});
  const cal=al(right,'VERTICAL',{name:'Calendar card',pad:16,gap:8,fw:true,stroke:K,r:12,fill:W});
  text(cal,'September 2026','Semi Bold',15,K); text(cal,'Full calendar unchanged from the main Dashboard design.','Regular',12,G3,{fw:true});

  specPanel(NAME,[
   {rows:[
    'Core idea: make class the primary way of browsing instead of deadline order, with an "Overview strip" of small chips keeping the whole-week summary visible but secondary.',
    'Class tabs: pill row, 99px radius each, 16px/10px padding; the active class is filled #000000 with white text, matching the tab pattern used on the Sign in screen.',
    'Active class card: fills the remaining width and height, corner radius 12px, 1.5px stroke, 20px padding; shows that one class\'s tasks and its most recent discussion post together, so a student does not have to leave the tab to check either.',
    'Task row inside the card: checkbox, title, due date, and a status chip, a smaller version of the row used in the main Dashboard\'s task list.',
    'Right column keeps the same AI suggestion and calendar cards as the main Dashboard design, reordered with the AI card first since it now reacts to the open tab specifically.',
    'Trade-off versus the main design: better for a student focused on one subject at a time, but a student with urgent tasks spread across several classes has to click through each tab to see everything, the opposite of the "centralised" success criterion.',
   ]},
  ], 100+11*1640, 220+1024+40, 1440);
}

// ================= 13 · Concept C: Timeline =================
{
  const NAME='13 · Dashboard concept C, Timeline', X=100+12*1640, Y=220;
  screenLabel(NAME,X,Y);
  const root=newRoot(NAME,X,Y);
  const content=shell(root);

  const hdr=al(content,'HORIZONTAL',{name:'Header',fw:true,justify:'SPACE_BETWEEN',align:'CENTER'});
  const hl=al(hdr,'VERTICAL',{gap:4}); text(hl,'Good morning, Prithu','Bold',28,K); text(hl,'The week itself is the main view, everything is plotted on a single timeline instead of listed separately from a calendar.','Regular',14,G3);
  btn(hdr,'+ Add task');

  const timeline=al(content,'VERTICAL',{name:'Week timeline card',gap:12,fw:true,px:20,py:20,stroke:K,r:12,fill:W});
  const th=al(timeline,'HORIZONTAL',{fw:true,justify:'SPACE_BETWEEN',align:'CENTER'}); text(th,'This week','Semi Bold',18,K); text(th,'14 to 20 September','Regular',13,G3);
  const days=al(timeline,'HORIZONTAL',{name:'Day columns',gap:8,fw:true});
  const weekData=[
   ['Mon','14',true,[['Cell structure worksheet','OVERDUE',true]]],
   ['Tue','15',false,[['Quadratics practice set','+20 pts',false]]],
   ['Wed','16',false,[]],
   ['Thu','17',false,[['Poetry analysis','+30 pts',false]]],
   ['Fri','18',false,[['Unit 3 test','Test',false]]],
   ['Sat','19',false,[]],
   ['Sun','20',false,[]],
  ];
  for(const [d,n,today,items] of weekData){
    const col=al(days,'VERTICAL',{name:'Day/'+d,gap:8,fw:true,fh:true,px:10,py:10,r:8,fill:today?K:null,stroke:today?null:K});
    text(col,d+' '+n,'Semi Bold',13,today?W:K);
    for(const [title,tag,warn] of items){
      const chipC=al(col,'VERTICAL',{gap:2,fw:true,px:8,py:6,r:6,fill:warn?G1:(today?W:G1),stroke:warn?K:null,dash:warn?[4,3]:null});
      text(chipC,title,'Semi Bold',11,K,{fw:true}); text(chipC,tag,'Regular',10,G3);
    }
  }

  const main=al(content,'HORIZONTAL',{name:'Main',gap:24,fw:true,fh:true});
  const focus=al(main,'VERTICAL',{name:'Todays focus card',gap:12,fw:true,fh:true,px:20,py:20,stroke:K,r:12,fill:W});
  text(focus,'Today\'s focus','Semi Bold',18,K);
  for(const [title,cls,pts] of [['Cell structure worksheet','Biology 9B, overdue since yesterday','-10 pts if not done'],['Quadratics practice set','Maths 9, due 5:00 pm','+20 pts']]){
    const r=al(focus,'HORIZONTAL',{gap:12,fw:true,align:'CENTER',justify:'SPACE_BETWEEN'});
    const l=al(r,'HORIZONTAL',{gap:10,align:'CENTER'}); checkbox(l,false); const m=al(l,'VERTICAL',{gap:2}); text(m,title,'Semi Bold',14,K); text(m,cls,'Regular',12,G3);
    text(r,pts,'Regular',12,G3);
  }
  const ai=al(main,'VERTICAL',{name:'AI suggestion card',w:340,pad:16,gap:8,fh:true,stroke:K,r:12,fill:G1});
  text(ai,'AI helper suggests','Semi Bold',13,K); text(ai,'Wednesday and the weekend are clear. Want a study plan slotted into those gaps?','Regular',13,K,{fw:true});

  specPanel(NAME,[
   {rows:[
    'Core idea: replace the separate task list and calendar card with one timeline that is the main view, so the student sees shape of the week at a glance instead of reading a list.',
    'Week timeline card: corner radius 12px, 1.5px stroke, 20px padding, full width, spans the top of the page above everything else.',
    'Day columns: 7 equal columns, 8px gap, 10px padding, corner radius 8px. Today (Monday 14) is filled solid black with white text; the rest are outlined only.',
    'Task chip inside a day: corner radius 6px, 11px Semi Bold title, 10px grey tag. The overdue item on Monday uses the #F0F0F0 fill and dashed 4,3 stroke pending marker, same as the rest of the product.',
    'Today\'s focus card: below the timeline, a short 2-item list of just today\'s tasks, so the student still gets a simple checklist without needing the full timeline for that.',
    'Trade-off versus the main design: gives a much stronger sense of the week\'s shape and free time, which secondary research flagged as valued in ManageBac\'s calendar, but 7 columns of detail get cramped on anything narrower than a full desktop width, and a very busy day is harder to read than a plain list row.',
   ]},
  ], 100+12*1640, 220+1024+40, 1440);
}

// --- final safety net: replace every em dash anywhere on the page ---
let dashCount=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters.split(' — ').join(': ').split('—').join('-');
  t.characters=s; dashCount++;
}

figma.viewport.scrollAndZoomIntoView(page.children);
figma.notify('Done: 3 alternative Dashboard concepts (11-13) added with spec panels, ' + dashCount + ' em dashes replaced.');
return { ok: true };
