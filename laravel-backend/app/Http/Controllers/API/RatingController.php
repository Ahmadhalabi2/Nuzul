<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Rating;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    // POST /api/ratings
    public function store(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'stars'      => 'required|integer|between:1,5',
            'comment'    => 'nullable|string|max:1000',
        ]);

        $user    = $request->user();
        $booking = Booking::findOrFail($request->booking_id);

        // التحقق: الحجز يخص هذا المستخدم
        if ($booking->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'لا يمكنك تقييم حجز شخص آخر.'], 403);
        }

        // التحقق: الحجز مكتمل أو مؤكد مدفوع
        if (!in_array($booking->status, ['completed', 'paid_confirmed'])) {
            return response()->json(['success' => false, 'message' => 'يمكن التقييم للحجوزات المكتملة أو المؤكدة فقط.'], 422);
        }

        // التحقق: لم يُقيّم من قبل
        if (Rating::where('booking_id', $booking->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'لقد قيّمت هذا الحجز مسبقاً.'], 409);
        }

        $rating = Rating::create([
            'booking_id' => $booking->id,
            'user_id'    => $user->id,
            'hotel_id'   => $booking->hotel_id,
            'stars'      => $request->stars,
            'comment'    => $request->comment,
        ]);

        // تحديث متوسط تقييم الفندق
        $avg = Rating::where('hotel_id', $booking->hotel_id)->avg('stars');
        $booking->hotel->update(['rating' => round($avg, 1)]);

        return response()->json([
            'success' => true,
            'message' => 'شكراً على تقييمك!',
            'rating'  => [
                'id'         => $rating->id,
                'booking_id' => $rating->booking_id,
                'hotel_id'   => $rating->hotel_id,
                'stars'      => $rating->stars,
                'comment'    => $rating->comment,
                'created_at' => $rating->created_at?->toISOString(),
            ],
        ], 201);
    }

    // GET /api/ratings?hotel_id=X
    public function index(Request $request)
    {
        $request->validate(['hotel_id' => 'required|exists:hotels,id']);

        $ratings = Rating::with('user:id,name')
            ->where('hotel_id', $request->hotel_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($r) => [
                'id'         => $r->id,
                'stars'      => $r->stars,
                'comment'    => $r->comment,
                'user_name'  => $r->user?->name,
                'created_at' => $r->created_at?->toISOString(),
            ]);

        $avg = $ratings->avg('stars');

        return response()->json([
            'success'        => true,
            'ratings'        => $ratings,
            'average'        => $avg ? round($avg, 1) : null,
            'total'          => $ratings->count(),
        ]);
    }
}
