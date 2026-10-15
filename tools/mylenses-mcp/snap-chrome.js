// Snap camera chrome simulator — injects a pixel-overlay of Snapchat's native
// UI on top of a Web Lens build running in a 720x1280 Playwright viewport, so
// we can see exactly what gets covered without publishing. Reference: Lens
// Studio Preview screenshots (iPhone 8/13 Pro/14 Pro/14 Pro Max/Galaxy S20)
// plus a real-device capture. Modes: "camera" (carousel + bottom nav) and
// "send" (Send-To bar + right edit toolbar + close X).
//
// Usage: await page.evaluate(SNAP_CHROME_SOURCE + `; snapChrome("camera")`)
// or load with addInitScript for automatic injection.

const SNAP_CHROME_CSS = `
#snap-chrome { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
  font-family: -apple-system, Helvetica, Arial, sans-serif; }
#snap-chrome .sc { position: absolute; }
/* status bar */
#snap-chrome .status { top: 0; left: 0; right: 0; height: 54px;
  color: #fff; font-size: 22px; font-weight: 600; }
#snap-chrome .status .time { left: 34px; top: 14px; position: absolute; }
#snap-chrome .status .icons { right: 26px; top: 14px; position: absolute;
  display: flex; gap: 8px; align-items: center; font-size: 15px; }
#snap-chrome .island { top: 12px; left: 50%; transform: translateX(-50%);
  width: 170px; height: 48px; background: #000; border-radius: 24px; }
/* left icon column */
#snap-chrome .licol { left: 16px; top: 150px; display: flex; flex-direction: column; gap: 18px; }
#snap-chrome .licol .bitmoji { width: 52px; height: 52px; border-radius: 50%;
  background: #ffd400; position: relative; }
#snap-chrome .licol .bitmoji:after { content: ""; position: absolute; inset: 12px;
  background: rgba(0,0,0,.55); border-radius: 50% 50% 40% 40%; }
#snap-chrome .circ { width: 44px; height: 44px; border-radius: 50%;
  background: rgba(60,60,60,.55); position: relative; }
#snap-chrome .circ:after { content: attr(data-g); position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px; font-weight: 700; }
/* right toolbar */
#snap-chrome .rtb { right: 14px; top: 140px; display: flex; flex-direction: column;
  gap: 4px; align-items: center; }
#snap-chrome .rtb .row { display: flex; gap: 10px; align-items: center; }
#snap-chrome .rtb .stack { background: rgba(60,60,60,.45); border-radius: 26px;
  padding: 10px 8px; display: flex; flex-direction: column; gap: 14px; }
#snap-chrome .rtb .circ { width: 52px; height: 52px; background: rgba(60,60,60,.55); }
#snap-chrome .rtb .stack .circ { width: 44px; height: 44px; background: transparent; }
/* camera bottom: carousel + shutter + nav */
#snap-chrome .carousel { left: 0; right: 0; bottom: 190px; height: 120px;
  display: flex; align-items: center; justify-content: center; gap: 26px; }
#snap-chrome .carousel .lens { width: 88px; height: 88px; border-radius: 50%;
  background: rgba(120,120,120,.35); border: 2px solid rgba(255,255,255,.25); }
#snap-chrome .carousel .shutter { width: 118px; height: 118px; border-radius: 50%;
  border: 6px solid #35a7ff; background: rgba(255,255,255,.75); }
#snap-chrome .navbar { left: 0; right: 0; bottom: 34px; height: 110px;
  background: rgba(0,0,0,.65); display: flex; align-items: center;
  justify-content: space-around; padding: 0 30px; }
#snap-chrome .navbar .nav { display: flex; flex-direction: column; align-items: center;
  gap: 6px; color: #fff; font-size: 21px; }
#snap-chrome .navbar .nav .ic { width: 44px; height: 44px; border-radius: 50%;
  background: rgba(255,255,255,.12); }
#snap-chrome .navbar .nav.active .ic { background: #ffd400; }
#snap-chrome .navbar .nav.active { color: #ffd400; }
#snap-chrome .navbar .nav .x { width: 52px; height: 52px; border-radius: 50%;
  background: rgba(0,0,0,.8); border: 3px solid #fff; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 30px; }
#snap-chrome .home { left: 50%; transform: translateX(-50%); bottom: 14px;
  width: 300px; height: 8px; border-radius: 4px; background: rgba(255,255,255,.85); }
/* send-preview variant */
#snap-chrome .closex { left: 22px; top: 150px; width: 66px; height: 66px;
  border-radius: 50%; background: rgba(40,40,40,.7); }
#snap-chrome .closex:before, #snap-chrome .closex:after { content: ""; position: absolute;
  left: 16px; top: 31px; width: 34px; height: 4px; background: #fff; border-radius: 2px; }
#snap-chrome .closex:before { transform: rotate(45deg); }
#snap-chrome .closex:after { transform: rotate(-45deg); }
#snap-chrome .etb { right: 20px; top: 150px; display: flex; flex-direction: column;
  gap: 30px; align-items: center; }
#snap-chrome .etb .e { color: #fff; font-size: 44px; font-weight: 400;
  text-shadow: 0 1px 3px rgba(0,0,0,.5); }
#snap-chrome .sendbar { left: 0; right: 0; bottom: 40px; height: 120px;
  display: flex; align-items: center; justify-content: space-around; padding: 0 26px; }
#snap-chrome .sendbar .pill { width: 84px; height: 84px; border-radius: 50%;
  background: rgba(40,40,40,.55); position: relative; }
#snap-chrome .sendbar .pill:after { content: attr(data-g); position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 30px; }
#snap-chrome .sendbar .sendto { width: 250px; height: 84px; border-radius: 42px;
  background: #ffe600; color: #000; font-size: 30px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 10px; }
#snap-chrome .sendbar .sendto:after { content: "\\25B6"; font-size: 26px; }
`;

