/* Anthos Yearly Cord — shared, iframe-free textured braid renderer.
   Design preview only. Uses the approved three-strand source texture, not generated segments.
   Exposes window.AnthosCord.mount(host, {colors,checkpoints,compact}).
*/
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const R = 192;
  // The mask must cover all braided fibers, including the outer edge at March–April.
  // Keep the feathered progress tip aligned with this same full-width band.
  const REVEAL_WIDTH = 132;
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
      image.src = "/experience/rope-texture.png";
    });
    return sourcePromise;
  }
  const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));

  // The approved source image includes an unnaturally smooth outer alpha silhouette:
  // the last few pixels of several braided strands were flattened in the asset itself.
  // Stretch the actual fiber pixels along each radial spoke to restore an irregular
  // edge instead of drawing fake vector braid segments or widening the progress mask.
  function restoreStrandSilhouette(original) {
    const w=original.width,h=original.height;
    const padding=Math.max(20,Math.round(Math.min(w,h)*.043));
    const restored=document.createElement("canvas");
    restored.width=w+2*padding;restored.height=h+2*padding;
    const context=restored.getContext("2d",{willReadFrequently:true});
    if(!context)throw new Error("Canvas 2D unavailable");
    context.drawImage(original,padding,padding);
    const destImage=context.getImageData(0,0,restored.width,restored.height);
    const source=original.getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
    const dest=destImage.data,cx=w/2,cy=h/2;
    const maxRadius=Math.floor(Math.min(w,h)*.5)-2;
    const minRadius=Math.floor(Math.min(w,h)*.30);
    // One or more samples per source pixel along the circumference avoids seams.
    const steps=Math.ceil(2*Math.PI*maxRadius*1.8);
    const innerBand=Math.max(12,Math.round(Math.min(w,h)*.034));
    const amplitude=Math.max(7,Math.round(Math.min(w,h)*.022));
    for(let k=0;k<steps;k++){
      const angle=k*2*Math.PI/steps,c=Math.cos(angle),sn=Math.sin(angle);
      let outer=-1;
      for(let radius=maxRadius;radius>=minRadius;radius--){
        const x=Math.round(cx+radius*c),y=Math.round(cy+radius*sn);
        if(x<0||y<0||x>=w||y>=h)continue;
        if(source[(y*w+x)*4+3]>175){outer=radius;break;}
      }
      if(outer<0)continue;
      // The three smoothly phase-shifted oscillations recreate the tiny natural
      // bulges at successive over-under strand crossings, rather than a hard arc.
      const wave=.52+.29*Math.sin(angle*30+.8)+.19*Math.sin(angle*55-1.1);
      const extension=Math.max(2,Math.min(amplitude,Math.round(amplitude*wave)));
      const from=outer-innerBand;
      for(let d=-innerBand;d<=extension;d+=.70){
        const srcRadius=from+(d+innerBand)*innerBand/(innerBand+extension);
        const sx=Math.round(cx+srcRadius*c),sy=Math.round(cy+srcRadius*sn);
        const tx=Math.round(padding+cx+(outer+d)*c),ty=Math.round(padding+cy+(outer+d)*sn);
        if(sx<0||sy<0||sx>=w||sy>=h||tx<0||ty<0||tx>=restored.width||ty>=restored.height)continue;
        const a=(sy*w+sx)*4,b=(ty*restored.width+tx)*4;
        const alpha=source[a+3];
        if(alpha<10)continue;
        dest[b]=source[a];dest[b+1]=source[a+1];dest[b+2]=source[a+2];
        dest[b+3]=alpha;
      }
    }
    context.putImageData(destImage,0,0);
    return {canvas:restored,overscan:450*padding/w};
  }
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
        return restoreStrandSilhouette(canvas).canvas.toDataURL("image/png");
      }
      return {faded:paint(neutral),colored:paint(palette),overscan:450*Math.max(20,Math.round(Math.min(width,height)*.043))/width};
    })();
    tintCache.set(key,task);
    if(tintCache.size>7) tintCache.delete(tintCache.keys().next().value);
    return task;
  }
  function svgMarkup(uid, compact) {
    const mainText = compact ? "" : [
      '<g pointer-events="none">',
      '<text x="280" y="226" text-anchor="middle" fill="#743e47" font-family="Georgia,serif" font-size="19" font-weight="700" letter-spacing="1.1">THE YEARLY CORD</text>',
      '<path d="M236 244 H324" fill="none" stroke="#c4a36c" stroke-width="1.3"/>',
      '<text data-cord-id="percent" x="280" y="322" text-anchor="middle" fill="#692e3c" font-family="Georgia,serif" font-size="79">75%</text>',
      '<text x="280" y="346" text-anchor="middle" fill="#692e3c" font-family="system-ui,sans-serif" font-size="13" letter-spacing="3" font-weight="800">COMPLETE</text>',
      '<text data-cord-id="count" x="280" y="377" text-anchor="middle" fill="#725c57" font-family="system-ui,sans-serif" font-size="14" font-weight="600">72 OF 96 CHECKPOINTS</text>',
      '<path d="M273 400 q7 -10 14 0 q-7 10 -14 0" fill="none" stroke="#b38b55" stroke-width="2"/>',
      '<text x="280" y="429" text-anchor="middle" fill="#8c6659" font-family="Georgia,serif" font-style="italic" font-size="18">YEAR ONE</text>',
      '</g>'
    ].join("");
    return '<svg class="anthos-cord-svg" viewBox="0 0 560 560" role="img" aria-label="A genuine three strand braided rope growing around a yearly circle" xmlns="' + NS + '">'+
      '<defs><mask id="' + uid + '" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="560" height="560"><circle data-cord-id="reveal" cx="280" cy="280" r="192" fill="none" stroke="white" stroke-width="' + REVEAL_WIDTH + '" transform="rotate(-90 280 280)" stroke-linecap="butt" stroke-dasharray="0 1207"/><g data-cord-id="tip"></g></mask></defs>'+
      '<circle cx="280" cy="280" r="192" fill="none" stroke="#8e735b" stroke-width="43" opacity=".07"/>'+
      '<image data-cord-id="faded" x="55" y="55" width="450" height="450" preserveAspectRatio="xMidYMid meet" opacity=".43"/>'+
      '<g mask="url(#' + uid + ')"><image data-cord-id="colored" x="55" y="55" width="450" height="450" preserveAspectRatio="xMidYMid meet"/></g>'+
      mainText+'</svg>';
  }
  function showProgress(host, value) {
    const total=clamp(value), length=CIRCUMFERENCE*total/96;
    const tail=total===96?0:Math.min(18,length),solid=Math.max(0,length-tail);
    const reveal=byId(host,"reveal"),tip=byId(host,"tip");
    if(!reveal||!tip)return;
    reveal.setAttribute("stroke-dasharray",solid.toFixed(3)+" "+(CIRCUMFERENCE+1).toFixed(3));
    tip.replaceChildren();
    if(tail>0) for(let j=0;j<10;j++){
      const circle=document.createElementNS(NS,"circle");
      const attributes={cx:"280",cy:"280",r:String(R),fill:"none",stroke:"white",
        "stroke-width":String(REVEAL_WIDTH),transform:"rotate(-90 280 280)",
        "stroke-dasharray":(tail/10+.25).toFixed(3)+" "+(CIRCUMFERENCE+1).toFixed(3),
        "stroke-dashoffset":(-solid-j*tail/10).toFixed(3),
        opacity:(1-Math.pow((j+1)/10,1.65)).toFixed(3)};
      Object.entries(attributes).forEach(([k,v])=>circle.setAttribute(k,v));tip.append(circle);
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
    tinted(colors).then(({faded,colored,overscan})=>{
      if(revision!==item.revision||!host.isConnected)return;
      for(const id of ["faded","colored"]){
        const image=byId(host,id);
        if(!image)continue;
        image.setAttribute("x",String(55-overscan));
        image.setAttribute("y",String(55-overscan));
        image.setAttribute("width",String(450+2*overscan));
        image.setAttribute("height",String(450+2*overscan));
      }
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