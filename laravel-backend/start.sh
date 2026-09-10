#!/usr/bin/env bash
set -e

echo "==> Writing .env from Railway environment variables..."

{
  echo "APP_NAME=\"Nuzul\""
  echo "APP_ENV=production"
  echo "APP_KEY="
  echo "APP_DEBUG=true"
  echo "APP_URL=https://nuzul-production-3237.up.railway.app"
  echo "APP_LOCALE=ar"
  echo "APP_FALLBACK_LOCALE=en"
  echo "LOG_CHANNEL=stack"
  echo "LOG_LEVEL=error"
  echo "DB_CONNECTION=mysql"
  printf 'DB_HOST=%s\n'     "${MYSQLHOST}"
  printf 'DB_PORT=%s\n'     "${MYSQLPORT}"
  printf 'DB_DATABASE=%s\n' "${MYSQLDATABASE}"
  printf 'DB_USERNAME=%s\n' "${MYSQLUSER}"
  printf 'DB_PASSWORD=%s\n' "${MYSQLPASSWORD}"
  echo "SESSION_DRIVER=cookie"
  echo "SESSION_LIFETIME=120"
  echo "SESSION_ENCRYPT=false"
  echo "SESSION_PATH=/"
  echo "SESSION_DOMAIN=null"
  echo "CACHE_STORE=array"
  echo "QUEUE_CONNECTION=sync"
  echo "FILESYSTEM_DISK=local"
  echo "MAIL_MAILER=smtp"
  echo "MAIL_HOST=smtp.gmail.com"
  echo "MAIL_PORT=587"
  echo "MAIL_ENCRYPTION=tls"
  printf 'MAIL_USERNAME=%s\n'     "${MAIL_USERNAME}"
  printf 'MAIL_PASSWORD=%s\n'     "${MAIL_PASSWORD}"
  printf 'MAIL_FROM_ADDRESS=%s\n' "${MAIL_FROM_ADDRESS}"
  echo "MAIL_FROM_NAME=\"Nuzul\""
  printf 'GEMINI_API_KEY=%s\n' "${GEMINI_API_KEY}"
  printf 'FRONTEND_URL=%s\n'   "${FRONTEND_URL}"
} > /app/.env

echo "==> Verifying critical vars..."
echo "DB_HOST     = ${MYSQLHOST}"
echo "MAIL_PASS   = $([ -n "${MAIL_PASSWORD}" ] && echo 'SET ✓' || echo 'EMPTY ✗')"
echo "GEMINI_KEY  = $([ -n "${GEMINI_API_KEY}" ] && echo 'SET ✓' || echo 'EMPTY ✗')"

echo "==> Generating app key..."
php artisan key:generate --force

echo "==> Clearing ALL cache..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo "==> Running migrations..."
php artisan migrate --force

echo "==> Seeding (idempotent)..."
php artisan db:seed --force || echo "Seed skipped."

echo "==> Caching config & routes..."
php artisan config:cache
php artisan route:cache

echo "==> Verify mail config after cache..."
php -r "
  require '/app/vendor/autoload.php';
  \$app = require '/app/bootstrap/app.php';
  \$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
  echo 'MAIL_HOST: ' . config('mail.mailers.smtp.host') . PHP_EOL;
  echo 'MAIL_USER: ' . config('mail.mailers.smtp.username') . PHP_EOL;
  echo 'MAIL_PASS: ' . (config('mail.mailers.smtp.password') ? 'SET ✓' : 'EMPTY ✗') . PHP_EOL;
"

echo "==> ✅ Starting PHP server on port ${PORT}..."
exec php -S 0.0.0.0:${PORT} -t public
