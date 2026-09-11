/* =====================================================================
   PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL BELOW (between the quotes).
   See setup instructions provided alongside this file.
   ===================================================================== */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3ZC1uykGsacNLGyN75Lv3Xp5BwDaqRkY1WRWTu1F9Txisb0iwGAUAQMxrDZLdzVZz_A/exec";

/* ---------------- matrix rain background ---------------- */
(function(){
  const canvas = document.getElementById('matrix');
  const ctx = canvas.getContext('2d');
  let w, h, columns, drops;
  const chars = '01<>/\\{}[]#$%&*ABCDEF0123456789';
  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    columns = Math.floor(w / 18);
    drops = new Array(columns).fill(0).map(()=> Math.random() * -50);
  }
  window.addEventListener('resize', resize);
  resize();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(){
    ctx.fillStyle = 'rgba(6,10,16,0.12)';
    ctx.fillRect(0,0,w,h);
    ctx.font = '14px monospace';
    for(let i=0;i<columns;i++){
      const char = chars[Math.floor(Math.random()*chars.length)];
      const x = i*18, y = drops[i]*18;
      ctx.fillStyle = Math.random() > 0.96 ? 'rgba(255,176,32,0.5)' : 'rgba(0,217,255,0.25)';
      ctx.fillText(char, x, y);
      if(y > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    if(!reduced) requestAnimationFrame(draw);
  }
  draw();
})();

/* =====================================================================
   CERTIFICATE TEMPLATE CONFIG
   To change the certificate design in the future: just replace the file
   "certificate.png" in this same folder with your new design — no code
   changes needed, AS LONG AS the name should land in roughly the same
   spot. If your new template has the name/date/ID in a different place,
   adjust the percentages below (0 = left/top edge, 100 = right/bottom edge).
   ===================================================================== */
const CERTIFICATE_IMAGE_PATH = 'certificate.png';

const NAME_CONFIG   = { xPercent: 11.6, yPercent: 50, fontSize: 28, font: 'helvetica', style: 'bold', color: [4, 46, 162], align: 'left' };
const SHOW_DATE      = false;
const DATE_CONFIG   = { xPercent: 22, yPercent: 88, fontSize: 11, font: 'courier', style: 'normal', color: [220, 230, 240], align: 'center' };
const SHOW_CERT_ID   = true;
const CERTID_CONFIG = { xPercent: 82, yPercent: 90, fontSize: 11, font: 'helvetica', style: 'normal', color: [255, 255, 255], align: 'center' };

/* ---------------- unique participant ID ---------------- */
function generateUniqueId(){
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'CG-' + stamp + '-' + rand;
}

/* ---------------- load certificate.png once, up front ---------------- */
let certificateTemplateCache = null; // { dataUrl, width, height } once loaded, else null
let certificateLoadFailed = false;

async function loadCertificateTemplate(){
  try{
    const response = await fetch(CERTIFICATE_IMAGE_PATH);
    if(!response.ok) throw new Error('certificate.png not found (HTTP ' + response.status + ')');
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    certificateTemplateCache = { dataUrl, width: dims.w, height: dims.h };
  }catch(err){
    console.warn('Could not load certificate.png — falling back to the built-in design. Reason:', err);
    certificateLoadFailed = true;
  }
}
// Kick this off immediately on page load so it's ready by the time someone submits.
loadCertificateTemplate();

/* ---------------- certificate PDF generation ---------------- */
function generateCertificatePDF(participantName, certId){
  const { jsPDF } = window.jspdf;
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  let doc, pageW, pageH;

  if(certificateTemplateCache){
    // Build a page whose proportions exactly match the uploaded PNG, so it's never stretched or cropped.
    pageW = 297; // mm, fixed baseline width
    pageH = pageW * (certificateTemplateCache.height / certificateTemplateCache.width);
    doc = new jsPDF({ orientation: pageW >= pageH ? 'landscape' : 'portrait', unit: 'mm', format: [pageW, pageH] });
    doc.addImage(certificateTemplateCache.dataUrl, 'PNG', 0, 0, pageW, pageH);

    doc.setFont(NAME_CONFIG.font, NAME_CONFIG.style);
    doc.setFontSize(NAME_CONFIG.fontSize);
    doc.setTextColor(...NAME_CONFIG.color);
    doc.text(participantName, pageW * NAME_CONFIG.xPercent / 100, pageH * NAME_CONFIG.yPercent / 100, { align: NAME_CONFIG.align });

    if(SHOW_DATE){
      doc.setFont(DATE_CONFIG.font, DATE_CONFIG.style);
      doc.setFontSize(DATE_CONFIG.fontSize);
      doc.setTextColor(...DATE_CONFIG.color);
      doc.text(dateStr, pageW * DATE_CONFIG.xPercent / 100, pageH * DATE_CONFIG.yPercent / 100, { align: DATE_CONFIG.align });
    }
    if(SHOW_CERT_ID){
      doc.setFont(CERTID_CONFIG.font, CERTID_CONFIG.style);
      doc.setFontSize(CERTID_CONFIG.fontSize);
      doc.setTextColor(...CERTID_CONFIG.color);
      doc.text('Certificate ID: ' + certId, pageW * CERTID_CONFIG.xPercent / 100, pageH * CERTID_CONFIG.yPercent / 100, { align: CERTID_CONFIG.align });
    }

    return { blobUrl: doc.output('bloburl'), certId };
  }

  // ---- certificate.png missing/unreachable: no fallback design, bail out ----
  return null;
}

/* ---------------- LinkedIn post-share caption ---------------- */
// LinkedIn removed the ability for external sites to pre-fill a post's caption
// text (anti-spam measure) — there is no working URL parameter for this anymore.
// The reliable workaround: copy the caption to the clipboard, then open LinkedIn's
// post composer, so the participant just pastes it in.
const LINKEDIN_POST_CAPTION = (participantName) => `
Thrilled to share that I have successfully completed an insightful
Cybersecurity training session with eSecurityIn! 🛡️

The session provided valuable insights into cybersecurity and the
importance of staying ahead of today's evolving digital threats.

Grateful to the organizers and speakers for an engaging and
informative learning experience. Looking forward to applying
these learnings in my professional journey!

#Cybersecurity #ContinuousLearning #ProfessionalDevelopment
#InformationSecurity #eSecurityIn
`;
const LINKEDIN_COMPOSE_URL = 'https://www.linkedin.com/feed/?shareActive=true';

/* ---------------- certificate viewer window (preview + download + LinkedIn) ---------------- */
function openCertificateWindow(blobUrl, certId, participantName){
  // Open the blank window synchronously, on the original click, so popup blockers allow it.
  const win = window.open('', '_blank');
  if(!win) return null;

  const safeName = participantName.replace(/[^a-z0-9]/gi, '_');
  const fileName = 'certificate_' + safeName + '.pdf';

  win.document.title = 'Your Certificate';
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Your Certificate</title>
      <style>
        *{box-sizing:border-box;}
        body{
          margin:0; background:#060a10; color:#dbe6ee;
          font-family:Inter, system-ui, sans-serif;
          min-height:100vh; display:flex; flex-direction:column; align-items:center;
          padding:24px;
        }
        h1{font-size:16px; font-weight:600; margin:0 0 16px;}
        .viewer{
          width:100%; max-width:920px; aspect-ratio:1.414/1;
          border:1px solid rgba(0,217,255,0.2); border-radius:10px; overflow:hidden;
          box-shadow:0 20px 50px -20px rgba(0,0,0,0.7); background:#0b121c;
        }
        iframe{width:100%; height:100%; border:none;}
        .actions{display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin-top:20px;}
        .btn{
          display:inline-flex; align-items:center; gap:8px; text-decoration:none; cursor:pointer;
          font-weight:600; font-size:14px; padding:11px 20px; border-radius:8px;
          transition:opacity .15s; border:none; font-family:inherit;
        }
        .btn:hover{opacity:0.88;}
        .btn.download{background:linear-gradient(180deg,#00d9ff,#0891b2); color:#031018;}
        .btn.linkedin{background:#0A66C2; color:#fff;}
        .hint{font-size:12px; color:#7b8ba0; margin-top:12px; text-align:center; max-width:420px;}
      </style>
    </head>
    <body>
      <h1>Certificate ID: ${certId}</h1>
      <div class="viewer"><iframe src="${blobUrl}"></iframe></div>
      <div class="actions">
        <a class="btn download" href="${blobUrl}" download="${fileName}">⬇ Download Certificate</a>
        <button class="btn linkedin" id="liShareBtn">Share to LinkedIn</button>
      </div>
      <p class="hint" id="liHint">Downloads your certificate, copies a ready-made caption, then opens LinkedIn — just attach the downloaded file and paste (Ctrl/Cmd+V) the caption into your post.</p>
      <script>
        document.getElementById('liShareBtn').addEventListener('click', async function(){
          const caption = LINKEDIN_POST_CAPTION(participantName);
          const hint = document.getElementById('liHint');
          try{
            await navigator.clipboard.writeText(caption);
            hint.textContent = 'Caption copied! Opening LinkedIn — attach the certificate you downloaded and paste (Ctrl/Cmd+V) into the post box.';
          }catch(e){
            hint.textContent = 'Could not auto-copy — please copy this caption manually: "' + caption + '"';
          }
          window.open(${JSON.stringify(LINKEDIN_COMPOSE_URL)}, '_blank');
        });
      </script>
    </body>
    </html>
  `);
  win.document.close();
  return win;
}

/* ---------------- form logic ---------------- */
const form = document.getElementById('regForm');
const formMsg = document.getElementById('formMsg');
const submitBtn = document.getElementById('submitBtn');

function setFieldState(name, valid){
  const wrap = form.querySelector(`[data-field="${name}"]`);
  if(wrap) wrap.classList.toggle('invalid', !valid);
}

function validate(data){
  let ok = true;
  if(!data.name.trim()){ setFieldState('name', false); ok = false; } else setFieldState('name', true);

  if(!/^[0-9+\-\s()]{7,}$/.test(data.phone)){ setFieldState('phone', false); ok = false; } else setFieldState('phone', true);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)){ setFieldState('email', false); ok = false; } else setFieldState('email', true);
  if(!data.courseInterest){ setFieldState('courseInterest', false); ok = false; } else setFieldState('courseInterest', true);
  if(!data.sessionRating){ setFieldState('sessionRating', false); ok = false; } else setFieldState('sessionRating', true);
  if(!data.remarks.trim()){ setFieldState('remarks', false); ok = false; } else setFieldState('remarks', true);

  return ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMsg.style.display = 'none';
  formMsg.className = '';

  const consent = document.getElementById('consent').checked;
  const data = {
    name: form.name.value,
    phone: form.phone.value,
    email: form.email.value,
    courseInterest: form.courseInterest.value,
    sessionRating: (form.querySelector('input[name="sessionRating"]:checked') || {}).value || '',
    remarks: form.remarks.value
  };

  if(!validate(data)){
    formMsg.textContent = '⚠ Please fix the highlighted fields.';
    formMsg.className = 'err';
    return;
  }
  if(!consent){
    formMsg.textContent = '⚠ Please confirm the consent checkbox to continue.';
    formMsg.className = 'err';
    return;
  }
  if(!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf('PASTE_YOUR') === 0){
    formMsg.textContent = '⚠ This form is not connected to a Google Sheet yet. Add your Apps Script Web App URL in the code.';
    formMsg.className = 'err';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '> GENERATING...';

  // Generate the certificate and open it right away, while the click is still "fresh"
  // (doing this before the async network call keeps popup blockers happy).
  const trimmedName = data.name.trim();
  const certId = generateUniqueId();
  data.certId = certId; // included in the payload sent to Google Sheets below

  const result = generateCertificatePDF(trimmedName, certId);

  if(!result){
    formMsg.textContent = '⚠ Certificate template (certificate.png) is missing — cannot generate your certificate. Please contact the organizer.';
    formMsg.className = 'err';
    submitBtn.disabled = false;
    submitBtn.textContent = '> SUBMIT ';
    return;
  }

  const { blobUrl } = result;
  const certWindow = openCertificateWindow(blobUrl, certId, trimmedName);

  if(certWindow){
    formMsg.innerHTML = '✔ Certificate generated — check the new tab to download it or share to LinkedIn. Certificate ID: ' + certId;
    formMsg.className = 'ok';
  } else {
    formMsg.innerHTML = '✔ Certificate ready. Your browser blocked the pop-up — <a href="' + blobUrl + '" target="_blank" style="color:var(--cyan);">click here to open it</a>.';
    formMsg.className = 'ok';
  }

  submitBtn.textContent = '> SENDING...';

  try{
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    form.reset();
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  }catch(err){
    formMsg.innerHTML += '<br>⚠ Certificate was generated, but we could not log your details — check your connection and try again.';
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = '> SUBMIT REGISTRATION';
  }
});
