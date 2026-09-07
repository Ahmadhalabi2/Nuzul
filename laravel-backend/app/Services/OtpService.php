<?php

namespace App\Services;

use App\Models\Otp;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;

class OtpService
{
    public function generate(string $email, string $type, array $extra = []): string
    {
        // إلغاء OTPs القديمة لنفس الإيميل والنوع
        Otp::where('email', $email)
            ->where('type', $type)
            ->whereNull('used_at')
            ->update(['used_at' => Carbon::now()]);

        $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        Otp::create(array_merge([
            'email'      => $email,
            'code'       => $code,
            'type'       => $type,
            'expires_at' => Carbon::now()->addMinutes(10),
        ], $extra));

        return $code;
    }

    public function verify(string $email, string $code, string $type): ?Otp
    {
        $otp = Otp::where('email', $email)
            ->where('code', $code)
            ->where('type', $type)
            ->whereNull('used_at')
            ->latest()
            ->first();

        if (!$otp || !$otp->isValid()) {
            return null;
        }

        return $otp;
    }

    public function sendEmail(string $email, string $code, string $type): void
    {
        $subject = $type === 'register'
            ? 'رمز التحقق لتفعيل حسابك في نُزُل'
            : 'رمز إعادة تعيين كلمة المرور — نُزُل';

        $purposeText = $type === 'register'
            ? 'لإتمام تسجيل حسابك في منصة نُزُل'
            : 'لإعادة تعيين كلمة المرور الخاصة بحسابك';

        Mail::html($this->buildEmailHtml($code, $purposeText), function ($message) use ($email, $subject) {
            $message->to($email)
                    ->subject($subject)
                    ->from(
                        config('mail.from.address', 'noreply@nuzul.sy'),
                        config('mail.from.name', 'نُزُل Nuzul')
                    );
        });
    }

    private function buildEmailHtml(string $code, string $purposeText): string
    {
        return <<<HTML
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
  .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
  .header { background: linear-gradient(135deg, #0E5C4A, #1a8a6b); padding: 32px 24px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 28px; letter-spacing: 2px; }
  .header p  { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 32px 24px; text-align: center; }
  .body p { color: #444; font-size: 15px; line-height: 1.7; }
  .code { font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #0E5C4A; background: #f0fdf4; border: 2px dashed #0E5C4A; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 20px 0; direction: ltr; }
  .footer { background: #f9f9f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>نُزُل</h1>
    <p>منصة حجز الفنادق السورية</p>
  </div>
  <div class="body">
    <p>مرحباً! هذا هو رمز التحقق الخاص بك {$purposeText}:</p>
    <div class="code">{$code}</div>
    <p>الرمز صالح لمدة <strong>10 دقائق</strong> فقط.<br>إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا الإيميل.</p>
  </div>
  <div class="footer">© 2026 نُزُل Nuzul — منصة حجز الفنادق السورية</div>
</div>
</body>
</html>
HTML;
    }
}
