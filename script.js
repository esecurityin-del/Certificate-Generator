/* =====================================================================
   PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL BELOW (between the quotes).
   See setup instructions provided alongside this file.
   ===================================================================== */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyDUrFAGmDpWtmzztvgcgr1Ew7-tJ9LT3GOugcYuaa_mgb-nqU3J5X0P44G0yS2mweIwg/exec";

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
const CERTID_CONFIG = { xPercent: 82, yPercent: 35, fontSize: 11, font: 'helvetica', style: 'normal', color: [50, 50, 50], align: 'center' };

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

  // ---- fallback: certificate.png missing/unreachable, draw a built-in design instead ----
  doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pageW = doc.internal.pageSize.getWidth();
  pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(6, 10, 16);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setDrawColor(0, 217, 255);
  doc.setLineWidth(0.9);
  doc.rect(10, 10, pageW - 20, pageH - 20);
  doc.setLineWidth(0.3);
  doc.rect(13.5, 13.5, pageW - 27, pageH - 27);

  const cl = 16;
  doc.setLineWidth(1.1);
  doc.line(6, 6, 6 + cl, 6);       doc.line(6, 6, 6, 6 + cl);
  doc.line(pageW - 6, 6, pageW - 6 - cl, 6);       doc.line(pageW - 6, 6, pageW - 6, 6 + cl);
  doc.line(6, pageH - 6, 6 + cl, pageH - 6);       doc.line(6, pageH - 6, 6, pageH - 6 - cl);
  doc.line(pageW - 6, pageH - 6, pageW - 6 - cl, pageH - 6); doc.line(pageW - 6, pageH - 6, pageW - 6, pageH - 6 - cl);

  doc.setFont('courier', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 217, 255);
  doc.text('CYBERGUARD SUMMIT 2026  ·  SECURE REGISTRATION', pageW / 2, 30, { align: 'center' });

  const cx = pageW / 2, cy = 46;
  doc.setFillColor(0, 217, 255);
  doc.rect(cx - 9, cy - 11, 18, 14, 'F');
  doc.triangle(cx - 9, cy + 3, cx + 9, cy + 3, cx, cy + 16, 'F');
  doc.setDrawColor(6, 10, 16);
  doc.setLineWidth(1.6);
  doc.line(cx - 4.5, cy - 1, cx - 1, cy + 3.5);
  doc.line(cx - 1, cy + 3.5, cx + 5.5, cy - 5.5);

  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text('CERTIFICATE OF PARTICIPATION', pageW / 2, 78, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(150, 170, 190);
  doc.text('This certificate is proudly presented to', pageW / 2, 92, { align: 'center' });

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(34);
  doc.setTextColor(0, 217, 255);
  doc.text(participantName, pageW / 2, 112, { align: 'center' });

  const nameWidth = doc.getTextWidth(participantName);
  doc.setDrawColor(0, 217, 255);
  doc.setLineWidth(0.6);
  const underlineHalf = Math.min(nameWidth / 2 + 10, 120);
  doc.line(pageW / 2 - underlineHalf, 118, pageW / 2 + underlineHalf, 118);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(200, 210, 220);
  const bodyText = 'for successfully registering as a participant in the CyberGuard Summit 2026, joining a community dedicated to advancing cybersecurity knowledge and practice.';
  const wrapped = doc.splitTextToSize(bodyText, pageW - 140);
  doc.text(wrapped, pageW / 2, 132, { align: 'center' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 140, 160);
  doc.text('DATE ISSUED', 40, pageH - 38);
  doc.setTextColor(220, 230, 240);
  doc.setFontSize(11);
  doc.text(dateStr, 40, pageH - 32);

  doc.setFont('courier', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 140, 160);
  doc.text('CERTIFICATE ID', pageW - 40, pageH - 38, { align: 'right' });
  doc.setTextColor(220, 230, 240);
  doc.setFontSize(11);
  doc.text(certId, pageW - 40, pageH - 32, { align: 'right' });

  doc.setDrawColor(120, 140, 160);
  doc.setLineWidth(0.4);
  doc.line(pageW / 2 - 35, pageH - 40, pageW / 2 + 35, pageH - 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(150, 170, 190);
  doc.text('Event Organizer', pageW / 2, pageH - 34, { align: 'center' });

  return { blobUrl: doc.output('bloburl'), certId };
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

  if(!data.dob){ setFieldState('dob', false); ok = false; }
  else{
    const d = new Date(data.dob);
    if(isNaN(d) || d > new Date()){ setFieldState('dob', false); ok = false; }
    else setFieldState('dob', true);
  }

  if(!/^[0-9+\-\s()]{7,}$/.test(data.phone)){ setFieldState('phone', false); ok = false; } else setFieldState('phone', true);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)){ setFieldState('email', false); ok = false; } else setFieldState('email', true);

  return ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMsg.style.display = 'none';
  formMsg.className = '';

  const consent = document.getElementById('consent').checked;
  const data = {
    name: form.name.value,
    dob: form.dob.value,
    phone: form.phone.value,
    email: form.email.value
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

  const { blobUrl } = generateCertificatePDF(trimmedName, certId);
  const certWindow = window.open(blobUrl, '_blank');

  if(certWindow){
    formMsg.innerHTML = '✔ Certificate generated — check the new tab. Certificate ID: ' + certId;
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
