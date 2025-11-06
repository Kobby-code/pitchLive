const toggleModeBtn = document.getElementById('toggleMode');
if (toggleModeBtn) {
  toggleModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    toggleModeBtn.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
  });
}

async function fetchMatches() {
  const res = await fetch('https://streamed.pk/api/matches/live');
  const data = await res.json();
  return data.filter(m => m.category === 'football');
}

const matchesContainer = document.getElementById('matches');
if (matchesContainer) {
  fetchMatches().then(matches => {
    matchesContainer.innerHTML = '';
    matches.forEach(match => {
      const col = document.createElement('div');
      col.className = 'col-sm-6 col-lg-4';
      col.innerHTML = `
        <div class="card shadow-sm match-card">
          ${match.poster ? `<img src="https://streamed.pk${match.poster}.webp" class="card-img-top">` : ''}
          <div class="card-body">
            <h5 class="card-title">${match.title}</h5>
            <p class="text-muted small">${new Date(match.date).toLocaleString()}</p>
            <a href="watch.html?id=${match.id}" class="btn btn-primary w-100">Watch Now</a>
          </div>
        </div>
      `;
      matchesContainer.appendChild(col);
    });
  });
}

const player = document.getElementById('player');
if (player) {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get('id');
  if (matchId) {
    fetch(`https://streamed.pk/api/matches/live`)
      .then(res => res.json())
      .then(matches => {
        const match = matches.find(m => m.id == matchId);
        if (!match) return alert('Match not found.');

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
        }

        const otherMatches = matches.filter(m => m.id != matchId);
        const sidebar = document.getElementById('otherMatches');
        otherMatches.forEach(m => {
          const div = document.createElement('div');
          div.className = 'col-12';
          div.innerHTML = `
            <div class="card">
              ${m.poster ? `<img src="https://streamed.pk${m.poster}.webp" class="card-img-top">` : ''}
              <div class="card-body p-2">
                <h6>${m.title}</h6>
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
}
