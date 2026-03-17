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

const MAX_VOTES = 2;
const VOTER_KEY = 'philmont26_voter_name';
const VOTES_KEY = 'philmont26_votes'; // JSON array of { design_id, slot }

let voterName = localStorage.getItem(VOTER_KEY) || '';
let myVotes = JSON.parse(localStorage.getItem(VOTES_KEY) || '[]'); // [{ design_id, slot }]
let counts = {};
let voterCount = 0;

/* ── API ── */
async function fetchCounts() {
  try {
    const res = await fetch('/api/vote/counts');
    const data = await res.json();
    counts = data.counts || {};
    voterCount = data.voters || 0;
  } catch {
    counts = {};
  }
}

async function fetchMyVotes() {
  if (!voterName) return;
  try {
    const res = await fetch('/api/vote/my-votes?name=' + encodeURIComponent(voterName));
    const data = await res.json();
    myVotes = data.votes || [];
    localStorage.setItem(VOTES_KEY, JSON.stringify(myVotes));
  } catch {
    // keep localStorage version
  }
}

async function submitVote(designId, slot) {
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter_name: voterName, design_id: designId, vote_slot: slot }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Vote failed');
  }
  return res.json();
}

async function removeVote(slot) {
  const res = await fetch('/api/vote', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter_name: voterName, vote_slot: slot }),
  });
  if (!res.ok) throw new Error('Failed to remove vote');
  return res.json();
}

/* ── Helpers ── */
function toast(msg, isErr) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isErr ? ' error' : '');
  setTimeout(function() { el.className = 'toast'; }, 3400);
}
function totalVotes() { return Object.values(counts).reduce(function(a, b) { return a + b; }, 0); }
function pct(id) { var t = totalVotes(); return t ? Math.round((counts[id] / t) * 100) : 0; }

function myPickSlot(designId) {
  var v = myVotes.find(function(v) { return v.design_id === designId; });
  return v ? v.slot : 0;
}
function isPicked(designId) { return myPickSlot(designId) > 0; }
function votesUsed() { return myVotes.length; }
function nextFreeSlot() {
  var used = myVotes.map(function(v) { return v.slot; });
  if (used.indexOf(1) === -1) return 1;
  if (used.indexOf(2) === -1) return 2;
  return 0; // all used
}

function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });

/* ── Name Gate ── */
function enterVoting() {
  var first = document.getElementById('firstName').value.trim();
  var last = document.getElementById('lastInitial').value.trim().toUpperCase();
  if (!first || first.length < 1) { toast('Enter your first name', true); return; }
  if (!last || !/^[A-Z]$/.test(last)) { toast('Enter your last initial (one letter)', true); return; }
  voterName = first + ' ' + last;
  localStorage.setItem(VOTER_KEY, voterName);
  initAfterName();
}

async function initAfterName() {
  await fetchMyVotes();
  showVotingUI();
}

