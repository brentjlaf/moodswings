document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('leaderboard.json');
    const data = await res.json();
    data.players.sort((a, b) => b.xp - a.xp);
    const tbody = document.querySelector('#leaderboardTable tbody');
    data.players.forEach(player => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${player.name}</td><td>${player.xp}</td><td>${player.days}</td>`;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load leaderboard', err);
  }
});
