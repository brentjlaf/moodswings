<?php
header('Content-Type: application/json');
$input = file_get_contents('php://input');
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}
$data = json_decode($input, true);
if (!isset($data['playerID'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing playerID']);
    exit;
}
$id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $data['playerID']);
$file = __DIR__ . '/../data/saves/' . $id . '.json';
if (!file_exists(dirname($file))) {
    mkdir(dirname($file), 0777, true);
}
file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
// update leaderboard
$leaderboardFile = __DIR__ . '/../data/leaderboard.json';
$lb = ['players' => []];
if (file_exists($leaderboardFile)) {
    $lb = json_decode(file_get_contents($leaderboardFile), true);
    if (!$lb) $lb = ['players' => []];
}
$name = $data['username'] ?: $id;
$found = false;
foreach ($lb['players'] as &$p) {
    if ($p['id'] === $id) {
        $p['name'] = $name;
        $p['xp'] = $data['xp'];
        $p['days'] = $data['day'];
        $found = true;
        break;
    }
}
if (!$found) {
    $lb['players'][] = ['id' => $id, 'name' => $name, 'xp' => $data['xp'], 'days' => $data['day']];
}
usort($lb['players'], function($a,$b){return $b['xp'] <=> $a['xp'];});
file_put_contents($leaderboardFile, json_encode($lb, JSON_PRETTY_PRINT));
echo json_encode(['status' => 'ok']);
?>
