<?php
$key = 'AIzaSyCec5zlOmYCiyPa3KpSVhToX7TroFeo588';
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={$key}";

$payload = json_encode([
    'contents' => [['role' => 'user', 'parts' => [['text' => 'قل مرحبا']]]]
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
]);

$start    = microtime(true);
$body     = curl_exec($ch);
$elapsed  = round(microtime(true) - $start, 2);
$code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error    = curl_error($ch);
curl_close($ch);

echo "Time: {$elapsed}s | HTTP: {$code}\n";
if ($error) echo "cURL Error: {$error}\n";
else {
    $data = json_decode($body, true);
    echo "Reply: " . ($data['candidates'][0]['content']['parts'][0]['text'] ?? $body) . "\n";
}