const SNAP_CHROME_HTML_CAMERA = `
<div id="snap-chrome">
  <div class="sc status"><div class="time">9:41</div><div class="icons">&#9673; &#128246; &#9729; &#9646;&#9646;</div></div>
  <div class="sc island"></div>
  <div class="sc licol"><div class="bitmoji"></div><div class="circ" data-g="&#8986;"></div><div class="circ" data-g="i"></div></div>
  <div class="sc rtb"><div class="circ" data-g="+"></div>
    <div class="stack"><div class="circ" data-g="&#8635;"></div><div class="circ" data-g="&#9889;&#215;"></div><div class="circ" data-g="&#9662;"></div></div>
  </div>
  <div class="sc carousel"><div class="lens"></div><div class="lens"></div><div class="lens"></div>
    <div class="shutter"></div><div class="lens"></div><div class="lens"></div><div class="lens"></div></div>
  <div class="sc navbar">
    <div class="nav"><div class="ic"></div>Create</div>
    <div class="nav"><div class="ic"></div>Scan</div>
    <div class="nav"><div class="x">&#215;</div></div>
    <div class="nav active"><div class="ic"></div>Browse</div>
    <div class="nav"><div class="ic"></div>Explore</div>
  </div>
  <div class="sc home"></div>
</div>`;

const SNAP_CHROME_HTML_SEND = `
<div id="snap-chrome">
  <div class="sc status"><div class="icons" style="left:50%;transform:translateX(-50%);right:auto;top:14px">&#9673; &#128246; &#9729; &#9646;&#9646;</div></div>
  <div class="sc closex"></div>
  <div class="sc etb"><div class="e">T</div><div class="e">&#9998;</div><div class="e">&#9986;</div><div class="e">&#128206;</div><div class="e">&#9203;</div></div>
  <div class="sc sendbar"><div class="pill" data-g="&#128266;"></div><div class="pill" data-g="&#8681;"></div>
    <div class="pill" data-g="&#8682;"></div><div class="sendto">Send To</div></div>
  <div class="sc home"></div>
</div>`;

(function () {
  if (window.snapChrome) return;
  var css = SNAP_CHROME_CSS;
  window.snapChrome = function (mode) {
    var old = document.getElementById("snap-chrome");
    if (old) old.remove();
    if (!mode || mode === "off") return;
    if (!document.getElementById("snap-chrome-css")) {
      var st = document.createElement("style");
      st.id = "snap-chrome-css"; st.textContent = css;
      document.head.appendChild(st);
    }
    var div = document.createElement("div");
    div.innerHTML = (mode === "send")
      ? SNAP_CHROME_HTML_SEND
      : SNAP_CHROME_HTML_CAMERA;
    document.body.appendChild(div.querySelector("#snap-chrome"));
    return mode;
  };
})();
