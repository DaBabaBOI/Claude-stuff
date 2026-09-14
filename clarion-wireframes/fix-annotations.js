// Clarion AI wireframes: simplify notes + remove em dashes.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const K={r:0,g:0,b:0}, W={r:1,g:1,b:1};
const S=c=>[{type:'SOLID',color:c}];
const page=figma.currentPage;

// 1. Remove the old annotation panels and the legend "Source:" line
for(const n of page.children.filter(c=>c.name.startsWith('Annotations · '))) n.remove();
const leg=page.children.find(c=>c.name==='Legend');
if(leg){ for(const t of leg.findAll(n=>n.type==='TEXT'&&n.characters.startsWith('Source:'))) t.remove(); }

// 2. Simple notes under each screen
const notes=[
 ['01 · Sign in & Join class',['Sign in with your school account or Google.','Enter the 6-digit code from your teacher to join a class.','Language, text size and high contrast controls for accessibility.','Rounded buttons and plenty of white space keep it calm.']],
 ['02 · Dashboard',['Every task from every class in one list, sorted by deadline.','Overdue and due-soon tasks are marked. The final design uses red and orange for these.','Points are only added after the teacher confirms the task is done.','Calendar and recent discussions sit on the same page.','The AI helper suggests a study plan when a test is coming up.','Theme, language and text size settings are always one click away.']],
 ['03 · AI Study Helper',['Three main actions: study plan, flashcards, ask a doubt.','The AI knows the student\'s classes, tasks and notes.','Every answer lists its sources.','A plan can be added straight to the calendar.','Flashcards are generated from the plan.','Teachers can see AI chats for safety.']],
 ['04 · Class Discussions',['Each class has public channels for announcements, Q&A and group work.','Switch to Direct to message a teacher privately.','Teachers are labelled and can see all messages.','Important posts can be pinned to the top.','Any post can be summarised by the AI.','Related tasks and the class code are shown on the right.']],
];
function text(parent,chars,style,size,color){ const t=figma.createText(); t.fontName={family:'Inter',style}; t.characters=chars; t.fontSize=size; t.fills=S(color); parent.appendChild(t); return t; }
notes.forEach(([title,items],i)=>{
  const f=figma.createFrame(); f.name='Notes · '+title; f.layoutMode='VERTICAL'; f.itemSpacing=10;
  f.paddingTop=f.paddingBottom=f.paddingLeft=f.paddingRight=24;
  f.fills=S(W); f.strokes=S(K); f.strokeWeight=1.5; f.dashPattern=[6,4]; f.cornerRadius=12;
  page.appendChild(f); f.resize(1440,100); f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='FIXED';
  f.x=100+i*1640; f.y=220+1024+40;
  text(f,'Notes','Bold',18,K);
  items.forEach((body,j)=>{
    const r=figma.createFrame(); r.name='Note '+(j+1); r.layoutMode='HORIZONTAL'; r.itemSpacing=12; r.fills=[]; r.counterAxisAlignItems='MIN';
    f.appendChild(r); r.layoutSizingHorizontal='FILL'; r.layoutSizingVertical='HUG';
    const n=figma.createFrame(); n.name='Number'; n.layoutMode='HORIZONTAL'; n.fills=S(K); n.cornerRadius=99;
    n.primaryAxisAlignItems='CENTER'; n.counterAxisAlignItems='CENTER'; r.appendChild(n); n.resize(28,28);
    n.primaryAxisSizingMode='FIXED'; n.counterAxisSizingMode='FIXED';
    text(n,String(j+1),'Bold',13,W);
    const t=text(r,body,'Regular',15,K); t.textAutoResize='HEIGHT'; t.layoutSizingHorizontal='FILL';
  });
});

// 3. Replace every em dash
const special=[
 ['Biology test — I can','Biology test. I can'],
 ['(1 of 12) — tap','(1 of 12), tap'],
 ['AI can make mistakes — check','AI can make mistakes, check'],
 ['photosynthesis) — Ms Kaushal','photosynthesis) · Ms Kaushal'],
 ['still due — I will','still due; I will'],
 ['Annotations — ','Notes: '],
];
let count=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters;
  for(const [a,b] of special) s=s.split(a).join(b);
  s=s.split(' — ').join(': ').split('—').join('-');
  t.characters=s; count++;
}
figma.notify('Done: notes rebuilt, '+count+' em dashes replaced');
