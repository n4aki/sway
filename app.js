const catalog=window.PHOTO_CATALOG;
const photos=catalog?.photos??[];
const esc=value=>String(value).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const card=$("card"),photo=$("photo"),stamp=$("stamp"),choices=[...document.querySelectorAll("[data-choice]")];
const labels={like:"好き",neutral:"普通",dislike:"嫌い"};
let answers=[],busy=false,ready=false,filter="like",drag=null;
function state(){return {completed:answers.length,total:photos.length,current:photos[answers.length]?.title??null,counts:Object.fromEntries(Object.keys(labels).map(k=>[k,answers.filter(a=>a===k).length]))};}
function controls(){choices.forEach(b=>b.disabled=busy||!ready||answers.length===photos.length);$("undo").disabled=busy||!answers.length;$("show-results").disabled=busy||!answers.length;}
function render(){
 if(!photos.length){ready=false;controls();$("experience").hidden=true;$("catalog-error").hidden=false;return;}
 if(answers.length===photos.length){renderResults();return;}
 $("experience").hidden=false;$("results").hidden=true;
 const p=photos[answers.length];ready=false;busy=false;controls();
 card.style.transition="none";card.style.transform="";card.style.opacity="1";stamp.style.opacity="0";
 $("image-error").hidden=true;photo.alt=p.title;$("photo-title").textContent=p.title;$("category").textContent=p.category;
 $("credit").hidden=!p.source; if(p.source){$("credit").href=p.source;}else{$("credit").removeAttribute("href");}
 const n=String(answers.length+1).padStart(2,"0");$("current").textContent=n;$("card-number").textContent=n+" / "+photos.length;
 $("progress").style.width=answers.length/photos.length*100+"%";
 photo.onload=()=>{ready=true;controls();};photo.onerror=()=>{ready=false;$("image-error").hidden=false;controls();};
 photo.src=p.url;if(photo.complete&&photo.naturalWidth){ready=true;controls();}
 for(let j=1;j<=2;j++)if(photos[answers.length+j]){const preload=new Image();preload.src=photos[answers.length+j].url;}
}
function paint(kind,opacity=1){stamp.textContent=labels[kind];stamp.style.color=kind==="like"?"#7042ed":kind==="dislike"?"#b64665":"#62616c";stamp.style.opacity=opacity;}
async function decide(kind){
 if(!Object.hasOwn(labels,kind))throw new Error("判定は like、neutral、dislike のいずれかです。");
 if(busy||!ready||$("experience").hidden||answers.length===photos.length) return false;
 busy=true;drag=null;controls();paint(kind);card.style.transition="transform .3s ease,opacity .3s ease";
 card.style.transform=kind==="like"?"translate(520px,30px) rotate(22deg)":kind==="dislike"?"translate(-520px,30px) rotate(-22deg)":"translate(0,550px) rotate(4deg)";card.style.opacity="0";
 await new Promise(r=>setTimeout(r,matchMedia("(prefers-reduced-motion: reduce)").matches?0:280));
 const title=photos[answers.length].title;answers.push(kind);busy=false;$("live").textContent=title+"："+labels[kind];render();return state();
}
choices.forEach(b=>b.addEventListener("click",()=>decide(b.dataset.choice)));
$("undo").onclick=()=>{if(busy||!answers.length)return;answers.pop();render();};
$("retry").onclick=()=>{const url=new URL(photos[answers.length].url,location.href);url.searchParams.set("retry",Date.now());photo.src=url.href;$("image-error").hidden=true;};
function resetDrag(){drag=null;card.style.transition="transform .25s ease";card.style.transform="";stamp.style.opacity=0;}
card.addEventListener("pointerdown",e=>{if(e.target.closest("a,button")||busy||!ready||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};card.setPointerCapture(e.pointerId);card.style.transition="none";});
card.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;drag.dx=e.clientX-drag.x;drag.dy=e.clientY-drag.y;card.style.transform="translate("+drag.dx+"px,"+Math.max(-35,drag.dy)+"px) rotate("+(drag.dx/20)+"deg)";const vertical=drag.dy>Math.abs(drag.dx);const kind=vertical?"neutral":drag.dx>0?"like":"dislike";paint(kind,Math.min(1,(vertical?drag.dy:Math.abs(drag.dx))/95));});
card.addEventListener("pointerup",e=>{if(!drag||drag.id!==e.pointerId)return;const {dx,dy}=drag;const threshold=Math.min(85,card.clientWidth*.22);const kind=dy>Math.abs(dx)&&dy>threshold?"neutral":Math.abs(dx)>threshold?(dx>0?"like":"dislike"):null;resetDrag();if(kind)decide(kind);});
card.addEventListener("pointercancel",resetDrag);card.addEventListener("lostpointercapture",()=>{if(drag)resetDrag();});
window.addEventListener("keydown",e=>{if($("instructions").open||$("experience").hidden||e.target.closest("button,a,input,textarea"))return;const kind={ArrowLeft:"dislike",ArrowDown:"neutral",ArrowRight:"like"}[e.key];if(kind){e.preventDefault();if(!drag)decide(kind);}});
$("help").onclick=()=> $("instructions").showModal();$("close-help").onclick=$("start").onclick=()=> $("instructions").close();
function showPartialResults(){
 if(busy||!answers.length||$("experience").hidden)return false;
 resetDrag();renderResults();return state();
}
$("show-results").onclick=showPartialResults;
$("resume").onclick=()=>{if(busy||answers.length>=photos.length)return;render();card.focus({preventScroll:true});window.scrollTo({top:0,behavior:"instant"});};
function renderResults(){
 $("experience").hidden=true;$("results").hidden=false;
 const counts=state().counts;
 $("result-heading").textContent=answers.length<photos.length?"途中結果":"判定結果";
 $("result-progress").textContent=answers.length+" / "+photos.length+"枚を判定済み（未判定 "+(photos.length-answers.length)+"枚）";
 $("resume").hidden=answers.length>=photos.length;
 $("stats").innerHTML=Object.entries(labels).map(([k,v])=>'<div class="stat"><span>'+({like:"♡ ",neutral:"− ",dislike:"× "}[k])+v+'</span><strong>'+counts[k]+'<small>枚</small></strong></div>').join("");
 renderTagCharts();filter="like";renderGallery();$("result-heading").focus({preventScroll:true});window.scrollTo({top:0,behavior:"instant"});
}
function renderGallery(){
 document.querySelectorAll("[data-filter]").forEach(b=>{b.setAttribute("aria-selected",b.dataset.filter===filter);b.textContent=labels[b.dataset.filter]+" "+answers.filter(a=>a===b.dataset.filter).length;});
 const selected=photos.filter((_,i)=>answers[i]===filter);
 $("gallery").innerHTML=selected.length?selected.map(p=>'<figure class="result-card"><a href="'+esc(p.source||p.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(p.url)+'" alt="'+esc(p.title)+'" loading="lazy"></a><figcaption>'+esc(p.title)+'<small>'+esc(p.category)+'</small></figcaption></figure>').join(""):'<p class="empty">「'+labels[filter]+'」に選んだ写真はありません。</p>';
}
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderGallery();});
$("restart").onclick=()=>{answers=[];render();card.focus({preventScroll:true});window.scrollTo({top:0,behavior:"instant"});};
document.body.classList.toggle("fashion",catalog?.kind==="fashion");
document.querySelectorAll("[data-photo-total]").forEach(el=>el.textContent=photos.length);
render();