function changeName() {
  localStorage.removeItem(VOTER_KEY);
  localStorage.removeItem(VOTES_KEY);
  voterName = '';
  myVotes = [];
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

/* ── Leaderboard ── */
function renderLeaderboard() {
  var lb = document.getElementById('leaderboard');
  var total = totalVotes();
  if (total === 0) { lb.style.display = 'none'; return; }

  lb.style.display = '';
  // Sort designs by vote count descending
  var sorted = DESIGNS.map(function(d) {
    return { id: d.id, name: d.name, count: counts[d.id] || 0 };
  }).filter(function(d) { return d.count > 0; }).sort(function(a, b) { return b.count - a.count; });

  var html = '<h2>Leaderboard</h2>';
  sorted.forEach(function(d, i) {
    var isLeader = i === 0;
    var isMine = isPicked(d.id);
    var cls = 'lb-row' + (isLeader ? ' lb-leader' : '') + (isMine ? ' lb-mypick' : '');
    var barW = total ? Math.round((d.count / total) * 100) : 0;
    html += '<div class="' + cls + '">' +
      '<div class="lb-bg" style="width:' + barW + '%"></div>' +
      '<span class="lb-rank">' + (i + 1) + '</span>' +
      '<span class="lb-name">' + d.name + (isMine ? ' \u2713' : '') + '</span>' +
      '<span class="lb-votes">' + d.count + '</span>' +
      '<span class="lb-pct">' + barW + '%</span>' +
    '</div>';
  });

  lb.innerHTML = html;
}

/* ── Render ── */
function render() {
  var grid = document.getElementById('grid');
  var total = totalVotes();
  var sorted = DESIGNS.slice().sort(function(a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); });
  var topId = sorted.length && (counts[sorted[0].id] || 0) > 0 ? sorted[0].id : null;

  grid.innerHTML = '';

  DESIGNS.forEach(function(d, i) {
    var cnt = counts[d.id] || 0;
    var picked = isPicked(d.id);
    var slot = myPickSlot(d.id);
    var isLeader = d.id === topId;

    var card = document.createElement('div');
    card.className = ['card', picked ? 'my-pick' : '', isLeader ? 'is-leader' : ''].filter(Boolean).join(' ');

    var btnLabel, btnClass;
    if (picked) {
      btnLabel = '\u2713 \u00A0Vote ' + slot;
      btnClass = 'btn-vote picked';
    } else if (votesUsed() < MAX_VOTES) {
      btnLabel = votesUsed() === 0 ? 'Cast Vote' : 'Cast Vote #' + (votesUsed() + 1);
      btnClass = 'btn-vote';
    } else {
      btnLabel = 'All Votes Used';
      btnClass = 'btn-vote';
    }

    card.innerHTML =
      '<div class="corner-badge">' + (picked ? '\u2713 Vote ' + slot : '') + '</div>' +
      '<div class="card-num">' + (i + 1) + '</div>' +
      '<div class="card-media">' +
        '<img src="/vote/' + d.img + '" alt="' + d.name + '" loading="lazy" data-zoom="/vote/' + d.img + '">' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + d.name + '</div>' +
        '<div class="card-desc">' + d.desc + '</div>' +
        '<div class="vote-row">' +
          '<button class="' + btnClass + '" data-id="' + d.id + '"' +
            (!voterName || (!picked && votesUsed() >= MAX_VOTES) ? ' disabled' : '') + '>' +
            btnLabel +
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
  var bar = document.getElementById('statusBar');
  if (votesUsed() > 0) {
    var names = myVotes.map(function(v) {
      var d = DESIGNS.find(function(dd) { return dd.id === v.design_id; });
      return '"' + (d ? d.name : v.design_id) + '"';
    });
    bar.textContent = '\u2713  ' + votesUsed() + '/' + MAX_VOTES + ' votes used: ' + names.join(' & ') +
      (votesUsed() < MAX_VOTES ? ' \u2014 you have ' + (MAX_VOTES - votesUsed()) + ' more!' : ' \u2014 tap a pick to change it');
    bar.classList.add('done');
  } else if (voterName) {
    bar.textContent = '\u2B21  You have ' + MAX_VOTES + ' votes \u2014 pick your favorite designs';
    bar.classList.remove('done');
  }

  // Total strip
  var strip = document.getElementById('totalStrip');
  if (total > 0) {
    strip.innerHTML = 'Total votes: <strong>' + total + '</strong>&nbsp;&nbsp;\u00B7&nbsp;&nbsp;' +
      'Voters: <strong>' + voterCount + '</strong>';
  } else {
    strip.innerHTML = 'No votes yet \u2014 be the first!';
  }

  renderLeaderboard();
}

/* ── Event Delegation ── */

// Image zoom via delegation
document.addEventListener('click', function(e) {
  var img = e.target.closest('[data-zoom]');
  if (img) { openLightbox(img.dataset.zoom); return; }
  if (e.target.closest('.lightbox') && !e.target.closest('.lightbox img')) { closeLightbox(); }
  if (e.target.closest('.lightbox-close')) { closeLightbox(); }
});

// Enter button
document.getElementById('btnEnter').addEventListener('click', enterVoting);

// Change name button
document.getElementById('btnChangeName').addEventListener('click', changeName);

/* ── Vote handler ── */
document.getElementById('grid').addEventListener('click', async function(e) {
  var btn = e.target.closest('.btn-vote');
  if (!btn || !voterName) return;
  var designId = btn.dataset.id;

  // If already picked this one, remove the vote
  if (isPicked(designId)) {
    var slot = myPickSlot(designId);
    btn.disabled = true;
    btn.textContent = 'Removing\u2026';
    try {
      await removeVote(slot);
      myVotes = myVotes.filter(function(v) { return v.slot !== slot; });
      localStorage.setItem(VOTES_KEY, JSON.stringify(myVotes));
      await fetchCounts();
      render();
      toast('Vote removed. You have a free slot!');
    } catch (err) {
      btn.disabled = false;
      toast(err.message || 'Could not remove vote', true);
    }
    return;
  }

  // No free slots
  if (votesUsed() >= MAX_VOTES) return;

  var freeSlot = nextFreeSlot();
  btn.disabled = true;
  btn.textContent = 'Recording\u2026';
  try {
    var result = await submitVote(designId, freeSlot);
    myVotes.push({ design_id: designId, slot: freeSlot });
    localStorage.setItem(VOTES_KEY, JSON.stringify(myVotes));
    await fetchCounts();
    render();
    if (result.status === 'changed') {
      toast('Vote changed! Nice choice, Scout.');
    } else {
      toast(votesUsed() < MAX_VOTES
        ? 'Vote ' + freeSlot + ' recorded! You have ' + (MAX_VOTES - votesUsed()) + ' more.'
        : 'Both votes in! See you on the trail, Crew 614!');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Cast Vote';
    toast(err.message || 'Could not record vote \u2014 try again.', true);
  }
});

/* ── Starfield ── */
(function() {
  var canvas = document.getElementById('starCanvas');
  var ctx = canvas.getContext('2d');
  var stars = [];
  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  function initStars(n) { stars = Array.from({length: n}, function() { return { x: Math.random()*canvas.width, y: Math.random()*canvas.height*.85, r: Math.random()*1.3+.2, a: Math.random(), da: (Math.random()-.5)*.004 }; }); }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    stars.forEach(function(s) {
      s.a = Math.max(.1, Math.min(1, s.a+s.da));
      if (s.a<=.1||s.a>=1) s.da*=-1;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = 'rgba(200,220,255,' + s.a + ')'; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  resize(); initStars(180); draw();
  window.addEventListener('resize', function() { resize(); initStars(180); });
})();

/* ── Init ── */
(async function() {
  await fetchCounts();
  if (voterName) {
    await fetchMyVotes();
    showVotingUI();
  } else {
    render();
  }
})();
