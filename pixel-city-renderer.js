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
    } else if(['apartment','office','tower','tech','block','hub'].includes(type)) {
      const office=['office','tech','hub'].includes(type),tall=['tower','tech','block','hub'].includes(type),height=['block','hub'].includes(type)?40:tall?34:25;block(ctx,11,5,height,office?'#9ab7b1':'#e1c8a2',office?'#729995':'#c7a989',office?'#8baca1':'#bd8671');
      for(let row=0;row<(tall?5:3);row++)for(const a of [-8,-3,3,8]){ctx.fillStyle=office?'#547c80':'#f4dfab';ctx.fillRect(a,-height+5+row*6,3,3);}
      ctx.fillStyle='#806f5a';ctx.fillRect(-1,-3,3,7);
    } else if(['school','police','library','recycling','hospital','university'].includes(type)) {
      const colors={school:['#e7c6a2','#d2a987','#b67563'],police:['#cad9ce','#a8c0b9','#678b98'],library:['#e7dcb6','#c5bd9c','#789681'],recycling:['#b9c8a1','#9eb38f','#6b9379'],hospital:['#f2e8cc','#cfdbbe','#89b4a1'],university:['#d9c9a4','#b3a58a','#7d9d9b']}[type];
      block(ctx,12,6,16,...colors);ctx.fillStyle='#5e8580';for(const a of [-8,-3,3,8])ctx.fillRect(a,-10,3,4);
      ctx.fillStyle='#f0d49b';ctx.fillRect(-3,-21,7,4);ctx.fillStyle=type==='police'?'#7298a6':type==='recycling'?'#74a079':'#d2936c';ctx.fillRect(-1,-20,3,2);
      if(type==='hospital'){ctx.fillStyle='#bd6a59';ctx.fillRect(-8,-12,2,7);ctx.fillRect(-10,-10,6,2);}
    } else if(type==='wind') {
      diamond(ctx,'#93b782');ctx.fillStyle='#e6e5ce';ctx.fillRect(-1,-26,3,28);ctx.fillStyle='#b9c5b4';ctx.fillRect(-2,-27,5,4);
      ctx.save();ctx.translate(0,-25);ctx.rotate(time*.001);ctx.fillStyle='#f1eee0';for(let n=0;n<3;n++){ctx.rotate(Math.PI*2/3);ctx.fillRect(-1,-14,3,13);}ctx.restore();
    } else if(type==='pump') {
      block(ctx,11,5,12,'#bdd4cb','#91b2b4','#82abb1');ctx.fillStyle='#648eaa';ctx.fillRect(-7,-8,5,5);ctx.fillRect(3,-6,5,5);ctx.fillStyle='#e4ead7';ctx.fillRect(-4,-19,8,4);ctx.fillStyle='#7caebc';ctx.fillRect(-1,-18,2,5);
    } else if(type==='field'||type==='vegetable') {
      diamond(ctx,'#99774b');
      for(let row=0;row<4;row++)for(let col=0;col<4;col++){const a=(col-row)*3,b=(col+row)*1.5-4;ctx.fillStyle=type==='field'?'#e0c267':'#668f46';ctx.fillRect(a-1,b-4,2,5);ctx.fillStyle=type==='field'?'#f3dd86':'#b2cb6b';ctx.fillRect(a-2,b-5,3,2);}
    } else if(type==='barn'||type==='coop') {
      diamond(ctx,'#89ad6c');block(ctx,8,4,12,'#c78265','#a9604f','#f0d7a3');
      ctx.fillStyle='#725843';ctx.fillRect(-3,-5,5,8);ctx.fillStyle='#e6d8a9';ctx.fillRect(-12,3,24,2);
      for(const x of [-11,0,10])ctx.fillRect(x,0,1,6);
      const shift=Math.floor(time/900)%2;ctx.fillStyle='#f5e9ce';ctx.fillRect(5,-3+shift,6,3);ctx.fillRect(9,-5+shift,3,3);
      ctx.fillStyle=type==='barn'?'#6c6253':'#d89452';ctx.fillRect(6,-2+shift,2,2);ctx.fillRect(6,0+shift,1,2);ctx.fillRect(9,0+shift,1,2);
    } else if(['mill','bakery','dairy'].includes(type)) {
      block(ctx,11,5,16,'#e2cda8','#bea27b',type==='bakery'?'#bc7d5a':'#8da6a1');
      ctx.fillStyle='#638783';ctx.fillRect(-8,-10,5,5);ctx.fillRect(3,-8,5,6);ctx.fillStyle='#f6e4b4';ctx.fillRect(-3,-20,7,4);
      if(type==='mill'){ctx.strokeStyle='#ddd4af';ctx.lineWidth=2;ctx.save();ctx.translate(0,-16);ctx.rotate(time*.0004);ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.stroke();ctx.restore();}
      else{ctx.fillStyle=type==='bakery'?'#dfb86f':'#eff1d8';ctx.fillRect(-1,-19,3,2);}
    } else if(type==='warehouse'||type==='depot') {
      block(ctx,13,6,13,'#b7ba9e','#929e8e',type==='depot'?'#bc9c6d':'#9eafb1');ctx.fillStyle='#596e66';ctx.fillRect(-10,-8,9,8);ctx.fillRect(2,-6,9,8);
      ctx.fillStyle='#d6b780';ctx.fillRect(-8,-4,5,4);ctx.fillRect(4,-2,5,4);
      if(type==='depot'){ctx.fillStyle='#e8ca86';ctx.fillRect(3,2,11,4);ctx.fillStyle='#57645e';ctx.fillRect(5,5,2,2);ctx.fillRect(11,5,2,2);}
    } else if(type==='greenhouse') {
      block(ctx,12,6,10,'#b3cbb2','#85aaa0','#c6ddd1');ctx.strokeStyle='#e5edce';ctx.lineWidth=1;for(const a of [-8,-3,3,8]){ctx.beginPath();ctx.moveTo(a,-14);ctx.lineTo(a,-2);ctx.stroke();}ctx.fillStyle='#6c9b58';ctx.fillRect(-8,-6,6,3);ctx.fillRect(3,-3,6,3);
    } else if(type==='solarfield') {
      diamond(ctx,'#87a975');for(const [a,b] of [[-6,-3],[6,2]]){ctx.save();ctx.translate(a,b);block(ctx,7,4,4,'#5c8079','#436d78','#638fa6');ctx.strokeStyle='#b7d7d0';ctx.beginPath();ctx.moveTo(-7,-4);ctx.lineTo(7,-4);ctx.stroke();ctx.restore();}
    } else if(type==='reservoir') {
      block(ctx,13,6,5,'#99ac9b','#7f9e9d','#87b9c2');ctx.strokeStyle='#d1e4d7';ctx.lineWidth=1;ctx.strokeRect(-5,-6,8,2);ctx.fillStyle='#d5cfac';ctx.fillRect(8,-9,4,9);
    } else if(['hotel','museum','resort'].includes(type)) {
      block(ctx,12,6,type==='hotel'?28:18,'#ead8b7','#c5b695',type==='museum'?'#86a69b':'#bf9275');ctx.fillStyle='#6b8b86';for(let row=0;row<(type==='hotel'?4:2);row++)for(const a of [-8,-3,3,8])ctx.fillRect(a,-(type==='hotel'?22:13)+row*5,3,3);ctx.fillStyle='#edd898';ctx.fillRect(-2,-(type==='hotel'?33:23),5,3);if(type==='resort')tree(ctx,10,0,1);
    } else if(type==='bus') {
      ctx.fillStyle='#7a9284';ctx.fillRect(-10,-17,1,20);ctx.fillStyle='#e7d69f';ctx.fillRect(-13,-21,7,5);block(ctx,8,4,8,'#afbfad','#84a59a','#d3d7b6');ctx.fillStyle='#517b80';ctx.fillRect(-6,-6,4,4);ctx.fillRect(2,-4,4,4);
    } else if(type==='metro') {
      block(ctx,13,6,12,'#b5c7b7','#8da9a3','#d3d6b9');ctx.fillStyle='#4d6a63';ctx.fillRect(-10,-8,8,10);ctx.fillRect(2,-5,8,9);ctx.fillStyle='#d3a36d';ctx.fillRect(-4,-20,9,5);ctx.fillStyle='#f9ecd1';ctx.fillRect(-2,-19,2,3);ctx.fillRect(1,-19,2,3);
    } else if(type==='tradeport') {
      block(ctx,11,5,10,'#b7b49c','#8e9e94','#9fb6ae');ctx.fillStyle='#d4aa6c';ctx.fillRect(-9,-30,2,27);ctx.fillRect(-9,-30,23,2);ctx.fillRect(11,-29,1,15);ctx.fillStyle='#9d795b';ctx.fillRect(5,-13,9,6);ctx.fillStyle='#c4a076';ctx.fillRect(-5,-7,7,5);
    } else if(type==='mall') {
      block(ctx,14,7,19,'#dbd4b1','#a6b8a5','#779c99');ctx.fillStyle='#567d7c';ctx.fillRect(-12,-11,10,7);ctx.fillRect(2,-9,10,8);
      ctx.fillStyle='#e1a475';ctx.fillRect(-13,-5,13,3);ctx.fillRect(1,-3,12,3);ctx.fillStyle='#f2e0ae';ctx.fillRect(-4,-25,9,5);ctx.fillStyle='#bd815c';ctx.fillRect(-2,-24,5,2);
    } else if(type==='townhall') {
      block(ctx,13,6,20,'#ede0b8','#cab78f','#7a9a8c');
      for(const a of [-10,-5,1,6]){ctx.fillStyle='#62817b';ctx.fillRect(a,-12,3,5);}
      ctx.fillStyle='#826549';ctx.fillRect(-2,-5,5,10);ctx.fillStyle='#ecd6a6';ctx.fillRect(-7,4,14,2);ctx.fillRect(-10,6,20,2);
      ctx.fillStyle='#8d7756';ctx.fillRect(0,-36,1,13);ctx.fillStyle='#dc9871';ctx.fillRect(1,-36,8,5);
    } else if(type==='park') {
      diamond(ctx,'#7eaa67');tree(ctx,-5,-2,1);tree(ctx,7,3,2);
      ctx.fillStyle='#c5bd89';ctx.fillRect(-3,3,7,2);ctx.fillStyle='#67714c';ctx.fillRect(-2,5,1,2);ctx.fillRect(2,5,1,2);
    } else if(type==='road'||type==='bridge') {
      diamond(ctx,'#7d8275');polygon(ctx,[[0,-7],[14,0],[0,7],[-14,0]],'#929887');
      ctx.fillStyle='#d8d2ab';ctx.fillRect(-6,-1,4,1);ctx.fillRect(3,2,4,1);
      if(type==='bridge'){ctx.strokeStyle='#e7dbc0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-14,-2);ctx.lineTo(0,5);ctx.lineTo(14,-2);ctx.stroke();}
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
      this.invalidate();
    }
    center() {this.zoom=Math.max(0.2,Math.min((this.width-30)/(20*TW),(this.height-40)/(20*TH+40),1.25));this.focus(10,10);}
    focus(x,y) {this.x=this.width/2-(x-y)*16*this.zoom;this.y=this.height/2-(x+y)*8*this.zoom;}
    focusRegion(area){this.zoom=Math.max(.12,Math.min((this.width-30)/(32*TW),(this.height-40)/(32*TH+40),.9));this.focus(...area.center);}
    viewCenter(){const mx=(this.width/2-this.x)/this.zoom,my=(this.height/2-this.y)/this.zoom;return {x:(mx/16+my/8)/2,y:(my/8-mx/16)/2};}
    project(x,y) {return {x:this.x+(x-y)*16*this.zoom,y:this.y+(x+y)*8*this.zoom};}
    pick(clientX,clientY) {
      const rect=this.canvas.getBoundingClientRect(),mx=((clientX-rect.left)*this.width/rect.width-this.x)/this.zoom,
        my=((clientY-rect.top)*this.height/rect.height-this.y)/this.zoom;
      const x=Math.floor((mx/16+my/8)/2+0.5),y=Math.floor((my/8-mx/16)/2+0.5);
      return E.inBounds(x,y)?{x,y}:null;
    }
    zoomBy(factor) {
      const next=Math.max(0.08,Math.min(2,this.zoom*factor)),ratio=next/this.zoom;
      this.x=this.width/2+(this.x-this.width/2)*ratio;
      this.y=this.height/2+(this.y-this.height/2)*ratio;
      this.zoom=next;
    }
    pan(dx,dy) {const rect=this.canvas.getBoundingClientRect();this.x+=dx*this.width/rect.width;this.y+=dy*this.height/rect.height;}
    invalidate(){this.sceneDirty=true;}
    draw(state,report,tool,time) {
      const padding=48,cameraMoved=!this.sceneCamera||this.sceneCamera.x!==this.x||this.sceneCamera.y!==this.y||this.sceneCamera.zoom!==this.zoom;
      if(!this.scene||this.sceneDirty||cameraMoved&&time-this.sceneTime>100||this.zoom>=.2&&this.width/this.zoom<850&&time-this.sceneTime>250){
        if(!this.scene)this.scene=document.createElement('canvas');
        if(this.scene.width!==this.width+padding*2)this.scene.width=this.width+padding*2;if(this.scene.height!==this.height+padding*2)this.scene.height=this.height+padding*2;
        const ctx=this.ctx,width=this.width,height=this.height,x=this.x,y=this.y,sceneCtx=this.scene.getContext('2d');sceneCtx.imageSmoothingEnabled=false;
        this.ctx=sceneCtx;this.width+=padding*2;this.height+=padding*2;this.x+=padding;this.y+=padding;
        this.drawWorld(state,report,'hand',time);
        this.ctx=ctx;this.width=width;this.height=height;this.x=x;this.y=y;
        this.sceneCamera={x,y,zoom:this.zoom};this.sceneTime=time;this.sceneDirty=false;
      }
      const ctx=this.ctx,ratio=this.zoom/this.sceneCamera.zoom;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#cbd8b9';ctx.fillRect(0,0,this.width,this.height);
      ctx.drawImage(this.scene,this.x-this.sceneCamera.x*ratio-padding*ratio,this.y-this.sceneCamera.y*ratio-padding*ratio,this.scene.width*ratio,this.scene.height*ratio);
      if(this.hover&&tool!=='hand'){
        const {x,y}=this.hover,valid=E.canBuild(state,x,y,tool).ok;ctx.save();ctx.translate(this.x,this.y);ctx.scale(this.zoom,this.zoom);ctx.translate((x-y)*16,(x+y)*8);
        polygon(ctx,[[0,-8],[16,0],[0,8],[-16,0]],valid?'#d6e6ab77':'#d77c6b55',valid?'#f8f2cd':'#c16858');
        if(valid&&tool!=='bulldoze'){ctx.globalAlpha=.55;sprite(ctx,tool,0,0,1,0,time);}ctx.restore();
      }
      if(this.showTradeRoutes&&report.economy){
        ctx.save();ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
        for(const flow of report.economy.flows){const from=E.AREAS.find(a=>a.id===flow.from),to=E.AREAS.find(a=>a.id===flow.to),a=this.project(...from.center),b=this.project(...to.center);ctx.strokeStyle=flow.amount?'#427c70':'#aa9371';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(flow.amount){const t=(time/2400+flow.id*.17)%1;ctx.fillStyle='#f7e6a2';ctx.fillRect(a.x+(b.x-a.x)*t-2,a.y+(b.y-a.y)*t-2,4,4);}}
        ctx.restore();
      }
    }
    drawWorld(state,report,tool,time) {
      const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#cbd8b9';ctx.fillRect(0,0,this.width,this.height);
      ctx.fillStyle='#dfe6cd';for(let a=0;a<4;a++){const cx=(a*117+30)%this.width,cy=18+a*19;ctx.fillRect(cx,cy,22,3);ctx.fillRect(cx+5,cy-3,12,3);}
      ctx.save();ctx.translate(this.x,this.y);ctx.scale(this.zoom,this.zoom);
      const corners=[[-80,-80],[this.width+80,-80],[-80,this.height+80],[this.width+80,this.height+80]].map(([sx,sy])=>{const mx=(sx-this.x)/this.zoom,my=(sy-this.y)/this.zoom;return [(mx/16+my/8)/2,(my/8-mx/16)/2];});
      const minX=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),maxX=Math.min(E.SIZE-1,Math.ceil(Math.max(...corners.map(p=>p[0])))),minY=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))),maxY=Math.min(E.SIZE-1,Math.ceil(Math.max(...corners.map(p=>p[1]))));
      for(let sum=minX+minY;sum<=maxX+maxY;sum++)for(let x=Math.max(minX,sum-maxY);x<=Math.min(maxX,sum-minY);x++) {
        const y=sum-x;if(!E.inBounds(x,y))continue;
        const id=E.index(x,y),tile=state.tiles[id],px=(x-y)*16,py=(x+y)*8,noise=(Math.imul(id+state.seed,2654435761)>>>0);
        const screenX=this.x+px*this.zoom,screenY=this.y+py*this.zoom;
        if(screenX< -60||screenX>this.width+60||screenY< -80||screenY>this.height+60)continue;
        if(this.zoom<.2){ctx.save();ctx.translate(px,py);diamond(ctx,!state.areas.includes(E.areaAt(x,y))?'#71896a':tile.terrain==='water'?'#86bdc1':tile.type==='empty'?'#a3c17d':['road','bridge'].includes(tile.type)?'#a7aa8d':'#ae9470');ctx.restore();continue;}
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
          if(['road','bridge'].includes(tile.type)&&report.roads.has(id)&&noise%5===0) {
            const vertical=state.tiles[E.index(x,y-1)]?.type==='road'||state.tiles[E.index(x,y+1)]?.type==='road';
            const offset=(time/1300+id)%1-0.5;
            ctx.fillStyle=['#f2d382','#dba18b','#d9e6cd'][noise%3];ctx.fillRect(Math.round(offset*(vertical?-15:15))-2,Math.round(offset*7)-2,4,2);
          }
          if(!['road','bridge','townhall'].includes(tile.type)&&(!report.connected.has(id)||(report.supply<1&&E.BUILDINGS[tile.type].power))) {
            ctx.fillStyle=report.connected.has(id)?'#e7bc59':'#ce8263';ctx.fillRect(9,-24,5,7);ctx.fillStyle='#fff1cd';ctx.fillRect(11,-23,1,3);ctx.fillRect(11,-19,1,1);
          }
        }
        if(!state.areas.includes(E.areaAt(x,y)))polygon(ctx,[[0,-8],[16,0],[0,8],[-16,0]],'#304c3a66');
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
