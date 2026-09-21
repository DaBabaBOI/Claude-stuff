// Clarion final design: clean annotations for all 7 screens.
// Adds a small numbered badge on the corner of each referenced card (sitting on the page
// background rather than over any text), plus a matching two column notes panel beneath each
// screen. Targets are found by layer name or by their own text, so nothing is hard coded to a
// position and the script survives small layout changes.
// Safe to re-run: it removes any previous badges and panels first.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter) on the Clarion page.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const P = figma.currentPage;

const C={w:{r:1,g:1,b:1},bd:{r:0.855,g:0.871,b:0.914},
 ink:{r:0.055,g:0.063,b:0.133},body:{r:0.114,g:0.125,b:0.196},
 ink2:{r:0.298,g:0.318,b:0.412},ink3:{r:0.451,g:0.471,b:0.553},
 pu:{r:0.361,g:0.290,b:0.949}};
const S=c=>[{type:'SOLID',color:c}];

function frame(dir,opts){
  opts=opts||{};
  const f=figma.createFrame();
  f.name=opts.name||'Frame'; f.layoutMode=dir; f.itemSpacing=opts.gap==null?0:opts.gap;
  f.paddingTop=opts.pt==null?(opts.pad==null?0:opts.pad):opts.pt;
  f.paddingBottom=opts.pb==null?(opts.pad==null?0:opts.pad):opts.pb;
  f.paddingLeft=opts.pl==null?(opts.pad==null?0:opts.pad):opts.pl;
  f.paddingRight=opts.pr==null?(opts.pad==null?0:opts.pad):opts.pr;
  f.fills=opts.fill?S(opts.fill):[];
  f.strokes=opts.stroke?S(opts.stroke):[];
  f.strokeWeight=opts.sw==null?1:opts.sw;
  f.cornerRadius=opts.r==null?0:opts.r;
  f.counterAxisAlignItems=opts.align||'MIN';
  f.primaryAxisAlignItems=opts.justify||'MIN';
  return f;
}
function child(parent,f,opts){
  opts=opts||{};
  parent.appendChild(f);
  if(opts.w!=null||opts.h!=null){
    f.resize(opts.w==null?f.width:opts.w, opts.h==null?f.height:opts.h);
    f.primaryAxisSizingMode='FIXED'; f.counterAxisSizingMode='FIXED';
  } else { f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='AUTO'; }
  if(opts.fw) f.layoutSizingHorizontal='FILL';
  if(opts.fh) f.layoutSizingVertical='FILL';
  return f;
}
function al(parent,dir,opts){ opts=opts||{}; return child(parent,frame(dir,opts),opts); }
function T(par,chars,opts){
  opts=opts||{};
  const t=figma.createText();
  t.fontName={family:'Inter',style:opts.st||'Regular'};
  t.characters=chars;
  t.fontSize=opts.sz||14;
  t.fills=S(opts.c||C.ink);
  if(opts.lh) t.lineHeight={unit:'PIXELS',value:opts.lh};
  par.appendChild(t);
  if(opts.fw){ t.textAutoResize='HEIGHT'; t.layoutSizingHorizontal='FILL'; }
  return t;
}
// Filled rather than outlined: a solid mark with a white ring reads on a white card, on the
// grey page background and on the coloured panels alike.
function badge(parent,num){
  const b=al(parent,'HORIZONTAL',{name:'Note '+num,align:'CENTER',justify:'CENTER',r:999,fill:C.pu,w:24,h:24});
  b.strokes=S(C.w); b.strokeWeight=2;
  b.effects=[{type:'DROP_SHADOW',color:{r:0.16,g:0.13,b:0.44,a:0.30},offset:{x:0,y:1},radius:4,spread:0,visible:true,blendMode:'NORMAL'}];
  T(b,String(num),{sz:12,st:'Bold',c:C.w});
  return b;
}