if(document.modelContext?.registerTool){
 const tools=[
 {name:"read_swipe_progress",description:"Read current photo and rating totals.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>state()},
 {name:"rate_current_photo",description:"Rate the current photo and advance the visible card.",inputSchema:{type:"object",properties:{rating:{type:"string",enum:["like","neutral","dislike"]}},required:["rating"],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||!Object.hasOwn(labels,input.rating))throw new Error("Invalid rating");const result=await decide(input.rating);if(!result)throw new Error("Photo is loading or session is complete");return result;}}
 ];for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}}
}


function summarizeTags(items,ratings){
 return [...new Set(items.map(p=>p.category))].map(tag=>{
  const counts={like:0,dislike:0,neutral:0};
  items.forEach((p,i)=>{if(p.category===tag&&Object.hasOwn(counts,ratings[i]))counts[ratings[i]]++;});
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const percentages=Object.fromEntries(Object.entries(counts).map(([k,n])=>[k,total?n/total*100:0]));
  return {tag,total,counts,percentages};
 });
}
function renderTagCharts(){
 const format=n=>Number(n.toFixed(1)).toLocaleString("ja-JP");
 $("tag-charts").innerHTML=summarizeTags(photos,answers).map(({tag,total,counts,percentages:p})=>{
  if(!total)return '<article class="tag-chart tag-unrated"><div class="tag-chart-title"><h3>'+esc(tag)+'</h3><span>0枚</span></div><p class="unrated-label">未判定</p></article>';
  const description=Object.entries(counts).map(([k,n])=>labels[k]+" "+format(p[k])+"%、"+n+"枚").join("。");
  const rows=Object.entries(counts).map(([k,n])=>'<li><span class="tag-key"><i class="tag-dot '+k+'" aria-hidden="true"></i>'+labels[k]+'</span><strong>'+format(p[k])+'<small>%</small></strong><span class="tag-count">'+n+'枚</span></li>').join("");
  return '<article class="tag-chart"><div class="tag-chart-title"><h3>'+esc(tag)+'</h3><span>'+total+'枚判定</span></div><div class="tag-donut" role="img" aria-label="'+esc(tag)+'：'+esc(description)+'" style="background:conic-gradient(var(--violet) 0% '+p.like+'%,#c34d70 '+p.like+'% '+(p.like+p.dislike)+'%,#b7b3c2 '+(p.like+p.dislike)+'% 100%)"><div aria-hidden="true"><strong>'+format(p.like)+'<small>%</small></strong><span>好き</span></div></div><ul class="tag-legend">'+rows+'</ul></article>';
 }).join("");
}
