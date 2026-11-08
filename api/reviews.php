<?php
/**
 * Coffee With KHORSHED — customer reviews API
 *
 *   GET  api/reviews.php   → { reviews: [...], stats: { count, average, dist } }
 *   POST api/reviews.php   ← JSON { name, rating (1-5), text, website (must stay empty) }
 *
 * Reviews are stored in api/data/reviews.json. To remove a review,
 * open that file and delete its entry.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const DATA_DIR      = __DIR__ . '/data';
const REVIEWS_FILE  = DATA_DIR . '/reviews.json';
const LIMITS_FILE   = DATA_DIR . '/ratelimit.json';
const MAX_PER_HOUR  = 3;      // reviews per visitor per hour
const MAX_REVIEWS   = 5000;   // safety cap on file size

function respond(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ensure_storage(): void {
    if (!is_dir(DATA_DIR) && !mkdir(DATA_DIR, 0755, true)) {
        respond(500, ['error' => 'Storage is not writable.']);
    }
    // block direct web access on Apache hosts
    $ht = DATA_DIR . '/.htaccess';
    if (!file_exists($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
}

/** Read + optionally modify a JSON file under an exclusive lock. */
function with_json(string $file, callable $fn) {
    $fh = fopen($file, 'c+');
    if (!$fh) respond(500, ['error' => 'Could not open storage.']);
    flock($fh, LOCK_EX);
    $raw  = stream_get_contents($fh);
    $data = json_decode($raw ?: '[]', true);
    if (!is_array($data)) $data = [];
    [$result, $new] = $fn($data);
    if ($new !== null) {
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        fflush($fh);
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}

function clean(string $s, int $max): string {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    $s = preg_replace("/\r\n?/", "\n", $s);
    $s = preg_replace("/\n{3,}/", "\n\n", $s);
    $s = trim($s);
    return mb_substr($s, 0, $max);
}

function stats(array $reviews): array {
    $dist = ['1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0];
    $sum = 0;
    foreach ($reviews as $r) { $dist[(string)$r['rating']]++; $sum += $r['rating']; }
    $n = count($reviews);
    return ['count' => $n, 'average' => $n ? round($sum / $n, 2) : 0, 'dist' => $dist];
}

ensure_storage();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ---------------- GET: list ---------------- */
if ($method === 'GET') {
    $reviews = file_exists(REVIEWS_FILE) ? with_json(REVIEWS_FILE, fn($d) => [$d, null]) : [];
    usort($reviews, fn($a, $b) => strcmp($b['date'], $a['date']));
    respond(200, ['reviews' => $reviews, 'stats' => stats($reviews)]);
}

/* ---------------- POST: add ---------------- */
if ($method === 'POST') {
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($len > 8192) respond(413, ['error' => 'Review is too long.']);

    $in = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($in)) respond(400, ['error' => 'Invalid request.']);

    // honeypot: real people never fill this hidden field
    if (!empty($in['website'])) respond(201, ['ok' => true]);

    $name   = clean((string)($in['name'] ?? ''), 40);
    $text   = clean((string)($in['text'] ?? ''), 600);
    $rating = filter_var($in['rating'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);

    $errors = [];
    if (mb_strlen($name) < 2)  $errors['name']   = 'Please enter your name (at least 2 letters).';
    if ($rating === false)     $errors['rating'] = 'Please choose a star rating.';
    if (mb_strlen($text) < 10) $errors['text']   = 'Please write at least 10 characters.';
    if ($errors) respond(422, ['error' => 'Please check the form.', 'fields' => $errors]);

    // rate limit per visitor (IP is hashed, never stored raw)
    $who = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|cwk-salt');
    $now = time();
    $allowed = with_json(LIMITS_FILE, function ($d) use ($who, $now) {
        foreach ($d as $k => $times) {
            $d[$k] = array_values(array_filter($times, fn($t) => $t > $now - 3600));
            if (!$d[$k]) unset($d[$k]);
        }
        $mine = $d[$who] ?? [];
        if (count($mine) >= MAX_PER_HOUR) return [false, $d];
        $mine[] = $now;
        $d[$who] = $mine;
        return [true, $d];
    });
    if (!$allowed) respond(429, ['error' => 'You have posted a few reviews already. Please try again later.']);

    $review = [
        'id'     => bin2hex(random_bytes(6)),
        'name'   => $name,
        'rating' => $rating,
        'text'   => $text,
        'date'   => gmdate('c'),
    ];
    with_json(REVIEWS_FILE, function ($d) use ($review) {
        $d[] = $review;
        if (count($d) > MAX_REVIEWS) $d = array_slice($d, -MAX_REVIEWS);
        return [null, $d];
    });

    respond(201, ['ok' => true, 'review' => $review]);
}

header('Allow: GET, POST');
respond(405, ['error' => 'Method not allowed.']);
