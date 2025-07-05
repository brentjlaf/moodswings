document.addEventListener('DOMContentLoaded', async () => {
  try {
    let data;
    const stored = localStorage.getItem('leaderboardData');
    if (stored) {
      data = JSON.parse(stored);
    } else {
      const res = await fetch('leaderboard.json');
      data = await res.json();
    }

    data.players.sort((a, b) => b.xp - a.xp);
    const tbody = document.querySelector('#leaderboardTable tbody');
    tbody.innerHTML = '';
    data.players.forEach(player => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${player.name}</td><td>${player.xp}</td><td>${player.days}</td>`;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load leaderboard', err);
  }
});
