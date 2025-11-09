/* ---------------- Dark / Light Mode Toggle ---------------- */
const toggleModeBtn = document.getElementById('toggleMode');
if (toggleModeBtn) {
  toggleModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    toggleModeBtn.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
  });
}

/* ---------------- Utility Functions ---------------- */
const apiBase = 'https://streamed.pk/api/matches';

function normalizeResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.matches)) return data.matches;
  for (const k of Object.keys(data)) if (Array.isArray(data[k])) return data[k];
  return [];
}

function esc(s) { return String(s || '').replace(/'/g, "\\'").replace(/"/g, '\"'); }

function buildThumbnail(match) {
  if (match.teams?.home?.badge && match.teams?.away?.badge) {
    return `https://streamed.pk/api/images/poster/${match.teams.home.badge}/${match.teams.away.badge}.webp`;
  }
  if (match.poster) return `https://streamed.pk/api/images/proxy/${match.poster}.webp`;
  if (match.teams?.home?.badge) return `https://streamed.pk/api/images/badge/${match.teams.home.badge}.webp`;
  if (match.teams?.away?.badge) return `https://streamed.pk/api/images/badge/${match.teams.away.badge}.webp`;
  return 'assets/images/logo.png';
}

function buildAlt(match) { return match.title || match.name || 'Match Image'; }

/* ---------------- Countdown Modal ---------------- */
function showCountdownModal(title, matchTime, thumb, altText) {
  const modalTitle = document.getElementById('modalMatchTitle');
  const timerEl = document.getElementById('countdownTimer');
  const modalThumb = document.getElementById('modalMatchThumbnail');
  modalTitle.textContent = title;
  modalThumb.src = thumb || 'assets/images/logo.png';
  modalThumb.alt = altText || 'Match Thumbnail';

  const modal = new bootstrap.Modal(document.getElementById('countdownModal'));
  modal.show();

  clearInterval(window.countdownInterval);

  function updateTimer() {
    const now = Date.now();
    const diff = (matchTime || 0) - now;
    if (diff <= 0) {
      timerEl.textContent = 'Match Started!';
      clearInterval(window.countdownInterval);
      return;
    }
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = `Match starts in: ${hours}h ${minutes}m ${seconds}s`;
  }

  updateTimer();
  window.countdownInterval = setInterval(updateTimer, 1000);

  document.getElementById('countdownModal').addEventListener('hidden.bs.modal', () => {
    clearInterval(window.countdownInterval);
  });
}

/* ---------------- Render Functions ---------------- */
function renderMatches(containerId, matches, options = {}) {
  const { treatPopularLikeUpcoming = false, liveIdSet = new Set() } = options;
  const container = document.getElementById(containerId);
  if (!container) return;

  matches = (matches || []).filter(m => (m.category || '').toLowerCase() === 'football');
  if (!matches.length) {
    container.innerHTML = '<div class="empty-state">No football matches available.</div>';
    return;
  }

  const html = matches.map(match => {
    const title = match.title || match.name || 'Untitled Match';
    const category = match.category || 'Sports';
    const thumb = buildThumbnail(match);
    const altText = esc(buildAlt(match));
    const id = match.id || (match.sources && match.sources[0] && match.sources[0].id) || '';
    const isLive = !!(match.isLive || (match.status && String(match.status).toLowerCase() === 'live') || liveIdSet.has(match.id));

    if (treatPopularLikeUpcoming) {
      if (isLive) {
        return `
          <div class='match-card' onclick="${id ? `window.location.href='watch.html?id=${id}'` : ''}">
            <div class='live-badge'>LIVE</div>
            <img src='${thumb}' alt='${altText}' loading='lazy' />
            <h6 class='mt-2'>${esc(title)}</h6>
            <small>${esc(category)}</small>
          </div>`;
      } else {
        return `
          <div class='match-card' onclick="showCountdownModal('${esc(title)}', ${match.date || 0}, '${esc(thumb)}', '${altText}')">
            <img src='${thumb}' alt='${altText}' loading='lazy' />
            <h6 class='mt-2'>${esc(title)}</h6>
            <small>${esc(category)}</small>
          </div>`;
      }
    }

    if (isLive) {
      return `
        <div class='match-card' onclick="${id ? `window.location.href='watch.html?id=${id}'` : ''}">
          <div class='live-badge'>LIVE</div>
          <img src='${thumb}' alt='${altText}' loading='lazy' />
          <h6 class='mt-2'>${esc(title)}</h6>
          <small>${esc(category)}</small>
        </div>`;
    }

    return `
      <div class='match-card' onclick="showCountdownModal('${esc(title)}', ${match.date || 0}, '${esc(thumb)}', '${altText}')">
        <img src='${thumb}' alt='${altText}' loading='lazy' />
        <h6 class='mt-2'>${esc(title)}</h6>
        <small>${esc(category)}</small>
      </div>`;
  }).join('');

  container.innerHTML = html;
}

