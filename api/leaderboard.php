<?php
header('Content-Type: application/json');
$leaderboardFile = __DIR__ . '/../data/leaderboard.json';
if (!file_exists($leaderboardFile)) {
    echo json_encode(['players' => []]);
    exit;
}
readfile($leaderboardFile);
?>
