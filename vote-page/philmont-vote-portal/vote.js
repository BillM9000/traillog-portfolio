const DESIGNS = [
  { id: 'design-1-panoramic', name: 'The Panoramic', desc: "Sweeping landscape with Milky Way sky, bald eagle, American flag, wildlife parade, and silhouette hikers. Full commemorative treatment \u2014 America's 250th front and center.", img: 'shirt-1-panoramic.jpg' },
  { id: 'design-2-ufo-burro', name: 'All Will Be Disclosed', desc: "UFO beaming up the pack burro while scouts watch and the eagle circles. Philmont's most notorious pack animal gets the cosmic recognition it deserves.", img: 'shirt-2-ufo-burro.jpg' },
  { id: 'design-3-cimarron', name: 'The Cimarron Classic', desc: 'Tall rock spire commanding the frame, scouts marching below in silhouette. Eagle, bear, pronghorn \u2014 the complete Philmont cast in a clean vertical poster format.', img: 'shirt-3-cimarron.jpg' },
  { id: 'design-4-typographic', name: 'Typography & Flag', desc: 'Bold graphic layout with distressed American flag and vertical TROOP 10 stacked down the right side. Clean, strong, and wearable long after the trek.', img: 'shirt-4-typographic.jpg' },
  { id: 'design-5-postcard', name: 'Greetings from Philmont', desc: 'Vintage postcard format with BSA stamps and June 13, 2026 postmark. Lone hiker against the mesa at sunset. "We made it to the top. God Bless America."', img: 'shirt-5-postcard.jpg' },
  { id: 'design-6-nobody-campfire', name: 'Nobody Believes Us \u2014 Campfire', desc: 'Bigfoot roasting a marshmallow while a UFO beams up the burro nearby. America 250. "Nobody Believes Us." Pure chaos energy of Trek 12-20.', img: 'shirt-6-nobody-campfire.jpg' },
  { id: 'design-9-navy-hikers', name: 'Night Trek \u2014 Navy', desc: "Hand-drawn style on navy: scouts and burro marching under a crescent moon toward snow-capped peaks, campfire and tent at trail's edge, American flag on the summit.", img: 'shirt-9-navy-hikers.jpg' },
  { id: 'design-8-topo', name: 'America 250 Topo', desc: 'Circle topo badge design with Tooth of Time and Baldy labeled, contour lines, compass rose, boot print, and pack burro. Clean, athletic, works on any shirt color.', img: 'shirt-8-topo.jpg' },
];

const VOTER_KEY = 'philmont26_voter_name';
const VOTE_KEY  = 'philmont26_vote';

let voterName = localStorage.getItem(VOTER_KEY) || '';
let myVote    = localStorage.getItem(VOTE_KEY) || '';
let counts    = {};

/* ── API ── */
async function fetchCounts() {
  try {
    const res = await fetch('/api/vote/counts');
    const data = await res.json();
    counts = data.counts || {};
  } catch {
    counts = {};
  }
}

async function submitVote(designId) {
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter_name: voterName, design_id: designId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Vote failed');
  }
  return res.json();
}

/* ── Helpers ── */
function toast(msg, isErr) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isErr ? ' error' : '');
  setTimeout(() => { el.className = 'toast'; }, 3400);
}
function totalVotes() { return Object.values(counts).reduce((a, b) => a + b, 0); }
function pct(id) { const t = totalVotes(); return t ? Math.round((counts[id] / t) * 100) : 0; }
function leaderId() { return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]; }

function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

/* ── Name Gate ── */
function enterVoting() {
  const first = document.getElementById('firstName').value.trim();
  const last = document.getElementById('lastInitial').value.trim().toUpperCase();
  if (!first || first.length < 1) { toast('Enter your first name', true); return; }
  if (!last || !/^[A-Z]$/.test(last)) { toast('Enter your last initial (one letter)', true); return; }
  voterName = first + ' ' + last;
  localStorage.setItem(VOTER_KEY, voterName);
  showVotingUI();
}

function changeName() {
  localStorage.removeItem(VOTER_KEY);
  localStorage.removeItem(VOTE_KEY);
  voterName = '';
  myVote = '';
  document.getElementById('nameGate').style.display = '';
  document.getElementById('voterInfo').style.display = 'none';
  document.getElementById('statusBar').style.display = 'none';
  document.getElementById('firstName').value = '';
  document.getElementById('lastInitial').value = '';
  render();
}

function showVotingUI() {
  document.getElementById('nameGate').style.display = 'none';
  document.getElementById('voterInfo').style.display = '';
  document.getElementById('voterDisplay').textContent = voterName;
  document.getElementById('statusBar').style.display = '';
  render();
}

