(function(){
  var canvas = document.getElementById('bg-canvas');
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w, h, dpr;
  var points = [];
  var mouse = { x: null, y: null, active: false };
  var NUM_POINTS = 130;
  var LINK_DIST = 160;
  var MOUSE_DIST = 200;
  var pulses = [];
  var glowEl = document.getElementById('bg-glow');
  var flashEl = document.getElementById('bg-flash');
  var t = 0;
  var drops = [];
  var NUM_DROPS = 90;
  var lightning = null;
  var nextBoltAt = 90 + Math.random()*200;
  var frame = 0;
  var weatherMode = 'storm';
  var weatherBadge = document.getElementById('weather-badge');

  function resize(){
    dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function makePoints(){
    points = [];
    var count = w < 760 ? 55 : NUM_POINTS;
    for (var i=0;i<count;i++){
      var isHub = Math.random() < 0.16;
      points.push({
        x: Math.random()*w,
        y: Math.random()*h,
        vx: (Math.random()-0.5)*0.9,
        vy: (Math.random()-0.5)*0.9,
        r: isHub ? (2.6 + Math.random()*1.6) : (1.2 + Math.random()*0.9),
        hub: isHub
      });
    }

    drops = [];
    var dcount = w < 760 ? 45 : NUM_DROPS;
    for (var i=0;i<dcount;i++){
      drops.push({
        x: Math.random()*w,
        y: Math.random()*h,
        len: 12 + Math.random()*16,
        speed: 5 + Math.random()*7,
        alpha: 0.08 + Math.random()*0.14
      });
    }
  }

  function makeBoltPath(){
    var startX = Math.random()*w*0.8 + w*0.1;
    var segments = 6 + Math.floor(Math.random()*3);
    var path = [{x:startX, y: -10}];
    var y = -10;
    var x = startX;
    var segH = (h*0.75) / segments;
    for (var i=0;i<segments;i++){
      y += segH;
      x += (Math.random()-0.5)*70;
      path.push({x:x, y:y});
    }
    return path;
  }

  function maybeSpawnLightning(){
    if (reduceMotion) return;
    frame++;
    if (frame >= nextBoltAt){
      lightning = { path: makeBoltPath(), life: 0, maxLife: 10 };
      flashEl.style.background = 'rgba(210,225,255,0.16)';
      setTimeout(function(){ flashEl.style.background = 'rgba(210,225,255,0.05)'; }, 70);
      setTimeout(function(){ flashEl.style.background = 'rgba(210,225,255,0)'; }, 180);
      frame = 0;
      nextBoltAt = 260 + Math.random()*420;
    }
  }

  function maybeSpawnPulse(){
    if (reduceMotion) return;
    if (Math.random() < 0.035 && points.length){
      var hubs = points.filter(function(p){ return p.hub; });
      var src = hubs.length ? hubs[Math.floor(Math.random()*hubs.length)] : points[Math.floor(Math.random()*points.length)];
      pulses.push({ x: src.x, y: src.y, r: 0, maxR: 90 + Math.random()*70, alpha: 0.55 });
    }
  }

  function step(){
    ctx.clearRect(0,0,w,h);
    t += 0.6;
    var hue = (t * 0.4) % 360;

    for (var i=0;i<points.length;i++){
      var p = points[i];
      if (!reduceMotion){
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
    }

    for (var i=0;i<points.length;i++){
      for (var j=i+1;j<points.length;j++){
        var a = points[i], b = points[j];
        var dx = a.x-b.x, dy = a.y-b.y;
        var dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < LINK_DIST){
          var alpha = (1 - dist/LINK_DIST) * 0.22;
          ctx.strokeStyle = 'hsla(' + ((hue + i*4) % 360) + ',70%,65%,' + alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
      if (mouse.active){
        var dx = points[i].x - mouse.x, dy = points[i].y - mouse.y;
        var dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < MOUSE_DIST){
          var alpha = (1 - dist/MOUSE_DIST) * 0.35;
          ctx.strokeStyle = 'rgba(95,168,211,' + alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    for (var i=0;i<points.length;i++){
      var p = points[i];
      if (p.hub){
        var grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);
        grad.addColorStop(0,'rgba(95,168,211,0.35)');
        grad.addColorStop(1,'rgba(95,168,211,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r*6,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(95,168,211,0.85)';
      } else {
        ctx.fillStyle = 'rgba(142,157,166,0.55)';
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }

    if (weatherMode === 'storm') maybeSpawnLightning();

    if (weatherMode === 'rain' || weatherMode === 'storm'){
      for (var i=0;i<drops.length;i++){
        var d = drops[i];
        if (!reduceMotion){
          d.y += d.speed;
          d.x -= d.speed*0.25;
          if (d.y > h){ d.y = -20; d.x = Math.random()*w; }
        }
        ctx.strokeStyle = 'rgba(180,200,220,' + d.alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len*0.25, d.y + d.len);
        ctx.stroke();
      }
    } else if (weatherMode === 'snow'){
      for (var i=0;i<drops.length;i++){
        var d = drops[i];
        if (!reduceMotion){
          d.y += d.speed*0.35;
          d.x += Math.sin((d.y+i)*0.02)*0.6;
          if (d.y > h){ d.y = -10; d.x = Math.random()*w; }
        }
        ctx.fillStyle = 'rgba(230,238,245,' + (d.alpha+0.2) + ')';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.6, 0, Math.PI*2);
        ctx.fill();
      }
    }

    if (lightning){
      lightning.life++;
      var lp = lightning.path;
      var fade = 1 - (lightning.life / lightning.maxLife);
      if (fade > 0){
        ctx.save();
        ctx.shadowColor = 'rgba(200,220,255,0.9)';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(225,235,255,' + Math.max(fade,0) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lp[0].x, lp[0].y);
        for (var i=1;i<lp.length;i++) ctx.lineTo(lp[i].x, lp[i].y);
        ctx.stroke();
        ctx.restore();
      } else {
        lightning = null;
      }
    }

    maybeSpawnPulse();
    for (var i=pulses.length-1;i>=0;i--){
      var pu = pulses[i];
      pu.r += 1.1;
      pu.alpha = 0.5 * (1 - pu.r/pu.maxR);
      if (pu.r >= pu.maxR){ pulses.splice(i,1); continue; }
      ctx.strokeStyle = 'rgba(242,184,75,' + Math.max(pu.alpha,0) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI*2);
      ctx.stroke();
    }

    if (!reduceMotion) requestAnimationFrame(step);
  }

  function classifyWeather(code){
    if (code === 0) return 'clear';
    if (code >= 1 && code <= 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 95) return 'storm';
    return 'cloudy';
  }

  function describeWeather(code){
    var map = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
      45:'Foggy',48:'Foggy',51:'Light drizzle',53:'Drizzle',55:'Drizzle',
      61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',
      71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',
      80:'Rain showers',81:'Rain showers',82:'Heavy showers',
      95:'Thunderstorm',96:'Thunderstorm',99:'Severe thunderstorm'};
    return map[code] || 'Unknown';
  }

  function applyWeather(cw, approx){
    weatherMode = classifyWeather(cw.weathercode);
    var label = describeWeather(cw.weathercode);
    var temp = Math.round(cw.temperature);
    if (weatherBadge){
      weatherBadge.textContent = temp + '°C · ' + label + (approx ? ' (approx. location)' : '');
    }
  }

  function initWeather(){
    var fallbackLat = 22.57, fallbackLon = 88.36; // Kolkata fallback

    function fetchWeather(lat, lon, approx){
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true')
        .then(function(r){ return r.json(); })
        .then(function(data){
          if (data && data.current_weather) applyWeather(data.current_weather, approx);
        })
        .catch(function(){
          if (weatherBadge) weatherBadge.textContent = 'Weather unavailable';
        });
    }

    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        function(pos){ fetchWeather(pos.coords.latitude, pos.coords.longitude, false); },
        function(){ fetchWeather(fallbackLat, fallbackLon, true); },
        { timeout: 6000 }
      );
    } else {
      fetchWeather(fallbackLat, fallbackLon, true);
    }
  }

  window.addEventListener('resize', function(){ resize(); makePoints(); });
  window.addEventListener('mousemove', function(e){
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    glowEl.style.setProperty('--mx', e.clientX + 'px');
    glowEl.style.setProperty('--my', e.clientY + 'px');
  });
  window.addEventListener('mouseleave', function(){ mouse.active = false; });

  resize();
  makePoints();
  initWeather();
  step();
  if (reduceMotion){ step(); }
})();
