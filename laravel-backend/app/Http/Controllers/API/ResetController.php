<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ResetController extends Controller
{
    /**
     * POST /api/reset
     * تصفير كامل للبيانات مع الحفاظ على حسابات الأدمن وموظفي الدعم
     * superadmin فقط
     */
    public function reset(Request $request)
    {
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            DB::table('chat_messages')->truncate();
            DB::table('chat_sessions')->truncate();
            DB::table('notifications')->truncate();
            DB::table('support_messages')->truncate();
            DB::table('support_threads')->truncate();
            DB::table('support_feedbacks')->truncate();
            DB::table('ratings')->truncate();
            DB::table('otps')->truncate();
            DB::table('bookings')->truncate();
            DB::table('personal_access_tokens')->truncate();

            // حذف المستخدمين العاديين فقط
            $users = User::where('role', 'user')->get();
            foreach ($users as $user) {
                if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
                    Storage::disk('public')->delete($user->avatar);
                }
                $user->delete();
            }

            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            return response()->json([
                'success' => true,
                'message' => 'تم تصفير البيانات بنجاح. تم الحفاظ على حسابات الأدمن وموظفي الدعم.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء التصفير: ' . $e->getMessage(),
            ], 500);
        }
    }
}
