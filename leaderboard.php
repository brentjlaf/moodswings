<?php
$data = json_decode(file_get_contents(__DIR__ . '/data/leaderboard.json'), true);
$players = $data['players'] ?? [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leaderboard - Moo-d Swings</title>
  <link rel="stylesheet" href="styles.css?v=moo3.5">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
  <div class="mobile-container">
    <header class="page-header">
      <span class="logo">&#x1F404; MOO-D SWINGS</span>
      <div class="header-buttons">
        <a href="index.php" class="about-link action-btn">Back</a>
      </div>
    </header>
    <main class="about-main">
      <h1 class="section-title section-title-brown">Leaderboard</h1>
      <table id="leaderboardTable" class="leaderboard-table">
        <thead>
          <tr><th>Player</th><th>XP</th><th>Farm Age (Days)</th></tr>
        </thead>
        <tbody>
          <?php foreach ($players as $p): ?>
            <tr><td><?php echo htmlspecialchars($p['name']); ?></td><td><?php echo $p['xp']; ?></td><td><?php echo $p['days']; ?></td></tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </main>
  </div>
</body>
</html>
