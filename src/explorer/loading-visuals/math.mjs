// All equations, geometry, colors and movement live here; no media/network owner.
export function mountMath(container){
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.className='loading-geometry';canvas.setAttribute('aria-hidden','true');container.append(canvas);const ctx=canvas.getContext('2d');let frame=0,paused=false,reduced=false,closed=false,elapsed=0,last=0;
 function draw(t){if(closed)return;const dt=last?Math.min(50,t-last):0;last=t;if(!paused&&!reduced)elapsed+=dt;const phase=elapsed/3000;ctx.clearRect(0,0,640,480);ctx.lineWidth=1.4;for(let layer=0;layer<3;layer++){ctx.strokeStyle=['#ee4566','#6eb8e8','#b09bdf'][layer];ctx.beginPath();for(let i=0;i<=360;i++){const a=i*Math.PI/180,r=85+35*Math.sin(5*a+phase+layer),x=320+r*Math.cos(a+phase/8+layer*.3),y=240+r*Math.sin(a+phase/8+layer*.3);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}frame=0;if(!paused&&!reduced)frame=requestAnimationFrame(draw);}
 const update=()=>{cancelAnimationFrame(frame);frame=0;last=0;if(!closed)draw(performance.now());};update();
 return {setPaused(value){paused=value;update();},setReducedMotion(value){reduced=value;update();},destroy(){closed=true;cancelAnimationFrame(frame);canvas.remove();}};
}
