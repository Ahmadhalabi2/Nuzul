<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // GET /api/notifications
    public function index(Request $request)
    {
        $user  = $request->user();
        $notifs = Notification::forUser($user)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($n) => $this->format($n));

        return response()->json([
            'success'       => true,
            'notifications' => $notifs,
            'unread_count'  => $notifs->where('is_read', false)->count(),
        ]);
    }

    // PATCH /api/notifications/{id}/read
    public function markRead(Request $request, int $id)
    {
        $notif = Notification::findOrFail($id);
        $this->authorizeNotif($request, $notif);
        $notif->update(['is_read' => true]);
        return response()->json(['success' => true]);
    }

    // PATCH /api/notifications/read-all
    public function markAllRead(Request $request)
    {
        $user = $request->user();
        Notification::forUser($user)->update(['is_read' => true]);
        return response()->json(['success' => true, 'message' => 'تم تعليم كل الإشعارات مقروءة.']);
    }

    // DELETE /api/notifications/{id}
    public function dismiss(Request $request, int $id)
    {
        $notif = Notification::findOrFail($id);
        $this->authorizeNotif($request, $notif);
        $notif->update(['dismissed' => true]);
        return response()->json(['success' => true]);
    }

    // POST /api/notifications  (internal — يُستخدم من Controllers الأخرى فقط)
    public function store(Request $request)
    {
        $data = $request->validate([
            'booking_id'         => 'nullable|exists:bookings,id',
            'created_by_user_id' => 'nullable|exists:users,id',
            'created_by_name'    => 'nullable|string',
            'target_role'        => 'required|in:superadmin,support,user',
            'target_user_id'     => 'nullable|exists:users,id',
            'type'               => 'required|string',
            'title'              => 'required|string',
            'description'        => 'nullable|string',
        ]);

        $notif = Notification::create($data);
        return response()->json(['success' => true, 'notification' => $this->format($notif)], 201);
    }

    // ─── Helper ───────────────────────────────────────────────────────────
    private function authorizeNotif(Request $request, Notification $notif): void
    {
        $user = $request->user();
        if ($notif->target_user_id && $notif->target_user_id !== $user->id && !$user->isSuperAdmin()) {
            abort(403, 'ليس لديك صلاحية.');
        }
    }

    private function format(Notification $n): array
    {
        return [
            'id'            => $n->id,
            'bookingId'     => $n->booking_id,
            'createdByName' => $n->created_by_name,
            'targetRole'    => $n->target_role,
            'targetUserId'  => $n->target_user_id,
            'type'          => $n->type,
            'title'         => $n->title,
            'description'   => $n->description,
            'is_read'       => $n->is_read,
            'dismissed'     => $n->dismissed,
            'createdAt'     => $n->created_at?->toISOString(),
        ];
    }
}
