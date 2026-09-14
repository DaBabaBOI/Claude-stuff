// Clarion AI wireframes: super-detailed spec annotations + em dash cleanup.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page.
// Safe to run even if an earlier, simpler version of this script already ran once.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const K={r:0,g:0,b:0}, W={r:1,g:1,b:1}, G1={r:0.94,g:0.94,b:0.94};
const S=c=>[{type:'SOLID',color:c}];
const page=figma.currentPage;

function frame(dir,opts={}){
  const f=figma.createFrame();
  f.name=opts.name||'Frame';
  f.layoutMode=dir;
  f.itemSpacing=opts.gap??10;
  f.paddingTop=opts.pt??opts.pad??0; f.paddingBottom=opts.pb??opts.pad??0;
  f.paddingLeft=opts.pl??opts.pad??0; f.paddingRight=opts.pr??opts.pad??0;
  f.fills=opts.fill?S(opts.fill):[];
  f.strokes=opts.stroke?S(opts.stroke):[];
  f.strokeWeight=opts.sw??1.5;
  f.cornerRadius=opts.r??0;
  if(opts.dash) f.dashPattern=opts.dash;
  f.counterAxisAlignItems=opts.align||'MIN';
  return f;
}
function text(parent,chars,style,size,color,fillWidth){
  const t=figma.createText();
  t.fontName={family:'Inter',style};
  t.characters=chars;
  t.fontSize=size;
  t.fills=S(color);
  parent.appendChild(t);
  if(fillWidth){ t.textAutoResize='HEIGHT'; t.layoutSizingHorizontal='FILL'; }
  return t;
}

// 1. Remove any earlier annotation/notes panels, from either version of this script
for(const n of page.children.filter(c=>c.name.startsWith('Annotations · ')||c.name.startsWith('Notes · ')||c.name.startsWith('Spec · ')||c.name==='Design tokens')) n.remove();
const leg=page.children.find(c=>c.name==='Legend');
if(leg){ for(const t of leg.findAll(n=>n.type==='TEXT'&&n.characters.startsWith('Source:'))) t.remove(); }

// 2. Super-detailed spec panels, one per screen, plus a shared design tokens panel
function specPanel(title,rows,x,y,w){
  const f=frame('VERTICAL',{name:'Spec · '+title,gap:14,pad:24,fill:W,stroke:K,r:12,dash:[6,4]});
  page.appendChild(f); f.resize(w,100); f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='FIXED';
  f.x=x; f.y=y;
  text(f,title,'Bold',18,K);
  rows.forEach((body,j)=>{
    const r=frame('HORIZONTAL',{name:'Row '+(j+1),gap:12}); r.counterAxisAlignItems='MIN';
    f.appendChild(r); r.layoutSizingHorizontal='FILL'; r.layoutSizingVertical='HUG';
    const n=frame('HORIZONTAL',{name:'Number',fill:K,r:99}); n.primaryAxisAlignItems='CENTER'; n.counterAxisAlignItems='CENTER';
    r.appendChild(n); n.resize(26,26); n.primaryAxisSizingMode='FIXED'; n.counterAxisSizingMode='FIXED';
    text(n,String(j+1),'Bold',12,W);
    text(r,body,'Regular',14,K,true);
  });
  return f;
}

specPanel('Design tokens (applies to all four screens)',[
 'Canvas: every screen frame is 1440 x 1024px, a Desktop breakpoint.',
 'Black #000000: body text, strokes, primary button fill, active nav and tab states.',
 'White #FFFFFF: page background, card background, card and screen fills.',
 'Light grey #F0F0F0: sidebar background, secondary chip fill, hover and warm-colour placeholder surfaces.',
 'Mid grey #D1D1D1: avatar placeholder fill, image placeholder fill.',
 'Grey text #737373: secondary text, timestamps, input placeholder text.',
 'Corner radius 4px: small icon tiles and checkboxes.',
 'Corner radius 6px: tabs, small chips, calendar day cells.',
 'Corner radius 8px: buttons, inputs, list rows, nav items, attachment chips.',
 'Corner radius 10px: flashcards, image placeholders, direct message post.',
 'Corner radius 12px: cards, panels, calendar container.',
 'Corner radius 16px: the sign-in card on screen 1.',
 'Corner radius 99px: pills, chips, circular avatars, toggle tracks, badge circles.',
 'Stroke: 1.5px solid black on every outlined card, button and input; 1px on calendar day cells.',
 'Dashed stroke (4,3 or 5,4 or 6,4): marks a pending, private or non-final state, for example a status still awaiting teacher verification.',
 'Typography: Inter throughout. Sizes run from 11px meta labels up to 36px on the sign-in headline. Semi Bold for labels and buttons, Bold for headlines and numbers, Regular for body copy.',
 'Spacing: 4 to 8px between a tightly paired icon and label, 12 to 16px between fields inside a card, 24 to 32px for page-level padding.',
], 100+4*1640, 220+1024+40, 1440);

