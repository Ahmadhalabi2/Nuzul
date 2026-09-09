<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class BookingController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // GET /api/bookings/recent  (public — بدون auth)
    // يعيد آخر 10 حجوزات مقبولة/مؤكدة بدون بيانات حساسة
    // الهدف: Social Proof على الصفحة الرئيسية للمستخدمين
    // ─────────────────────────────────────────────────────────────────────
    public function recent()
    {
        $bookings = Booking::whereIn('status', [
                Booking::STATUS_ACCEPTED,
                Booking::STATUS_PAID,
                Booking::STATUS_COMPLETED,
            ])
            ->orderByDesc('created_at')
            ->limit(12)
            ->get(['hotel_name', 'city', 'country', 'guests', 'created_at']);

        $data = $bookings->map(fn($b) => [
            'hotelName' => $b->hotel_name,
            'city'      => $b->city,
            'country'   => $b->country,
            'guests'    => $b->guests,
            'minutesAgo'=> (int) $b->created_at->diffInMinutes(now()),
        ]);

        return response()->json(['success' => true, 'bookings' => $data]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/bookings
    // superadmin → كل الحجوزات | user → حجوزاته فقط
    // ─────────────────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Booking::with(['hotel:id,name,image_url', 'rating:id,booking_id,stars,comment']);

        if ($user->isUser()) {
            $query->where('user_id', $user->id);
        }

        $bookings = $query->orderByDesc('created_at')->get()->map(fn($b) => $this->format($b));

        return response()->json(['success' => true, 'bookings' => $bookings]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/bookings
    // ─────────────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'hotel_id'  => 'required|exists:hotels,id',
            'check_in'  => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'guests'    => 'required|integer|min:1|max:20',
            'room_type' => 'sometimes|string|in:standard,suite,family',
            'notes'     => 'sometimes|nullable|string|max:500',
        ]);

        $user  = $request->user();
        $hotel = Hotel::findOrFail($request->hotel_id);

        $checkIn  = Carbon::parse($request->check_in);
        $checkOut = Carbon::parse($request->check_out);
        $nights   = $checkIn->diffInDays($checkOut);
        $price    = $hotel->discount_price ?? $hotel->price_per_night;
        $amount   = round($price * $nights, 2);

        $booking = Booking::create([
            'booking_ref'  => Booking::generateRef(),
            'user_id'      => $user->id,
            'user_name'    => $user->name,
            'user_email'   => $user->email,
            'hotel_id'     => $hotel->id,
            'hotel_name'   => $hotel->name,
            'country'      => $hotel->country,
            'city'         => $hotel->city,
            'check_in'     => $request->check_in,
            'check_out'    => $request->check_out,
            'nights'       => $nights,
            'guests'       => $request->guests,
            'amount'       => $amount,
            'room_type'    => $request->room_type ?? 'standard',
            'notes'        => $request->notes,
            'status'       => Booking::STATUS_PENDING,
        ]);

        // إشعار للـ superadmin
        $this->notify([
            'booking_id'          => $booking->id,
            'created_by_user_id'  => $user->id,
            'created_by_name'     => $user->name,
            'target_role'         => 'superadmin',
            'target_user_id'      => null,
            'type'                => 'booking_created',
            'title'               => 'طلب حجز جديد بانتظار الموافقة',
            'description'         => "حجز لـ {$hotel->name} من {$request->check_in} إلى {$request->check_out} لعدد {$request->guests} نزلاء ({$nights} ليالي).",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال طلب الحجز بنجاح وهو بانتظار الموافقة.',
            'booking' => $this->format($booking),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/bookings/{id}/accept  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function accept(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        $actor   = $request->user();

        if (!$booking->canAccept()) {
            return response()->json(['success' => false, 'message' => 'لا يمكن قبول هذا الحجز بحالته الحالية.'], 422);
        }

        $booking->update([
            'status'          => Booking::STATUS_ACCEPTED,
            'decided_by_id'   => $actor->id,
            'decided_by_name' => $actor->name,
            'decided_at'      => now(),
        ]);

        $this->notify([
            'booking_id'         => $booking->id,
            'created_by_user_id' => $actor->id,
            'created_by_name'    => $actor->name,
            'target_role'        => 'user',
            'target_user_id'     => $booking->user_id,
            'type'               => 'booking_accepted',
            'title'              => 'تم قبول حجزك ✅',
            'description'        => "تم قبول حجزك في {$booking->hotel_name}. يرجى إتمام الدفع لتأكيد الإقامة.",
        ]);

        return response()->json(['success' => true, 'message' => 'تم قبول الحجز.', 'booking' => $this->format($booking->fresh())]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/bookings/{id}/cancel
    // superadmin (مع سبب) أو user (حجزه فقط)
    // ─────────────────────────────────────────────────────────────────────
    public function cancel(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        $actor   = $request->user();

        // التحقق من الصلاحية
        if ($actor->isUser() && $booking->user_id !== $actor->id) {
            return response()->json(['success' => false, 'message' => 'لا يمكنك إلغاء حجز شخص آخر.'], 403);
        }

        if (!$booking->canCancelByUser()) {
            return response()->json(['success' => false, 'message' => 'لا يمكن إلغاء هذا الحجز بحالته الحالية.'], 422);
        }

        $isByAdmin  = $actor->isSuperAdmin();
        $reason     = $request->reason ?? null;

        if ($isByAdmin && empty(trim($reason ?? ''))) {
            return response()->json(['success' => false, 'message' => 'يجب إدخال سبب الإلغاء.'], 422);
        }

        $booking->update([
            'status'          => $isByAdmin ? Booking::STATUS_CANCEL_ADM : Booking::STATUS_CANCEL_USR,
            'decided_by_id'   => $actor->id,
            'decided_by_name' => $actor->name,
            'decided_at'      => now(),
            'reason'          => $reason,
        ]);

        // إشعار للطرف الآخر
        if ($isByAdmin) {
            $this->notify([
                'booking_id'         => $booking->id,
                'created_by_user_id' => $actor->id,
                'created_by_name'    => $actor->name,
                'target_role'        => 'user',
                'target_user_id'     => $booking->user_id,
                'type'               => 'booking_cancelled',
                'title'              => 'تم إلغاء حجزك ❌',
                'description'        => "تم إلغاء حجزك في {$booking->hotel_name}. السبب: {$reason}",
            ]);
        } else {
            $this->notify([
                'booking_id'         => $booking->id,
                'created_by_user_id' => $actor->id,
                'created_by_name'    => $actor->name,
                'target_role'        => 'superadmin',
                'target_user_id'     => null,
                'type'               => 'booking_cancelled',
                'title'              => 'ألغى مستخدم حجزه',
                'description'        => "{$booking->user_name} ألغى حجزه في {$booking->hotel_name}.",
            ]);
        }

        return response()->json(['success' => true, 'message' => 'تم إلغاء الحجز.', 'booking' => $this->format($booking->fresh())]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/bookings/{id}/notify-payment  (user)
    // المستخدم يبلّغ الأدمن إنه دفع — يُسجَّل payment_notified_at
    // ─────────────────────────────────────────────────────────────────────
    public function notifyPayment(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        $actor   = $request->user();

        // تأكد أن الحجز ملك المستخدم وبحالة تقبل الإبلاغ
        if ($actor->isUser() && $booking->user_id !== $actor->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح.'], 403);
        }

        if ($booking->status !== Booking::STATUS_ACCEPTED) {
            return response()->json(['success' => false, 'message' => 'لا يمكن الإبلاغ عن الدفع في هذه المرحلة.'], 422);
        }

        $booking->update(['payment_notified_at' => now()]);

        // إشعار للأدمن
        $this->notify([
            'booking_id'         => $booking->id,
            'created_by_user_id' => $actor->id,
            'created_by_name'    => $actor->name,
            'target_role'        => 'superadmin',
            'target_user_id'     => null,
            'type'               => 'payment_notified',
            'title'              => '💳 مستخدم أبلغ عن إتمام الدفع',
            'description'        => "{$booking->user_name} أبلغ عن إتمام الدفع لحجزه في {$booking->hotel_name}. يرجى المراجعة والتأكيد.",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال إشعار الدفع للإدارة بنجاح.',
            'booking' => $this->format($booking->fresh()),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/bookings/{id}/mark-paid  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function markPaid(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        $actor   = $request->user();

        if (!$booking->canMarkPaid()) {
            return response()->json(['success' => false, 'message' => 'الحجز لا يمكن تأكيد دفعه بحالته الحالية.'], 422);
        }

        $booking->update([
            'status'          => Booking::STATUS_PAID,
            'paid_at'         => now(),
            'decided_by_id'   => $actor->id,
            'decided_by_name' => $actor->name,
        ]);

        $this->notify([
            'booking_id'         => $booking->id,
            'created_by_user_id' => $actor->id,
            'created_by_name'    => $actor->name,
            'target_role'        => 'user',
            'target_user_id'     => $booking->user_id,
            'type'               => 'booking_paid',
            'title'              => 'تم تأكيد دفع حجزك 💳',
            'description'        => "تم تأكيد استلام الدفع لحجزك في {$booking->hotel_name}. حجزك مؤكد الآن!",
        ]);

        return response()->json(['success' => true, 'message' => 'تم تأكيد الدفع.', 'booking' => $this->format($booking->fresh())]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/bookings/{id}/complete  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function complete(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        $actor   = $request->user();

        if (!$booking->canComplete()) {
            return response()->json(['success' => false, 'message' => 'الحجز يجب أن يكون مؤكداً ومدفوعاً أولاً.'], 422);
        }

        $booking->update([
            'status'          => Booking::STATUS_COMPLETED,
            'decided_at'      => now(),
            'decided_by_id'   => $actor->id,
            'decided_by_name' => $actor->name,
        ]);

        $this->notify([
            'booking_id'         => $booking->id,
            'created_by_user_id' => $actor->id,
            'created_by_name'    => $actor->name,
            'target_role'        => 'user',
            'target_user_id'     => $booking->user_id,
            'type'               => 'booking_completed',
            'title'              => 'تمت إقامتك بنجاح 🌟',
            'description'        => "شكراً لإقامتك في {$booking->hotel_name}. نتمنى أن تكون تجربتك رائعة!",
        ]);

        return response()->json(['success' => true, 'message' => 'تم إنهاء الإقامة.', 'booking' => $this->format($booking->fresh())]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE /api/bookings/{id}  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function destroy(int $id)
    {
        $booking = Booking::findOrFail($id);
        $booking->delete();

        return response()->json(['success' => true, 'message' => 'تم حذف الحجز نهائياً.']);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/bookings/send-confirmation  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function sendConfirmation(Request $request)
    {
        // يقبل booking_id رقمي أو booking object كامل من الفرونت
        $bookingId = $request->input('booking_id')
            ?? $request->input('booking.id')
            ?? null;

        $userEmail = $request->input('userEmail')
            ?? $request->input('booking.userEmail')
            ?? null;

        // إذا أُرسل booking object كامل — نبني بيانات الإيميل منه مباشرة
        $bookingData = $request->input('booking');

        if ($bookingData && is_array($bookingData)) {
            // استخدام البيانات من الـ object مباشرة
            $hotelName = $bookingData['hotelName'] ?? $bookingData['hotel_name'] ?? 'الفندق';
            $userName  = $bookingData['userName']  ?? $bookingData['user_name']  ?? '';
            $checkIn   = $bookingData['checkIn']   ?? $bookingData['check_in']   ?? '';
            $checkOut  = $bookingData['checkOut']  ?? $bookingData['check_out']  ?? '';
            $nights    = $bookingData['nights']    ?? 1;
            $guests    = $bookingData['guests']    ?? 1;
            $amount    = $bookingData['amount']    ?? 0;
            $bookingRef = $bookingData['id'] ?? $bookingData['booking_ref'] ?? '—';
            $city      = $bookingData['city'] ?? '';

            if (empty($userEmail)) {
                return response()->json(['success' => false, 'message' => 'لا يوجد إيميل مسجّل لهذا المستخدم.'], 422);
            }

            // نبني كائن وهمي لاستخدامه في buildConfirmationEmail
            $fakeBooking = new \stdClass();
            $fakeBooking->booking_ref = $bookingRef;
            $fakeBooking->user_name   = $userName;
            $fakeBooking->hotel_name  = $hotelName;
            $fakeBooking->city        = $city;
            $fakeBooking->check_in    = $checkIn ? \Carbon\Carbon::parse($checkIn) : null;
            $fakeBooking->check_out   = $checkOut ? \Carbon\Carbon::parse($checkOut) : null;
            $fakeBooking->nights      = $nights;
            $fakeBooking->guests      = $guests;
            $fakeBooking->amount      = $amount;

            try {
                \Illuminate\Support\Facades\Mail::html(
                    $this->buildConfirmationEmailFromData($fakeBooking),
                    function ($msg) use ($userEmail, $hotelName) {
                        $msg->to($userEmail)
                            ->subject("تأكيد حجزك في {$hotelName} — نُزُل")
                            ->from(
                                config('mail.from.address', 'noreply@nuzul.sy'),
                                config('mail.from.name', 'نُزُل Nuzul')
                            );
                    }
                );
            } catch (\Throwable $e) {
                return response()->json(['success' => false, 'message' => 'تعذّر إرسال الإيميل: ' . $e->getMessage()], 500);
            }

            return response()->json(['success' => true, 'message' => 'تم إرسال إيميل التأكيد بنجاح.']);
        }

        // fallback — booking_id رقمي
        if (!$bookingId) {
            return response()->json(['success' => false, 'message' => 'يجب تحديد الحجز.'], 422);
        }

        $booking = Booking::with('hotel')->find($bookingId);
        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'الحجز غير موجود.'], 404);
        }

        $email = $userEmail ?? $booking->user_email;
        if (empty($email)) {
            return response()->json(['success' => false, 'message' => 'لا يوجد إيميل مسجّل لهذا المستخدم.'], 422);
        }

        try {
            Mail::html($this->buildConfirmationEmail($booking), function ($msg) use ($email, $booking) {
                $msg->to($email)
                    ->subject("تأكيد حجزك في {$booking->hotel_name} — نُزُل")
                    ->from(
                        config('mail.from.address', 'noreply@nuzul.sy'),
                        config('mail.from.name', 'نُزُل Nuzul')
                    );
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'تعذّر إرسال الإيميل: ' . $e->getMessage()], 500);
        }

        return response()->json(['success' => true, 'message' => 'تم إرسال إيميل التأكيد بنجاح.']);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────
    private function notify(array $data): void
    {
        Notification::create($data);
    }

    private function format(Booking $b): array
    {
        return [
            'id'             => $b->id,
            'booking_ref'    => $b->booking_ref,
            'userId'         => $b->user_id,
            'userName'       => $b->user_name,
            'userEmail'      => $b->user_email,
            'hotelId'        => $b->hotel_id,
            'hotelName'      => $b->hotel_name,
            'hotelImage'     => $b->hotel?->image_url,
            'country'        => $b->country,
            'city'           => $b->city,
            'checkIn'        => $b->check_in?->format('Y-m-d'),
            'checkOut'       => $b->check_out?->format('Y-m-d'),
            'nights'         => $b->nights,
            'guests'         => $b->guests,
            'amount'         => $b->amount,
            'roomType'       => $b->room_type,
            'notes'          => $b->notes,
            'status'         => $b->status,
            'decidedByName'  => $b->decided_by_name,
            'reason'         => $b->reason,
            'createdAt'           => $b->created_at?->toISOString(),
            'decidedAt'           => $b->decided_at?->toISOString(),
            'paidAt'              => $b->paid_at?->toISOString(),
            'paymentNotifiedAt'   => $b->payment_notified_at?->toISOString(),
            'hasRating'           => $b->rating !== null,
        ];
    }

    private function buildConfirmationEmailFromData(object $b): string
    {
        $checkIn  = $b->check_in  ? (is_string($b->check_in)  ? $b->check_in  : $b->check_in->format('Y-m-d'))  : '—';
        $checkOut = $b->check_out ? (is_string($b->check_out) ? $b->check_out : $b->check_out->format('Y-m-d')) : '—';
        $amount   = number_format((float)$b->amount, 2);
        $ref      = $b->booking_ref ?? '—';

        return <<<HTML
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;direction:rtl;}
  .c{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);}
  .h{background:linear-gradient(135deg,#0E5C4A,#1a8a6b);padding:28px 24px;text-align:center;color:#fff;}
  .h h1{margin:0;font-size:26px;} .h p{margin:6px 0 0;opacity:.85;font-size:13px;}
  .b{padding:28px 24px;}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;}
  .row span:first-child{color:#666;} .row span:last-child{font-weight:600;color:#1a1a2e;}
  .total{background:#f0fdf4;border-radius:10px;padding:14px 18px;margin-top:16px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0E5C4A;}
  .f{background:#f9f9f9;padding:14px 24px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;}
  .ref{background:#eef2ff;border-radius:8px;padding:8px 14px;display:inline-block;font-weight:700;color:#4338ca;font-size:13px;direction:ltr;}
</style>
</head>
<body><div class="c">
  <div class="h"><h1>✅ تأكيد الحجز</h1><p>منصة نُزُل لحجز الفنادق السورية</p></div>
  <div class="b">
    <p style="font-size:15px;color:#333;margin-bottom:18px;">مرحباً <strong>{$b->user_name}</strong>، تم تأكيد حجزك بنجاح!</p>
    <div class="row"><span>رقم الحجز</span><span class="ref">{$ref}</span></div>
    <div class="row"><span>الفندق</span><span>{$b->hotel_name}</span></div>
    <div class="row"><span>المدينة</span><span>{$b->city}</span></div>
    <div class="row"><span>تاريخ الوصول</span><span>{$checkIn}</span></div>
    <div class="row"><span>تاريخ المغادرة</span><span>{$checkOut}</span></div>
    <div class="row"><span>عدد الليالي</span><span>{$b->nights} ليالي</span></div>
    <div class="row"><span>عدد النزلاء</span><span>{$b->guests} نزيل</span></div>
    <div class="total"><span>الإجمالي</span><span>\${$amount}</span></div>
  </div>
  <div class="f">© 2026 نُزُل Nuzul — شكراً لاختيارك منصتنا</div>
</div></body></html>
HTML;
    }

    private function buildConfirmationEmail(Booking $booking): string
    {
        $checkIn  = $booking->check_in->format('Y-m-d');
        $checkOut = $booking->check_out->format('Y-m-d');
        $amount   = number_format($booking->amount, 2);

        return <<<HTML
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;direction:rtl;}
  .c{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);}
  .h{background:linear-gradient(135deg,#0E5C4A,#1a8a6b);padding:28px 24px;text-align:center;color:#fff;}
  .h h1{margin:0;font-size:26px;} .h p{margin:6px 0 0;opacity:.85;font-size:13px;}
  .b{padding:28px 24px;}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;}
  .row span:first-child{color:#666;} .row span:last-child{font-weight:600;color:#1a1a2e;}
  .total{background:#f0fdf4;border-radius:10px;padding:14px 18px;margin-top:16px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0E5C4A;}
  .f{background:#f9f9f9;padding:14px 24px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;}
  .ref{background:#eef2ff;border-radius:8px;padding:8px 14px;display:inline-block;font-weight:700;color:#4338ca;font-size:13px;direction:ltr;}
</style>
</head>
<body><div class="c">
  <div class="h"><h1>✅ تأكيد الحجز</h1><p>منصة نُزُل لحجز الفنادق السورية</p></div>
  <div class="b">
    <p style="font-size:15px;color:#333;margin-bottom:18px;">مرحباً <strong>{$booking->user_name}</strong>، تم تأكيد حجزك بنجاح!</p>
    <div class="row"><span>رقم الحجز</span><span class="ref">{$booking->booking_ref}</span></div>
    <div class="row"><span>الفندق</span><span>{$booking->hotel_name}</span></div>
    <div class="row"><span>المدينة</span><span>{$booking->city}</span></div>
    <div class="row"><span>تاريخ الوصول</span><span>{$checkIn}</span></div>
    <div class="row"><span>تاريخ المغادرة</span><span>{$checkOut}</span></div>
    <div class="row"><span>عدد الليالي</span><span>{$booking->nights} ليالي</span></div>
    <div class="row"><span>عدد النزلاء</span><span>{$booking->guests} نزيل</span></div>
    <div class="total"><span>الإجمالي</span><span>\${$amount}</span></div>
  </div>
  <div class="f">© 2026 نُزُل Nuzul — شكراً لاختيارك منصتنا</div>
</div></body></html>
HTML;
    }
}