function renderUpcomingMatches(containerId, upcomingMatches) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let upcoming = (upcomingMatches || []).filter(m => (m.date || 0) > Date.now());
  upcoming.sort((a, b) => (a.date || 0) - (b.date || 0));

  if (!upcoming.length) {
    container.innerHTML = '<div class="empty-state">No upcoming football matches.</div>';
    return;
  }

  const html = upcoming.map(match => {
    const thumb = buildThumbnail(match);
    const altText = esc(buildAlt(match));
    return `
      <div class="match-card" onclick="showCountdownModal('${esc(match.title)}', ${match.date || 0}, '${esc(thumb)}', '${altText}')">
        <img src="${thumb}" alt="${altText}" loading="lazy" />
        <h6 class="mt-2">${esc(match.title)}</h6>
        <small>${esc(match.category)}</small>
      </div>`;
  }).join('');

  container.innerHTML = html;
}

/* ---------------- Player Page Rendering ---------------- */
function loadPlayerPage(matchId) {
  const player = document.getElementById('player');
  if (!player || !matchId) return;

  fetch(`${apiBase}/live`)
    .then(res => res.json())
    .then(matches => {
      const match = matches.find(m => m.id == matchId);
      if (!match) return alert('Match not found.');

      // Load main player info
      document.getElementById('matchTitle').textContent = match.title;
      document.getElementById('matchTime').textContent = new Date(match.date).toLocaleString();

      const firstSource = match.sources?.[0];
      if (firstSource) {
        fetch(`https://streamed.pk/api/stream/${firstSource.source}/${firstSource.id}`)
          .then(res => res.json())
          .then(streams => {
            const stream = streams[0];
            player.src = stream.embedUrl;
          });
      } else {
        document.getElementById('noStream').style.display = 'block';
      }

      // ---------------- Other Matches Sidebar ----------------
      const sidebar = document.getElementById('otherMatches');
      sidebar.innerHTML = ''; // clear previous content

      // Only live football matches, exclude current match
      const otherLiveFootball = matches
        .filter(m => m.id != matchId && (m.category || '').toLowerCase() === 'football');

      if (otherLiveFootball.length === 0) {
        sidebar.innerHTML = '<p class="text-muted">No other live football matches.</p>';
        return;
      }

      otherLiveFootball.forEach(m => {
        const div = document.createElement('div');
        div.className = 'col-12';
        div.innerHTML = `
          <div class="card">
            ${m.poster ? `<img src="https://streamed.pk${m.poster}.webp" class="card-img-top" loading="lazy">` : ''}
            <div class="card-body p-2">
              <h6>${m.title}</h6>
              <small class="text-muted">${new Date(m.date).toLocaleTimeString()}</small>
            </div>
          </div>
        `;
        div.addEventListener('click', () => {
          window.location.href = `watch.html?id=${m.id}`;
        });
        sidebar.appendChild(div);
      });
    });
}

/* ---------------- Fetch & Render All Matches ---------------- */
async function fetchAllMatches() {
  try {
    const liveRes = await fetch(`${apiBase}/live`);
    const liveData = normalizeResponse(await liveRes.json());
    const liveIdSet = new Set((liveData || []).map(m => m.id));
    renderMatches('liveMatches', liveData, { liveIdSet });

    const allRes = await fetch(`${apiBase}/football`);
    const allData = normalizeResponse(await allRes.json());
    const upcoming = (allData || []).filter(m => !liveIdSet.has(m.id));
    renderUpcomingMatches('upcomingMatches', upcoming);

    const popularRes = await fetch(`${apiBase}/football/popular`);
    let popularData = normalizeResponse(await popularRes.json()) || [];
    popularData = popularData.map(m => ({
      ...m,
      isLive: !!(m.isLive || liveIdSet.has(m.id) || (m.status && String(m.status).toLowerCase() === 'live'))
    }));
    renderMatches('popularMatches', popularData, { treatPopularLikeUpcoming: true, liveIdSet });

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

/* ---------------- Initialize ---------------- */
fetchAllMatches();

// If on player page
const playerEl = document.getElementById('player');
if (playerEl) {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get('id');
  if (matchId) loadPlayerPage(matchId);
}