const SPEC = [
['01 Sign in', [
 [{n:'Brand panel'},'Brand panel: a light purple to blue gradient, cool and bright as the specification asks, carrying the mark and headline before any form.'],
 [{n:'Features'},'Feature list: three outcomes rather than a feature dump, so the value is clear in one read.'],
 [{n:'Tabs'},'Sign in and Join a class tabs: one card serves returning students and new ones, so there is no second screen to find.'],
 [{n:'Field'},'Input fields: 46px tall with 10px corners and a school email placeholder, following the rounded low stress rule.'],
 [{n:'Btn/Sign in'},'Sign in button: the only filled button on the screen, so the primary action is never ambiguous.'],
 [{n:'Code'},'Class code row: six boxes with the first three filled, making the format obvious without a help label.']]],
['02 Dashboard', [
 [{n:'Top bar',at:[690,21]},'Top bar: search, streak, points and avatar stay in the same place on every screen, so navigation is learned once.'],
 [{n:'Sidebar',at:[104,446]},'Sidebar: five destinations with the current one filled in the brand gradient for an unmistakable active state.'],
 [{t:'Due this week',up:2},'Stat cards: four numbers, each with its own accent colour, so overdue reads as urgent before it is read.'],
 [{t:'Your tasks',up:2},'Task list: every row carries a class chip and a due chip, colour coded by urgency rather than by class.'],
 [{t:'This week',up:2},'Week calendar: today is filled and an amber dot marks the day a deadline lands.'],
 [{t:'Clarion suggests',up:2},'AI suggestion: Clarion names the single task to start with and gives the reason, which is what the specification asks of the agent.'],
 [{t:'Recent discussion',up:2},'Recent discussion: the newest teacher post surfaces here so students do not have to go looking for it.']]],
['03 AI Study Helper', [
 [{t:'What needs you first',up:2},'Priority list: the layout that won peer feedback, ordering tasks by what needs the student first rather than by class.'],
 [{t:'Revise cell structure for Friday test',up:2},'Priority row: a four pixel accent bar plus a status chip, so urgency is carried by colour and by text.'],
 [{t:'For Friday\'s test, focus on the TFTP rule and the overall photosynthesis equation.',up:1},'AI message: the reply is scoped to one class and one deadline instead of a general answer.'],
 [{t:'Make a study plan',up:2},'Quick actions: the three requests students make most, one tap from the conversation.'],
 [{t:'Every answer shows its sources',up:1},'Sources card: each answer lists the notes and tasks it used, which is how the hallucination criterion is met.'],
 [{t:'Ask about your classes, tasks or notes',up:1},'Ask bar: one persistent input pinned to the bottom, so asking is always the same gesture.']]],
['04 Discussions', [
 [{t:'Search threads',up:2},'Thread inbox: every class in one filterable list sorted by recency, the layout that won peer feedback.'],
 [{t:'Unread',up:2},'Filter chips: All, Unread, Pinned and Teacher, with the active filter filled so the current view is obvious.'],
 [{t:'Ms Kaushal: Friday test covers cell structure only.',up:1},'Thread row: class chip, title, snippet and an amber unread dot, enough to triage without opening it.'],
 [{t:'28 classmates',up:1},'Thread header: names the thread and shows how many classmates are in it.'],
 [{t:'Reminder: the Friday test covers cell structure and photosynthesis only. You do not need the light dependent reactions in detail.',up:2},'Teacher post: a filled Teacher chip separates staff answers from student guesses at a glance.'],
 [{t:'Reply in Biology 9',up:1},'Composer: pinned to the bottom and labelled with the class, so a reply cannot land in the wrong thread.']]],
['05 Road to Glory', [
 [{t:'This week',up:2},'Streak strip: the whole week at a glance with the points each verified day earned.'],
 [{t:'Mon',up:1},'Day cell: verified days are green with a tick, today is a dashed outline, rest days stay quiet grey.'],
 [{t:'Badges',up:2},'Badges: four tiles, each in its own colour, so the row is scannable rather than uniform.'],
 [{t:'Bookworm',up:1},'Locked badge: a dashed border and a progress label, showing what is left rather than hiding it.'],
 [{t:'Spend your points',up:2},'Redeem list: rewards are in app only, which keeps the gamification inside the teacher\'s control.'],
 [{t:'240 of 300 pts',up:1},'Progress bar: the locked reward shows exactly how far away it is, so the goal stays reachable.'],
 [{t:'Leaderboard',up:2},'Leaderboard: gold, silver and bronze ranks with the student\'s own row highlighted.'],
 [{t:'Why points are verified',up:1},'Verification note: points only pay out once a teacher marks the task complete, which is the anti gaming rule.']]],
['06 My classes', [
 [{n:'Card/Biology 9'},'Class card: one card per class, colour coded, with the teacher named underneath.'],
 [{t:'tasks due',up:2},'Counts row: tasks due, new posts and flashcards, the three things a student checks before opening a class.'],
 [{t:'Next: Cell structure worksheet',up:1},'Next deadline: the soonest item with its status chip, so a class can be triaged without opening it.'],
 [{n:'Btn/Open Biology 9'},'Open class: filled only on the class that needs attention, the rest stay outlined.'],
 [{n:'Nav/My classes'},'Sidebar entry: My classes sits directly under Dashboard, matching how often it is used.'],
 [{t:'Join a class',up:1},'Join a class: kept as a quiet outlined button since it is used once a term.']]],
['07 Biology 9', [
 [{n:'Btn/Back to classes'},'Breadcrumb: a one click route back to the class list, so the page never becomes a dead end.'],
 [{t:'Code 7K2H9',up:2},'Class identity: teacher, class code and student count, everything needed to confirm the right class.'],
 [{t:'Deadlines',up:2},'Deadlines: the class filtered view of the same tasks shown on the dashboard, sorted by date.'],
 [{t:'Cell structure worksheet',up:2},'Deadline row: the set date sits under the title, so students see how long they have had it.'],
 [{t:'Class discussions',up:2},'Class discussions: the two most recent posts with a route into the full thread.'],
 [{t:'Tap to flip',up:1},'Flashcard preview: the front of a real card with a flip hint, showing the study loop rather than describing it.'],
 [{t:'Ready to prepare',up:2},'Generate a deck: Clarion offers to build cards from the student\'s own notes, linking the agent to class content.']]]
];