/* ── Render ── */
function render() {
  const grid = document.getElementById('grid');
  const total = totalVotes();
  const top = leaderId();

  grid.innerHTML = '';

  DESIGNS.forEach((d, i) => {
    const cnt = counts[d.id] || 0;
    const isPicked = myVote === d.id;
    const isLeader = d.id === top && total > 0;

    const card = document.createElement('div');
    card.className = ['card', isPicked ? 'my-pick' : '', isLeader ? 'is-leader' : ''].filter(Boolean).join(' ');

    card.innerHTML =
      '<div class="corner-badge">' + (isPicked ? '\u2713 My Vote' : '') + '</div>' +
      '<div class="card-num">' + (i + 1) + '</div>' +
      '<div class="card-media">' +
        '<img src="/vote/' + d.img + '" alt="' + d.name + '" loading="lazy" data-zoom="/vote/' + d.img + '">' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + d.name + '</div>' +
        '<div class="card-desc">' + d.desc + '</div>' +
        '<div class="vote-row">' +
          '<button class="btn-vote' + (isPicked ? ' picked' : '') + '" data-id="' + d.id + '"' +
            (!voterName ? ' disabled' : '') + '>' +
            (isPicked ? '\u2713 \u00A0Your Pick' : (myVote ? 'Change Vote' : 'Cast Vote')) +
          '</button>' +
          '<div class="tally">' +
            '<span class="tally-num">' + cnt + '</span>' +
            '<span class="tally-lbl">votes</span>' +
          '</div>' +
        '</div>' +
        '<div class="vote-bar-track">' +
          '<div class="vote-bar-fill" style="width:' + (total ? pct(d.id) : 0) + '%"></div>' +
        '</div>' +
      '</div>';

    grid.appendChild(card);
  });

  // Status bar
  const bar = document.getElementById('statusBar');
  if (myVote) {
    const picked = DESIGNS.find(d => d.id === myVote);
    bar.textContent = '\u2713  Voted for "' + (picked?.name || myVote) + '" \u2014 you can change your vote anytime';
    bar.classList.add('done');
  } else if (voterName) {
    bar.textContent = '\u2B21  Tap any image to zoom \u2014 pick your favorite design';
    bar.classList.remove('done');
  }

  // Total strip
  const strip = document.getElementById('totalStrip');
  if (total > 0) {
    const topDesign = DESIGNS.find(d => d.id === top);
    strip.innerHTML = 'Total votes: <strong>' + total + '</strong>&nbsp;&nbsp;\u00B7&nbsp;&nbsp;Leader: <strong>' + (topDesign?.name || '?') + '</strong> (' + pct(top) + '%)';
  } else {
    strip.innerHTML = 'No votes yet \u2014 be the first!';
  }
}

/* ── Event Delegation ── */

// Image zoom via delegation
document.addEventListener('click', e => {
  const img = e.target.closest('[data-zoom]');
  if (img) { openLightbox(img.dataset.zoom); return; }
  // Lightbox close
  if (e.target.closest('.lightbox') && !e.target.closest('.lightbox img')) { closeLightbox(); }
  if (e.target.closest('.lightbox-close')) { closeLightbox(); }
});

// Enter button
document.getElementById('btnEnter').addEventListener('click', enterVoting);

// Change name button
document.getElementById('btnChangeName').addEventListener('click', changeName);

/* ── Vote handler ── */
document.getElementById('grid').addEventListener('click', async e => {
  const btn = e.target.closest('.btn-vote');
  if (!btn || !voterName) return;
  const designId = btn.dataset.id;
  if (designId === myVote) return;

  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = 'Recording\u2026';
  try {
    const result = await submitVote(designId);
    localStorage.setItem(VOTE_KEY, designId);
    myVote = designId;
    await fetchCounts();
    render();
    if (result.status === 'changed') {
      toast('Vote changed! Nice choice, Scout.');
    } else {
      toast('Vote recorded \u2014 See you on the trail, Crew 614!');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = prevText;
    toast(err.message || 'Could not record vote \u2014 try again.', true);
  }
});

/* ── Starfield ── */
(function() {
  const canvas = document.getElementById('starCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  function initStars(n) { stars = Array.from({length: n}, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height*.85, r: Math.random()*1.3+.2, a: Math.random(), da: (Math.random()-.5)*.004 })); }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    stars.forEach(s => {
      s.a = Math.max(.1, Math.min(1, s.a+s.da));
      if (s.a<=.1||s.a>=1) s.da*=-1;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = 'rgba(200,220,255,' + s.a + ')'; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  resize(); initStars(180); draw();
  window.addEventListener('resize', () => { resize(); initStars(180); });
})();

/* ── Init ── */
(async () => {
  await fetchCounts();
  if (voterName) {
    showVotingUI();
  } else {
    render();
  }
})();
