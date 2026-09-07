<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SupportThread;
use App\Models\SupportMessage;
use App\Models\SupportFeedback;
use App\Models\Notification;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // GET /api/support/threads
    // support/superadmin → كل الثريدات | user → ثريده فقط
    // ─────────────────────────────────────────────────────────────────────
    public function threads(Request $request)
    {
        $user = $request->user();

        if ($user->isUser()) {
            $thread = SupportThread::firstOrCreate(
                ['user_id' => $user->id],
                ['user_name' => $user->name]
            );
            return response()->json(['success' => true, 'threads' => [$this->formatThread($thread)]]);
        }

        $threads = SupportThread::with('user:id,name,avatar')
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn($t) => $this->formatThread($t));

        return response()->json(['success' => true, 'threads' => $threads]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/support/threads  (user — إنشاء أو جلب ثريده)
    // ─────────────────────────────────────────────────────────────────────
    public function ensureThread(Request $request)
    {
        $user   = $request->user();
        $thread = SupportThread::firstOrCreate(
            ['user_id' => $user->id],
            ['user_name' => $user->name]
        );
        return response()->json(['success' => true, 'thread' => $this->formatThread($thread)]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/support/threads/{id}/messages
    // ─────────────────────────────────────────────────────────────────────
    public function messages(Request $request, int $id)
    {
        $thread = SupportThread::findOrFail($id);
        $this->authorizeThread($request, $thread);

        $messages = SupportMessage::where('thread_id', $id)
            ->orderBy('created_at')
            ->get()
            ->map(fn($m) => $this->formatMessage($m));

        return response()->json(['success' => true, 'messages' => $messages]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/support/threads/{id}/messages
    // ─────────────────────────────────────────────────────────────────────
    public function sendMessage(Request $request, int $id)
    {
        $thread = SupportThread::findOrFail($id);
        $user   = $request->user();
        $this->authorizeThread($request, $thread);

        $request->validate(['content' => 'required|string|max:2000']);

        $message = SupportMessage::create([
            'thread_id'   => $thread->id,
            'sender_role' => $user->role,
            'sender_id'   => $user->id,
            'sender_name' => $user->name,
            'content'     => $request->content,
        ]);

        // تحديث عدد الرسائل غير المقروءة والوقت
        if ($user->isUser()) {
            $thread->increment('unread_for_support');
            // إشعار للـ support
            Notification::create([
                'created_by_user_id' => $user->id,
                'created_by_name'    => $user->name,
                'target_role'        => 'support',
                'type'               => 'support_message',
                'title'              => 'رسالة دعم جديدة من ' . $user->name,
                'description'        => substr($request->content, 0, 100),
            ]);
        } else {
            $thread->increment('unread_for_user');
        }

        $thread->update(['last_message_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => $this->formatMessage($message),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/support/threads/{id}/read
    // ─────────────────────────────────────────────────────────────────────
    public function markThreadRead(Request $request, int $id)
    {
        $thread = SupportThread::findOrFail($id);
        $user   = $request->user();

        if ($user->isUser()) {
            $thread->update(['unread_for_user' => 0]);
        } else {
            $thread->update(['unread_for_support' => 0]);
        }

        return response()->json(['success' => true]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE /api/support/threads/{id}  (support/superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function deleteThread(Request $request, int $id)
    {
        $thread = SupportThread::findOrFail($id);
        $thread->delete(); // cascade يحذف الرسائل تلقائياً
        return response()->json(['success' => true, 'message' => 'تم حذف المحادثة.']);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/support/feedbacks
    // ─────────────────────────────────────────────────────────────────────
    public function feedbacks(Request $request)
    {
        $user = $request->user();

        $query = SupportFeedback::orderByDesc('created_at');

        if ($user->isUser()) {
            $query->where('user_id', $user->id);
        }

        $feedbacks = $query->get()->map(fn($f) => $this->formatFeedback($f));

        return response()->json(['success' => true, 'feedbacks' => $feedbacks]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/support/feedbacks  (user)
    // ─────────────────────────────────────────────────────────────────────
    public function createFeedback(Request $request)
    {
        $request->validate(['message' => 'required|string|max:1000']);
        $user = $request->user();

        $feedback = SupportFeedback::create([
            'user_id'   => $user->id,
            'user_name' => $user->name,
            'message'   => $request->message,
        ]);

        return response()->json([
            'success'  => true,
            'message'  => 'تم إرسال رسالتك.',
            'feedback' => $this->formatFeedback($feedback),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/support/feedbacks/{id}/reply  (support/superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function replyFeedback(Request $request, int $id)
    {
        $request->validate(['reply' => 'required|string|max:1000']);
        $feedback = SupportFeedback::findOrFail($id);

        $feedback->update([
            'reply'              => $request->reply,
            'replied_at'         => now(),
            'is_read_by_support' => true,
        ]);

        return response()->json([
            'success'  => true,
            'message'  => 'تم الرد بنجاح.',
            'feedback' => $this->formatFeedback($feedback->fresh()),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/support/feedbacks/{id}/read  (support)
    // ─────────────────────────────────────────────────────────────────────
    public function markFeedbackRead(int $id)
    {
        SupportFeedback::findOrFail($id)->update(['is_read_by_support' => true]);
        return response()->json(['success' => true]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────
    private function authorizeThread(Request $request, SupportThread $thread): void
    {
        $user = $request->user();
        if ($user->isUser() && $thread->user_id !== $user->id) {
            abort(403, 'ليس لديك صلاحية للوصول لهذه المحادثة.');
        }
    }

    private function formatThread(SupportThread $t): array
    {
        return [
            'id'                 => $t->id,
            'userId'             => $t->user_id,
            'userName'           => $t->user_name,
            'unreadForSupport'   => $t->unread_for_support,
            'unreadForUser'      => $t->unread_for_user,
            'lastMessageAt'      => $t->last_message_at?->toISOString(),
            'createdAt'          => $t->created_at?->toISOString(),
        ];
    }

    private function formatMessage(SupportMessage $m): array
    {
        return [
            'id'         => $m->id,
            'threadId'   => $m->thread_id,
            'senderRole' => $m->sender_role,
            'senderId'   => $m->sender_id,
            'senderName' => $m->sender_name,
            'content'    => $m->content,
            'createdAt'  => $m->created_at?->toISOString(),
        ];
    }

    private function formatFeedback(SupportFeedback $f): array
    {
        return [
            'id'               => $f->id,
            'userId'           => $f->user_id,
            'userName'         => $f->user_name,
            'message'          => $f->message,
            'reply'            => $f->reply,
            'isReadBySupport'  => $f->is_read_by_support,
            'repliedAt'        => $f->replied_at?->toISOString(),
            'createdAt'        => $f->created_at?->toISOString(),
        ];
    }
}
