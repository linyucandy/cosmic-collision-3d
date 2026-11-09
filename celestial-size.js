(function(root){
  // Representative radii at each type's baseline mass, relative to Earth.
  // Mass and distance remain game units; the curves are gameplay approximations.
  const models={planet:[1,1/3],gasGiant:[11,.12],ringplanet:[9.14,.12],star:[109,.25],redDwarf:[32.7,.25],orangeDwarf:[81.75,.25],hotSubdwarf:[21.8,.25],wolfRayet:[545,.3],brownDwarf:[11,.05],whiteDwarf:[1,-.1],neutron:[.0016,.05],quarkStar:[.0013,.05],asteroid:[.015,1/3],comet:[.001,1/3],redGiant:[1090,.3],redSupergiant:[76300,.3],redHypergiant:[152600,.3],blueGiant:[545,.3],blackhole:[.005,1],whitehole:[.005,1],gravastar:[.0055,1],darkMatter:[4000000,1/3],darkHalo:[42000000,1/3],openCluster:[4000000,1/3],globularCluster:[8000000,1/3],galaxySpiral:[28000000,1/3],galaxyElliptical:[28000000,1/3],galaxyIrregular:[28000000,1/3],wormhole:[32,.3],probe:[1,0],sakurai:[545,.3],cepheid:[545,.3],quasar:[.024,1],strangeStar:[.0015,.05],electroweakStar:[.0012,.05],preonStar:[.000001,.05],bosonStar:[.005,.1],solitonStar:[.003,.1],qStar:[.0016,.05],blackDwarf:[1,-.1],blackNeutron:[.0016,.05]};
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
