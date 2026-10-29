(() => {
  const E=PixelCity,TW=32,TH=16;
  function polygon(ctx,points,color,stroke) {
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=0.6;ctx.stroke();}
  }
  const diamond=(ctx,color)=>polygon(ctx,[[0,-8],[16,0],[0,8],[-16,0]],color);
  function block(ctx,w,d,h,left,right,roof) {
    polygon(ctx,[[-w,0],[0,d],[0,d-h],[-w,-h]],left);
    polygon(ctx,[[0,d],[w,0],[w,-h],[0,d-h]],right);
    polygon(ctx,[[0,-d-h],[w,-h],[0,d-h],[-w,-h]],roof);
  }
  function tree(ctx,x,y,variant=0) {
    ctx.fillStyle='#775338';ctx.fillRect(x-1,y-8,3,11);
    ctx.fillStyle=['#4a8051','#4c925d','#6b9c56'][variant%3];
    ctx.fillRect(x-5,y-16,11,10);ctx.fillRect(x-8,y-12,16,7);ctx.fillRect(x-3,y-19,7,5);
    ctx.fillStyle='#95b66a';ctx.fillRect(x-4,y-15,3,3);
  }
  function sprite(ctx,type,x,y,scale=1,variant=0,time=0) {
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    if(type==='house') {
      block(ctx,10,5,13,'#e8d9b1','#cbbb98',['#ca7059','#ca9961','#79a296'][variant%3]);
      ctx.fillStyle='#3f5551';ctx.fillRect(-8,-8,3,4);ctx.fillRect(3,-6,3,4);ctx.fillRect(-1,-3,3,7);
      ctx.fillStyle='#f8d98c';ctx.fillRect(-8,-8,2,2);ctx.fillRect(3,-6,2,2);
      ctx.fillStyle='#a45448';ctx.fillRect(3,-22,3,6);ctx.fillStyle='#e2ad8b';ctx.fillRect(3,-22,3,2);
    } else if(type==='shop') {
      block(ctx,11,5,14,'#eac789','#d4aa70','#a1bfbd');
      ctx.fillStyle='#567f7a';ctx.fillRect(-10,-10,8,7);ctx.fillRect(2,-8,7,8);
      ctx.fillStyle='#e78163';ctx.fillRect(-12,-8,14,3);ctx.fillRect(0,-6,12,3);
      ctx.fillStyle='#fbdfad';for(let a=-11;a<0;a+=4)ctx.fillRect(a,-8,2,3);for(let a=1;a<11;a+=4)ctx.fillRect(a,-6,2,3);
      ctx.fillStyle='#f8e8bc';ctx.fillRect(-4,-19,8,4);ctx.fillStyle='#779a86';ctx.fillRect(-2,-18,4,2);
    } else if(type==='factory') {
      block(ctx,12,6,12,'#a3978a','#827d73','#c6b9a4');
      ctx.fillStyle='#697773';for(let a=-9;a<10;a+=5)ctx.fillRect(a,-7,3,4);
      ctx.fillStyle='#967363';ctx.fillRect(4,-30,5,21);ctx.fillStyle='#c8ae92';ctx.fillRect(4,-29,5,3);ctx.fillRect(4,-20,5,2);
      ctx.fillStyle='#e3dfcd';const rise=Math.floor(time/450)%5;ctx.fillRect(4+rise,-35-rise,5,4);ctx.fillRect(8+rise,-40-rise,7,4);
    } else if(type==='solar') {
      block(ctx,12,6,3,'#71877c','#60766e','#5d8199');
      polygon(ctx,[[-12,-4],[0,-10],[13,-4],[0,2]],'#4b7495');
      ctx.strokeStyle='#a4c5c5';ctx.lineWidth=0.7;
      for(let a=-8;a<11;a+=4){ctx.beginPath();ctx.moveTo(a,-6+Math.abs(a)*0.25);ctx.lineTo(a+5,-1+Math.abs(a)*-0.15);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(5,-8);ctx.stroke();
    } else if(type==='water') {
      ctx.fillStyle='#849591';ctx.fillRect(-6,-12,2,15);ctx.fillRect(5,-12,2,15);
      block(ctx,10,4,15,'#9cc0c0','#729baf','#d8e0ce');
      ctx.fillStyle='#d3e0d8';ctx.fillRect(-10,-9,10,2);ctx.fillRect(0,-6,9,2);
      ctx.fillStyle='#6f98b7';ctx.fillRect(-3,-21,6,4);ctx.fillStyle='#dbe7d5';ctx.fillRect(-1,-25,2,4);
    } else if(type==='clinic') {
      block(ctx,12,6,17,'#f2e8cc','#cfdbbe','#89b4a1');
      ctx.fillStyle='#bd6a59';ctx.fillRect(-7,-12,3,8);ctx.fillRect(-10,-10,9,3);
      ctx.fillStyle='#56888b';ctx.fillRect(3,-8,4,6);ctx.fillStyle='#b7d6c3';ctx.fillRect(3,-8,4,2);
      ctx.fillStyle='#d9d7b7';ctx.fillRect(-3,2,6,3);
    } else if(type==='townhall') {
      block(ctx,13,6,20,'#ede0b8','#cab78f','#7a9a8c');
      for(const a of [-10,-5,1,6]){ctx.fillStyle='#62817b';ctx.fillRect(a,-12,3,5);}
      ctx.fillStyle='#826549';ctx.fillRect(-2,-5,5,10);ctx.fillStyle='#ecd6a6';ctx.fillRect(-7,4,14,2);ctx.fillRect(-10,6,20,2);
      ctx.fillStyle='#8d7756';ctx.fillRect(0,-36,1,13);ctx.fillStyle='#dc9871';ctx.fillRect(1,-36,8,5);
    } else if(type==='park') {
      diamond(ctx,'#7eaa67');tree(ctx,-5,-2,1);tree(ctx,7,3,2);
      ctx.fillStyle='#c5bd89';ctx.fillRect(-3,3,7,2);ctx.fillStyle='#67714c';ctx.fillRect(-2,5,1,2);ctx.fillRect(2,5,1,2);
    } else if(type==='road') {
      diamond(ctx,'#7d8275');polygon(ctx,[[0,-7],[14,0],[0,7],[-14,0]],'#929887');
      ctx.fillStyle='#d8d2ab';ctx.fillRect(-6,-1,4,1);ctx.fillRect(3,2,4,1);
    } else if(type==='bulldoze') {
      ctx.fillStyle='#b78252';ctx.fillRect(-11,-5,22,8);ctx.fillStyle='#e8bc62';ctx.fillRect(-8,-14,12,11);ctx.fillRect(3,-9,11,7);
      ctx.fillStyle='#686e5e';ctx.fillRect(-8,-1,4,6);ctx.fillRect(7,-1,4,6);ctx.fillStyle='#65878a';ctx.fillRect(-5,-12,6,5);
    } else if(type==='hand') {
      ctx.strokeStyle='#67847a';ctx.lineWidth=3;
      for(const a of [-1,1]) {ctx.beginPath();ctx.moveTo(a*12,0);ctx.lineTo(a*6,-5);ctx.moveTo(a*12,0);ctx.lineTo(a*6,5);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.stroke();
    }
    ctx.restore();
  }
  class CityRenderer {
    constructor(canvas) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.width=0;this.height=0;this.zoom=1;this.x=0;this.y=0;this.hover=null;}
    resize() {
      const rect=this.canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(rect.width/2)),h=Math.max(1,Math.floor(rect.height/2));
      if(w===this.width&&h===this.height)return;
      this.canvas.width=this.width=w;this.canvas.height=this.height=h;this.ctx.imageSmoothingEnabled=false;this.center();
    }
    center() {this.zoom=Math.max(0.2,Math.min((this.width-30)/(E.SIZE*TW),(this.height-40)/(E.SIZE*TH+40),1.25));this.x=this.width/2;this.y=(this.height-(E.SIZE-1)*TH*this.zoom)/2+14*this.zoom;}
    project(x,y) {return {x:this.x+(x-y)*16*this.zoom,y:this.y+(x+y)*8*this.zoom};}
    pick(clientX,clientY) {
      const rect=this.canvas.getBoundingClientRect(),mx=((clientX-rect.left)*this.width/rect.width-this.x)/this.zoom,
        my=((clientY-rect.top)*this.height/rect.height-this.y)/this.zoom;
      const x=Math.floor((mx/16+my/8)/2+0.5),y=Math.floor((my/8-mx/16)/2+0.5);
      return E.inBounds(x,y)?{x,y}:null;
    }
    zoomBy(factor) {
      const next=Math.max(0.2,Math.min(2,this.zoom*factor)),ratio=next/this.zoom;
      this.x=this.width/2+(this.x-this.width/2)*ratio;
      this.y=this.height/2+(this.y-this.height/2)*ratio;
      this.zoom=next;
    }
    pan(dx,dy) {const rect=this.canvas.getBoundingClientRect();this.x+=dx*this.width/rect.width;this.y+=dy*this.height/rect.height;}
    draw(state,report,tool,time) {
      const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#cbd8b9';ctx.fillRect(0,0,this.width,this.height);
      ctx.fillStyle='#dfe6cd';for(let a=0;a<4;a++){const cx=(a*117+30)%this.width,cy=18+a*19;ctx.fillRect(cx,cy,22,3);ctx.fillRect(cx+5,cy-3,12,3);}
      ctx.save();ctx.translate(this.x,this.y);ctx.scale(this.zoom,this.zoom);
      for(let sum=0;sum<E.SIZE*2-1;sum++)for(let x=0;x<E.SIZE;x++) {
        const y=sum-x;if(!E.inBounds(x,y))continue;
        const id=E.index(x,y),tile=state.tiles[id],px=(x-y)*16,py=(x+y)*8,noise=(Math.imul(id+state.seed,2654435761)>>>0);
        ctx.save();ctx.translate(px,py);
        polygon(ctx,[[-16,0],[0,8],[16,0],[16,4],[0,12],[-16,4]],tile.terrain==='water'?'#82a5a0':'#a8a77a');
        if(tile.terrain==='water') {
          diamond(ctx,['#80b8be','#86bdc1','#7ab1bb'][noise%3]);
          ctx.fillStyle='#b2d5cb';ctx.fillRect(-6+Math.floor(time/500+id)%4,0,5,1);ctx.fillRect(5,-2,3,1);
        } else {
          polygon(ctx,[[0,-8],[16,0],[0,8],[-16,0]],['#9cbc77','#a3c17d','#a9c683'][noise%3],'#88a466');
          if(tile.type==='empty') {
            if(noise%11===0)tree(ctx,0,-1,noise%3);
            else {ctx.fillStyle='#c2d394';ctx.fillRect(-7,-1,2,1);if(noise%5===0){ctx.fillStyle='#eee3a1';ctx.fillRect(4,1,2,1);}}
          }
        }
        if(tile.type!=='empty') {
          sprite(ctx,tile.type,0,0,1,noise,time);
          if(tile.type==='road'&&report.roads.has(id)&&noise%5===0) {
            const vertical=state.tiles[E.index(x,y-1)]?.type==='road'||state.tiles[E.index(x,y+1)]?.type==='road';
            const offset=(time/1300+id)%1-0.5;
            ctx.fillStyle=['#f2d382','#dba18b','#d9e6cd'][noise%3];ctx.fillRect(Math.round(offset*(vertical?-15:15))-2,Math.round(offset*7)-2,4,2);
          }
          if(!['road','townhall'].includes(tile.type)&&(!report.connected.has(id)||(report.supply<1&&E.BUILDINGS[tile.type].power))) {
            ctx.fillStyle=report.connected.has(id)?'#e7bc59':'#ce8263';ctx.fillRect(9,-24,5,7);ctx.fillStyle='#fff1cd';ctx.fillRect(11,-23,1,3);ctx.fillRect(11,-19,1,1);
          }
        }
        ctx.restore();
      }
      if(this.hover&&tool!=='hand') {
        const {x,y}=this.hover,valid=E.canBuild(state,x,y,tool).ok;
        ctx.save();ctx.translate((x-y)*16,(x+y)*8);
        polygon(ctx,[[0,-8],[16,0],[0,8],[-16,0]],valid?'#d6e6ab77':'#d77c6b55',valid?'#f8f2cd':'#c16858');
        ctx.restore();
        if(valid&&tool!=='bulldoze'){ctx.globalAlpha=0.55;sprite(ctx,tool,(x-y)*16,(x+y)*8,1,0,time);ctx.globalAlpha=1;}
      }
      ctx.restore();
    }
    static icon(canvas,type) {const ctx=canvas.getContext('2d');ctx.clearRect(0,0,40,40);sprite(ctx,type,20,29,0.95,0,0);}
  }
  globalThis.CityRenderer=CityRenderer;
})();
