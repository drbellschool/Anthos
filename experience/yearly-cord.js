/* Anthos Yearly Cord — shared, iframe-free textured braid renderer.
   Design preview only. Uses the approved three-strand source texture, not generated segments.
   Exposes window.AnthosCord.mount(host, {colors,checkpoints,compact}).
*/
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const R = 192;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const DEFAULT = ["#df4051","#2c91d4","#21a66a"];
  const valid = v => typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v);
  const clamp = v => Math.min(96, Math.max(0, Math.round(Number(v) || 0)));
  const nodes = new WeakMap();
  const tintCache = new Map();
  let serial = 0;
  let sourcePromise;
  function byId(container, id) { return container.querySelector('[data-cord-id="' + id + '"]'); }
  function imageSource() {
    if (sourcePromise) return sourcePromise;
    sourcePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) throw new Error("Canvas 2D unavailable");
          context.drawImage(image, 0, 0);
          resolve({width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data});
        } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error("Approved braid texture is unavailable"));
      image.src = "/experience/rope-original-960.png";
    });
    return sourcePromise;
  }
  const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));

  async function tinted(colors) {
    const key = colors.join("|").toLowerCase();
    if (tintCache.has(key)) return tintCache.get(key);
    const task = (async () => {
      const {width,height,pixels} = await imageSource();
      const palette = colors.map(rgb);
      const neutral = ["#b5a28c","#b5a28c","#b5a28c"].map(rgb);
      const baseline = [225,195,183];
      function paint(target) {
        const canvas = document.createElement("canvas"); canvas.width=width;canvas.height=height;
        const context = canvas.getContext("2d", {willReadFrequently:true});
        if (!context) throw new Error("Canvas 2D unavailable");
        const image = context.createImageData(width,height), data=image.data;
        for(let i=0;i<data.length;i+=4) {
          const alpha=pixels[i+3]; if(alpha<1){data[i+3]=0;continue;}
          const k=pixels[i]<113?0:pixels[i]<188?1:2;
          const light=Math.max(.35,Math.min(1.43,pixels[i+1]/baseline[k]));
          const glint=Math.max(0,(145-pixels[i+2])/145)*.13;
          for(let c=0;c<3;c++) data[i+c] = Math.max(0,Math.min(255,
            Math.round(target[k][c]*light*(1-glint)+255*glint)));
          data[i+3]=alpha;
        }
        context.putImageData(image,0,0);
        return canvas.toDataURL("image/png");
      }
      return {faded:paint(neutral),colored:paint(palette)};
    })();
    tintCache.set(key,task);
    if(tintCache.size>7) tintCache.delete(tintCache.keys().next().value);
    return task;
  }
  function svgMarkup(uid, compact) {
    const mainText = compact ? "" : [
      '<g pointer-events="none">',
      '<text x="280" y="246" text-anchor="middle" fill="#987854" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="3">THE YEARLY CORD</text>',
      '<text data-cord-id="percent" x="280" y="313" text-anchor="middle" fill="#672932" font-family="Georgia,serif" font-size="70">75%</text>',
      '<text data-cord-id="count" x="280" y="347" text-anchor="middle" fill="#8c7268" font-family="system-ui,sans-serif" font-size="13">72 OF 96 CHECKPOINTS</text>',
      '<path d="M243 366 H317" fill="none" stroke="#b38b55" stroke-width="1.2"/>',
      '<path d="M274 366 q6 -10 12 0 q-6 10 -12 0" fill="none" stroke="#b38b55" stroke-width="1.4"/>',
      '<text x="280" y="394" text-anchor="middle" fill="#886b5f" font-family="Georgia,serif" font-style="italic" font-size="15">YEAR ONE</text>',
      '</g>'
    ].join("");
    return '<svg class="anthos-cord-svg" viewBox="0 0 560 560" role="img" aria-label="A genuine three strand braided rope growing around a yearly circle" xmlns="' + NS + '">'+
      '<defs><mask id="' + uid + '"><circle data-cord-id="reveal" cx="280" cy="280" r="192" fill="none" stroke="white" stroke-width="76" transform="rotate(-90 280 280)" stroke-linecap="butt" stroke-dasharray="0 1207"/></mask></defs>'+
      '<circle cx="280" cy="280" r="192" fill="none" stroke="#8e735b" stroke-width="43" opacity=".07"/>'+
      '<image data-cord-id="faded" x="55" y="55" width="450" height="450" preserveAspectRatio="xMidYMid meet" opacity=".27"/>'+
      '<g mask="url(#' + uid + ')"><image data-cord-id="colored" x="55" y="55" width="450" height="450" preserveAspectRatio="xMidYMid meet"/></g>'+
      (compact ? '' : '<g data-cord-id="markers"></g>')+
      mainText+'</svg>';
  }
  function showProgress(host, value) {
    const total=clamp(value), length=CIRCUMFERENCE*total/96;
    const reveal=byId(host,"reveal");
    if(!reveal)return;
    reveal.setAttribute("stroke-dasharray",length.toFixed(3)+" "+(CIRCUMFERENCE+1).toFixed(3));
    // Keep the original prototype's precise SVG month positions, not CSS percentages.
    const markers=byId(host,"markers");
    if(markers){
      markers.replaceChildren();
      const labels=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      for(let m=0;m<12;m++){
        const angle=(-90+m*30)*Math.PI/180, c=Math.cos(angle),sin=Math.sin(angle);
        const x=280+236*c,y=280+236*sin,done=total>=(m+1)*8;
        const line=document.createElementNS(NS,"line");
        for(const [key,value] of Object.entries({x1:280+212*c,y1:280+212*sin,x2:280+218*c,y2:280+218*sin,stroke:"#bb9b78","stroke-width":"1.2"}))line.setAttribute(key,String(value));
        const circle=document.createElementNS(NS,"circle");
        for(const [key,value] of Object.entries({cx:x,cy:y,r:16,fill:done?"#713c48":"#fff3dd",stroke:done?"#d0a66b":"#d9b99b","stroke-width":"1.4"}))circle.setAttribute(key,String(value));
        const text=document.createElementNS(NS,"text");
        for(const [key,value] of Object.entries({x,y:y+3.5,"text-anchor":"middle",fill:done?"#fff8e9":"#99765d","font-size":"9.5","font-weight":"700","font-family":"system-ui,sans-serif"}))text.setAttribute(key,String(value));
        text.textContent=labels[m];
        markers.append(line,circle,text);
      }
    }
    const pct=byId(host,"percent"),count=byId(host,"count");
    if(pct)pct.textContent=Math.round(total/96*100)+"%";
    if(count)count.textContent=total+" OF 96 CHECKPOINTS";
    host.setAttribute("aria-label",total+" of 96 yearly checkpoints. "+Math.round(total/96*100)+" percent complete.");
  }
  function mount(host, options={}) {
    if(!host)return;
    const colors=Array.isArray(options.colors)&&options.colors.length===3&&options.colors.every(valid)
      ?options.colors.slice():DEFAULT.slice();
    const checkpoints=clamp(options.checkpoints);
    let item=nodes.get(host);
    if(!item){
      const uid="anthos-cord-mask-"+(++serial);
      host.innerHTML=svgMarkup(uid,Boolean(options.compact));
      item={colors:[],revision:0};
      nodes.set(host,item);
    }
    showProgress(host,checkpoints);
    const key=colors.join("|");
    if(item.colors.join("|")===key)return;
    item.colors=colors;
    const revision=++item.revision;
    tinted(colors).then(({faded,colored})=>{
      if(revision!==item.revision||!host.isConnected)return;
      byId(host,"faded")?.setAttribute("href",faded);
      byId(host,"colored")?.setAttribute("href",colored);
      host.classList.add("cord-loaded");
    }).catch(error=>{
      if(revision!==item.revision)return;
      console.error("Anthos cord failed to render:",error);
      host.classList.add("cord-error");
      host.setAttribute("aria-label","Threefold cord image unavailable; progress data is still displayed.");
    });
  }
  window.AnthosCord={mount};
})();