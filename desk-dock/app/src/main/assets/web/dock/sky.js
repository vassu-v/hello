// Living sky: one fragment shader at reduced resolution. Inputs come from sun/moon position + live weather.
const Sky = (() => {
  const cv = document.getElementById("sky");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  const SCALE = 1 / 3, FPS = 24;
  const VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uT;
uniform vec3 uZen,uMid,uHor,uSunCol;uniform vec3 uSun;uniform vec4 uMoon;
uniform float uCloud,uDark,uRain,uSnow,uFog,uStars,uFlash,uLum;uniform vec2 uWind;
float h(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;vec2 p=vec2(uv.x*asp,uv.y);
 // atmosphere: 3-stop gradient, horizon band is thicker (haze)
 float y=uv.y;
 vec3 col=mix(uHor,uMid,smoothstep(0.,.42,y));col=mix(col,uZen,smoothstep(.38,1.,y));
 vec2 sp=vec2(uSun.x*asp,uSun.y);float d=length(p-sp);
 float clear=1.-uCloud*.85;
 col+=uSunCol*(.28*exp(-d*2.2)+.55*exp(-d*9.)+.9*exp(-d*40.))*uSun.z*clear;
 col+=uSunCol*.35*exp(-abs(y-sp.y)*6.)*exp(-abs(p.x-sp.x)*1.2)*uSun.z*clear*step(sp.y,.25); // horizon smear at low sun
 col=mix(col,vec3(1.,.98,.92),smoothstep(.022,.016,d)*uSun.z*(1.-uCloud));
 // stars
 vec2 sg=p*90.;vec2 gi=floor(sg);float r=h(gi);
 vec2 sf=fract(sg)-.5-(vec2(h(gi+3.1),h(gi+7.7))-.5)*.7;
 float tw=.55+.45*sin(uT*(.7+r*2.5)+r*60.);
 float st=step(.985,r)*smoothstep(.16,.0,length(sf))*tw*(r>.997?1.6:.7);
 col+=vec3(.85,.9,1.)*st*uStars*(1.-uCloud)*smoothstep(.05,.35,y);
 // moon with phase
 vec2 mp=vec2(uMoon.x*asp,uMoon.y);vec2 md=p-mp;float mr=.028;float ml=length(md);
 float disc=smoothstep(mr,mr*.9,ml);
 float ph=uMoon.z;float off=ph<.5?-2.*mr*ph*2.:2.*mr*(1.-ph)*2.;
 float lit=disc*smoothstep(mr*.9,mr,length(md-vec2(off,0.)));
 float mare=.85+.15*n(md*160.);
 col=mix(col,vec3(.93,.92,.88)*mare,lit*uMoon.w*(1.-uCloud*.9));
 col+=vec3(.6,.65,.75)*(exp(-ml*18.)*.12+disc*.03)*uMoon.w*(1.-uCloud*.7);
 // clouds: two drifting layers, flattened by perspective toward the horizon
 vec2 w=uWind*uT;
 vec2 cp=vec2(p.x,y*2.6)*1.6/(.35+y*.9);
 float c1=fbm(cp*1.2+w*.010),c2=fbm(cp*2.4-w*.017+5.3);
 float dens=c1*.7+c2*.3;
 float cov=1.-uCloud;
 float cm=smoothstep(cov*.7+.1,cov*.7+.4,dens);
 vec2 tosun=normalize(sp-p+1e-4);
 float dens2=fbm((cp+tosun*.25)*1.2+w*.010)*.7+c2*.3;
 float rim=clamp((dens-dens2)*3.,0.,1.);
 vec3 lit3=mix(uHor*1.05+.08*uLum,vec3(1.),.45*uLum);
 vec3 shade=mix(uMid*.55,vec3(.42,.44,.47)*(.25+uLum*.9),uDark);
 vec3 cc=mix(lit3,shade,smoothstep(.35,.95,dens)*(.45+uDark*.5));
 cc+=uSunCol*rim*.9*uSun.z*(1.-uDark);
 cc=mix(cc,col,smoothstep(.12,0.,y)*.5);
 col=mix(col,cc,cm*(.82+.18*uCloud));
 // overcast flattening + fog veil
 float L=lum(col);col=mix(col,vec3(L),uDark*.45);
 vec3 fogc=mix(uHor,vec3(lum(uHor)),.6)*.9+.04;
 col=mix(col,fogc,uFog*(.55+.4*(1.-y)));
 // rain: 3 layers of wind-slanted streaks
 for(int i=0;i<3;i++){float fi=float(i);
  vec2 rp=p*vec2(55.+fi*30.,3.+fi*1.5);rp.x+=rp.y*uWind.x*.06*(1.+fi*.3);
  rp.y+=uT*(7.+fi*4.);vec2 id=floor(rp);vec2 f=fract(rp);
  float on=step(1.-uRain*(.22+fi*.08),h(id+fi*17.));
  float s=on*smoothstep(.16,0.,abs(f.x-.5-(h(id+.5)-.5)*.6))*smoothstep(0.,.5,f.y)*smoothstep(1.,.7,f.y);
  col+=vec3(.75,.8,.85)*s*(.10+.05*uLum)*(1.-fi*.25);}
 // snow: 3 parallax layers
 for(int i=0;i<3;i++){float fi=float(i);float sc=7.+fi*6.;
  vec2 q=p*sc;q.y+=uT*(.25+fi*.12)*sc*.12;q.x+=sin(uT*.6+q.y*.9+fi)*.35;
  vec2 id=floor(q);vec2 f=fract(q)-.5-(vec2(h(id),h(id+1.3))-.5)*.6;
  float s=step(.55,h(id+fi*9.))*smoothstep(.09-fi*.02,0.,length(f));
  col+=vec3(.95)*s*uSnow*(.9-fi*.25);}
 col+=uFlash*vec3(.75,.8,1.);
 // lens: soft vignette + fine grain (kills banding on the 6-bit-ish LCD)
 col*=1.-.22*pow(length((uv-.5)*vec2(1.,.8)),2.);
 col+=(h(gl_FragCoord.xy+fract(uT*7.)*91.)-.5)*.018;
 gl_FragColor=vec4(col,1.);
}`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uRes","uT","uZen","uMid","uHor","uSunCol","uSun","uMoon","uCloud","uDark","uRain","uSnow","uFog","uStars","uFlash","uLum","uWind"]
    .forEach(k => U[k] = gl.getUniformLocation(pr, k));

  const st = { zen:[0,0,0], mid:[0,0,0], hor:[0,0,0], sunCol:[0,0,0], sun:[0,-1,0], moon:[0,-1,.5,0],
    cloud:0, dark:0, rain:0, snow:0, fog:0, stars:0, lum:0, wind:[1,0], thunder:false };
  let flash = 0, nextFlash = 0, last = 0;
  const t0 = performance.now();

  function resize() {
    cv.width = Math.max(1, Math.round(innerWidth * devicePixelRatio * SCALE));
    cv.height = Math.max(1, Math.round(innerHeight * devicePixelRatio * SCALE));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  addEventListener("resize", resize); resize();

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - last < 1000 / FPS) return;
    last = now; const t = (now - t0) / 1000;
    if (st.thunder) {
      if (t > nextFlash) { flash = .9; nextFlash = t + 8 + Math.random() * 12; setTimeout(() => flash = .7, 140); }
      flash *= .82;
    } else flash = 0;
    gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uT, t);
    gl.uniform3fv(U.uZen, st.zen); gl.uniform3fv(U.uMid, st.mid); gl.uniform3fv(U.uHor, st.hor);
    gl.uniform3fv(U.uSunCol, st.sunCol); gl.uniform3fv(U.uSun, st.sun); gl.uniform4fv(U.uMoon, st.moon);
    ["cloud","dark","rain","snow","fog","stars","lum"].forEach(k => gl.uniform1f(U["u" + k[0].toUpperCase() + k.slice(1)], st[k]));
    gl.uniform1f(U.uFlash, flash); st.flash = flash; gl.uniform2fv(U.uWind, st.wind);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
  return st;
})();