specPanel('01 · Sign in & Join class',[
 'Frame: 1440 x 1024px, split into a fixed 600px left panel and a flexible right panel.',
 'Left brand panel: fill #F0F0F0, padding 64px on all sides, 32px gap between blocks.',
 'Logo mark: 40 x 40px square, fill #000000, corner radius 10px, white "C" set at 22px Bold.',
 'Headline: 36px Bold black text, capped at 472px width so it wraps to three lines.',
 'Feature checkboxes: 20 x 20px, corner radius 4px, checked state is filled #000000 with a white tick mark.',
 'Illustration placeholder: 472 x 200px box, corner radius 12px, 1.5px black stroke, fill #F0F0F0.',
 'Utility chips top right (language, text size, contrast): pill shape, corner radius 99px, padding 10px horizontal and 4px vertical, 1.5px black stroke.',
 'Auth card: fixed width 440px, padding 32px, 16px gap between fields, 1.5px black stroke, corner radius 16px, white fill.',
 'Sign in and Create account tabs: shared 8px radius container, each tab 10px vertical padding, active tab is filled #000000 with white 14px Semi Bold text.',
 'Text inputs: padding 12px horizontal and 10px vertical, corner radius 8px, 1.5px black stroke, placeholder text in #737373 at 14px.',
 'Primary button (Sign in): black fill, white 14px Semi Bold text, padding 16px horizontal and 12px vertical, corner radius 8px.',
 'Six-digit class code boxes: 54 x 60px each, corner radius 8px, 1.5px black stroke, 8px gap between boxes, digits set at 24px Semi Bold.',
], 100, 220+1024+40, 1440);

specPanel('02 · Dashboard',[
 'Top bar: full width, 64px tall, white fill, 1.5px black border along the bottom edge only.',
 'Logo mark 32 x 32px, corner radius 8px. Search bar 460px wide and 40px tall, pill shaped at 99px radius, 1.5px black stroke.',
 'Points chip: corner radius 4px (intentionally squarer than other chips), 1.5px black stroke, #F0F0F0 fill, 13px Bold text.',
 'Avatar circle: 36px diameter, #D1D1D1 fill, 1.5px black stroke.',
 'Sidebar: fixed width 240px, #F0F0F0 fill, 16px padding. Nav item padding 12px horizontal and 10px vertical, corner radius 8px; the active item is filled #000000 with white 15px Semi Bold text.',
 'Stat cards: four equal columns, 16px padding, corner radius 12px, 1.5px black stroke. The Overdue card is filled #F0F0F0 here to mark the spot that becomes a warm red in the final build. Value text is 28px Bold.',
 'Upcoming tasks card: corner radius 12px, 1.5px black stroke, white fill. Header padding 20px horizontal, 14px vertical. Filter pills (All, Today, Week, Done) are 99px radius.',
 'Task rows: 20px horizontal padding, 14px vertical padding, separated by 1.5px black dividers. Checkbox is 20 x 20px at 4px radius.',
 'Status chips: 99px pill radius. Overdue and Verified use a solid #000000 fill. "Awaiting teacher verification" uses a dashed 4,3 stroke instead of a solid fill, to read as pending.',
 'Calendar card: corner radius 12px, 16px padding. Day cells are roughly 36 to 44px square, 6px radius, 1px black stroke; the current day is filled solid #000000.',
 'AI suggestion card: corner radius 12px, #F0F0F0 fill. AI mark is 24 x 24px, 6px radius, black square with a white "C".',
 'Recent discussions: 32px circular avatars, Teacher badge chip filled #000000 with white text.',
], 100+1640, 220+1024+40, 1440);

