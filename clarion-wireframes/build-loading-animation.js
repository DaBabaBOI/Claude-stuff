// Clarion loading screen animation, built as a chain of Figma prototype frames connected with
// "After Delay" + Smart Animate, looping forever:
//   1. The ring traces itself in 8 arcs, starting near the bottom and sweeping up through the
//      left side to the top (matching "traces from down to top"), by revealing one more arc
//      segment (opacity 0 -> 1) per keyframe: Smart Animate can't tween an arc's sweep angle
//      reliably, but it tweens opacity perfectly, so this is the reliable way to fake a draw-on.
//   2. The triangle fades in at rest, bounces inward, then springs back to rest.
//   3. The wordmark "Clarion" fades in (opacity climbs, i.e. transparency drops).
//   4. Everything fades back out, and the last frame loops back to the first.
// Each keyframe frame contains the exact same named layers (Seg 0..Seg 7, Triangle, Wordmark)
// with different opacity/position values, since Smart Animate only tweens matched layer names
// across two connected frames.
// This is a separate, standalone build: it does not touch any other screen in the file.
// Run in Figma with the free "Scripter" plugin (Plugins > Scripter), on the "Wireframes" page.
// Safe to re-run: it deletes its own previous output first by name.
// Paste everything below into Scripter and press Run.

await figma.loadFontAsync({family:'Inter',style:'Bold'});
const page = figma.currentPage;
const PURPLE={r:0.486,g:0.361,b:1}, BLUE={r:0.231,g:0.510,b:0.965}, WHITE={r:1,g:1,b:1};
const BRAND=[{type:'GRADIENT_LINEAR',gradientStops:[{position:0,color:{...PURPLE,a:1}},{position:1,color:{...BLUE,a:1}}],gradientTransform:[[1,0,0],[0,1,0]]}];

const SIZE=240, N=8;
const GAP=Math.PI*0.24, START=GAP/2, END=Math.PI*2-GAP/2, SWEEP=END-START, SEG=SWEEP/N;
const TS=SIZE*0.30, REST_X=SIZE*0.5-TS*0.38, IN_X=REST_X-TS*0.4;

// --- clean slate ---
const OLD=[]; for(let i=0;i<20;i++) OLD.push('Loading L'+i);
for(const n of page.children.filter(c=>OLD.includes(c.name))) n.remove();

function buildKeyframe(name,x,y,segOn,triOpacity,triX,wordOpacity){
  const root=figma.createFrame();
  root.name=name; root.fills=[{type:'SOLID',color:WHITE}];
  root.resize(400,340); root.x=x; root.y=y; root.clipsContent=false;
  root.primaryAxisSizingMode='FIXED'; root.counterAxisSizingMode='FIXED'; root.layoutMode='NONE';
  page.appendChild(root);

  const artX=80, artY=30;
  const art=figma.createFrame(); art.name='Art'; art.layoutMode='NONE';
  art.resize(SIZE,SIZE); art.x=artX; art.y=artY; art.fills=[]; art.clipsContent=false;
  root.appendChild(art);

  for(let i=0;i<N;i++){
    const e=figma.createEllipse(); e.name='Seg '+i; e.resize(SIZE,SIZE); e.x=0; e.y=0;
    e.fills=[]; e.strokes=BRAND; e.strokeWeight=SIZE*0.14; e.strokeCap='ROUND';
    e.arcData={startingAngle:START+i*SEG,endingAngle:START+(i+1)*SEG,innerRadius:0};
    e.opacity=segOn[i]?1:0;
    art.appendChild(e);
  }

  const t=figma.createPolygon(); t.name='Triangle'; t.pointCount=3;
  t.resize(TS,TS); t.rotation=90; t.fills=[{type:'SOLID',color:BLUE}];
  t.y=SIZE*0.5-TS*0.5; t.x=triX; t.opacity=triOpacity;
  art.appendChild(t);

  const w=figma.createText(); w.name='Wordmark'; w.fontName={family:'Inter',style:'Bold'}; w.characters='Clarion'; w.fontSize=36;
  w.fills=[{type:'SOLID',color:PURPLE}]; w.textAlignHorizontal='CENTER';
  root.appendChild(w);
  w.textAutoResize='HEIGHT'; w.resize(SIZE,44); w.x=artX; w.y=artY+SIZE+18; w.opacity=wordOpacity;

  return root;
}

const ALL_OFF=new Array(N).fill(false);
const ALL_ON=new Array(N).fill(true);
function cumulative(count){ return ALL_OFF.map((_,i)=>i<count); }

// [name, segOn, triOpacity, triX, wordOpacity, delaySeconds-to-next]
const states=[];
states.push(['Loading L0', ALL_OFF, 0, REST_X, 0, 0.35]);
for(let i=1;i<=N;i++) states.push(['Loading L'+i, cumulative(i), 0, REST_X, 0, 0.09]);
states.push(['Loading L'+(N+1), ALL_ON, 1, REST_X, 0, 0.15]);
states.push(['Loading L'+(N+2), ALL_ON, 1, IN_X, 0, 0.12]);
states.push(['Loading L'+(N+3), ALL_ON, 1, REST_X, 0, 0.15]);
states.push(['Loading L'+(N+4), ALL_ON, 1, REST_X, 0.4, 0.12]);
states.push(['Loading L'+(N+5), ALL_ON, 1, REST_X, 1, 0.7]);
states.push(['Loading L'+(N+6), ALL_OFF, 0, REST_X, 0, 0.3]);

const frames=[];
states.forEach(([name,segOn,triOpacity,triX,wordOpacity],i)=>{
  frames.push(buildKeyframe(name, 100+i*450, 1400, segOn, triOpacity, triX, wordOpacity));
});

// --- wire After Delay + Smart Animate, looping the last frame back to the first ---
let wired=0, failed=0;
for(let i=0;i<frames.length;i++){
  const delay=states[i][5];
  const next=frames[(i+1)%frames.length];
  if(typeof frames[i].setReactionsAsync!=='function'){ failed++; continue; }
  try{
    await frames[i].setReactionsAsync([{
      trigger:{type:'AFTER_TIMEOUT',timeout:delay},
      actions:[{type:'NODE',destinationId:next.id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_IN_AND_OUT'},duration:0.22},preserveScrollPosition:false}]
    }]);
    wired++;
  }catch(e){ failed++; }
}
try{ page.flowStartingPoints=[{nodeId:frames[0].id,name:'Loading loop'}]; }catch(e){}

figma.viewport.scrollAndZoomIntoView(frames);
figma.notify('Loading animation built: '+frames.length+' frames, '+wired+' links wired'+(failed?(', '+failed+' failed'):'')+'. Open Present mode and pick "Loading loop" to preview.');
return { ok:true, frames:frames.length, wired, failed };