for (const n of P.children.filter(function(n){return n.name.indexOf('Notes ')===0;})) n.remove();

// The sign in screen used to show a mock task card with an overdue chip. A logged out student
// has no tasks yet, so that card implied data that cannot exist. Remove it, and the trailing
// spacer that sat above it, so the brand panel stays vertically centred.
let previewRemoved = false;
const signIn = P.children.find(function(n){return n.name==='01 Sign in';});
if (signIn) {
  const preview = signIn.findOne(function(n){return n.name==='Preview card';});
  if (preview) {
    const panel = preview.parent;
    preview.remove();
    previewRemoved = true;
    if (panel && panel.children.length) {
      const last = panel.children[panel.children.length-1];
      if (last.name==='Spacer') last.remove();
    }
  }
}

const report={};
let totalBadges=0, totalMissing=0;

for (const entry of SPEC) {
  const screen = P.children.find(function(n){return n.name===entry[0];});
  if (!screen) { report[entry[0]]='screen not found'; continue; }
  for (const old of screen.findAll(function(n){return n.name.indexOf('Note ')===0;})) old.remove();

  const sb = screen.absoluteBoundingBox;
  const failed=[];
  let placed=0;

  for (let i=0;i<entry[1].length;i++){
    const ref=entry[1][i][0];
    let node=null;
    if (ref.n) node = screen.findOne(function(n){return n.name===ref.n;});
    else if (ref.t) {
      const t = screen.findOne(function(n){return n.type==='TEXT' && n.characters===ref.t;});
      if (t) { node=t; const lv=ref.up||0; for (let k=0;k<lv && node.parent;k++) node=node.parent; }
    }
    if (!node) { failed.push(i+1); totalMissing++; continue; }
    const bd = badge(screen, i+1);
    bd.layoutPositioning='ABSOLUTE';
    if (ref.at) { bd.x=ref.at[0]; bd.y=ref.at[1]; }
    else {
      const nb = node.absoluteBoundingBox;
      bd.x = Math.max(6, nb.x - sb.x - 12);
      bd.y = Math.max(6, nb.y - sb.y - 12);
    }
    placed++; totalBadges++;
  }

  const panel=al(P,'VERTICAL',{name:'Notes '+entry[0],gap:20,pl:30,pr:30,pt:26,pb:28,r:16,fill:C.w,w:1440,h:10});
  panel.primaryAxisSizingMode='AUTO';
  panel.strokes=S(C.bd); panel.strokeWeight=1;
  panel.x=screen.x; panel.y=screen.y+1024+44;

  const ph=al(panel,'HORIZONTAL',{align:'CENTER',fw:true});
  T(ph,entry[0],{sz:18,st:'Bold'});
  const sp=al(ph,'HORIZONTAL',{w:1,h:1}); sp.layoutSizingHorizontal='FILL';
  T(ph,'Annotations',{sz:12.5,st:'Semi Bold',c:C.ink2});

  const cols=al(panel,'HORIZONTAL',{gap:36,fw:true});
  const half=Math.ceil(entry[1].length/2);
  for (let c2=0;c2<2;c2++){
    const col=al(cols,'VERTICAL',{gap:14,fw:true});
    for (let i=c2*half;i<Math.min((c2+1)*half,entry[1].length);i++){
      const row=al(col,'HORIZONTAL',{gap:12,align:'MIN',fw:true});
      badge(row,i+1);
      T(row,entry[1][i][1],{sz:14,c:C.body,lh:21,fw:true});
    }
  }
  report[entry[0]]={placed:placed, notFound:failed};
}

figma.notify('Annotations added: '+totalBadges+' badges across 7 screens'+(totalMissing?(', '+totalMissing+' targets not found'):'')+(previewRemoved?'. Sign in preview card removed.':'.'));
return { screens: report, previewCardRemoved: previewRemoved };
