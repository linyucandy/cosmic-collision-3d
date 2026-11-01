(function(root){
  // Representative radii at each type's baseline mass, relative to Earth.
  // Mass and distance remain game units; the curves are gameplay approximations.
  const models={planet:[1,1/3],gasGiant:[11,.12],ringplanet:[9.14,.12],star:[109,.25],brownDwarf:[11,.05],whiteDwarf:[1,-.1],neutron:[.0016,.05],quarkStar:[.0013,.05],asteroid:[.015,1/3],comet:[.001,1/3],redGiant:[1090,.3],blueGiant:[545,.3],blackhole:[.005,1],wormhole:[.005,.3]};
  const radiusFor=(type,mass,types,mode='reference')=>{
    if(mode==='display') return Math.max(1.8,Math.cbrt(mass)*types[type].rk);
    const [ratio,exponent]=models[type];
    return .25*ratio*Math.pow(Math.max(.001,mass)/types[type].base,exponent);
  };
  const volume=r=>4*Math.PI*r*r*r/3;
  const shapeScale=(r,d,t,w)=>{
    const axes=[1+d+t+w,1-.6*d-.7*t,1+d-.5*t-w];
    const factor=r/Math.cbrt(axes[0]*axes[1]*axes[2]);
    return axes.map(v=>v*factor);
  };
  const api={radiusFor,volume,shapeScale};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.CelestialSize=api;
})(globalThis);