specPanel('03 · AI Study Helper',[
 'Chats panel: fixed width 280px, white fill, 16px padding. Chat list item padding 12px horizontal, 10px vertical, corner radius 8px; the active chat is filled #F0F0F0 with a 1.5px black stroke.',
 'Chat header: 24px horizontal padding, 14px vertical padding. Context and mode chips are 99px radius pills with a 1.5px black stroke.',
 'AI avatar mark: 32 x 32px, black fill, corner radius 8px, white "C" set at 16px Bold.',
 'AI message bubble: maximum width 640px, 16px padding, corner radius 12px, #F0F0F0 fill, no stroke.',
 'User message bubble: black fill, white text, 14px padding, corner radius 12px, aligned to the right edge of the column.',
 'Quick action buttons inside bubbles: corner radius 8px, 1.5px black stroke, 12px horizontal and 8px vertical padding, 13px Semi Bold text.',
 'Study plan table: corner radius 8px, 1.5px black stroke, white fill, each row padded 12px horizontal and 10px vertical, separated by 1.5px black dividers.',
 'Source chips: 99px pill radius, 1.5px black stroke, white fill, 12px Semi Bold text.',
 'Flashcard preview: two cards side by side, each 84px tall, corner radius 10px. The front card has a solid 1.5px black stroke; the back card uses a dashed 5,4 stroke to signal it is the flipped, hidden-until-tapped state.',
 'Composer input: corner radius 12px, 1.5px black stroke, 12px horizontal and 10px vertical padding, placeholder text in #737373.',
 'Send button: black fill, white text, corner radius 8px, 16px horizontal and 8px vertical padding.',
], 100+1640*2, 220+1024+40, 1440);

specPanel('04 · Class Discussions',[
 'Channel list: fixed width 280px, white fill, 16px padding. Channel row corner radius 6px; the active channel is filled #000000 with white text.',
 'Unread badge: 18 x 18px circle, 99px radius, black fill, white 10px Bold number.',
 'Feed header: 24px horizontal padding, 12px vertical padding. Public and Direct toggle shares one 99px radius pill container; the active segment is filled #000000.',
 'Pinned bar: #F0F0F0 fill, 24px horizontal and 8px vertical padding. Pinned chip is filled #000000.',
 'Post avatar: 36px circle, #D1D1D1 fill, 1.5px black stroke.',
 'Teacher badge chip: 99px radius, black fill, white 12px Semi Bold text.',
 'Direct message post: whole block has a 10px corner radius and a dashed 5,4 black stroke (instead of solid) to mark it as private. Its Direct label chip is filled #000000.',
 'Attachment chip (for example the revision sheet PDF): corner radius 8px, 1.5px black stroke, #F0F0F0 fill.',
 'Composer: input corner radius 12px with a 1.5px black stroke; Post button is black fill, white text, corner radius 8px.',
 'Right class panel: fixed width 260px. Class code chip is corner radius 8px, #F0F0F0 fill, value set at 14px Bold. Member avatars are 24px circles. Related task chips are 99px pills.',
], 100+1640*3, 220+1024+40, 1440);

// 3. Replace every em dash anywhere on the page (safety net; new text above never uses one)
const special=[
 ['Biology test — I can','Biology test. I can'],
 ['(1 of 12) — tap','(1 of 12), tap'],
 ['AI can make mistakes — check','AI can make mistakes, check'],
 ['photosynthesis) — Ms Kaushal','photosynthesis) · Ms Kaushal'],
 ['still due — I will','still due; I will'],
];
let count=0;
for(const t of page.findAllWithCriteria({types:['TEXT']})){
  if(!t.characters.includes('—')) continue;
  let s=t.characters;
  for(const [a,b] of special) s=s.split(a).join(b);
  s=s.split(' — ').join(': ').split('—').join('-');
  t.characters=s; count++;
}
figma.notify('Done: 5 detailed spec panels added, '+count+' em dashes replaced');
