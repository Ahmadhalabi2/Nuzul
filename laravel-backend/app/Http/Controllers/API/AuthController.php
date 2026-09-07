<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Otp;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private OtpService $otpService) {}

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/login
    // ─────────────────────────────────────────────────────────────────────
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'الإيميل أو كلمة المرور غير صحيحة.',
            ], 401);
        }

        // حذف tokens القديمة وإنشاء token جديد
        $user->tokens()->delete();
        $token = $user->createToken('nuzul-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'مرحباً بعودتك، ' . $user->name . '!',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/register  (تسجيل مباشر بدون OTP)
    // ─────────────────────────────────────────────────────────────────────
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user  = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => 'user',
        ]);

        $token = $user->createToken('nuzul-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء الحساب بنجاح!',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/send-otp  (إرسال OTP للتسجيل)
    // ─────────────────────────────────────────────────────────────────────
    public function sendOtp(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $code = $this->otpService->generate($request->email, 'register', [
            'name'          => $request->name,
            'password_hash' => Hash::make($request->password),
        ]);

        try {
            $this->otpService->sendEmail($request->email, $code, 'register');
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'تعذّر إرسال الإيميل. تحقق من إعدادات البريد.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال رمز التحقق إلى ' . $request->email,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/verify-otp  (تأكيد OTP وإنشاء الحساب)
    // ─────────────────────────────────────────────────────────────────────
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $otpRecord = $this->otpService->verify($request->email, $request->otp, 'register');

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
            ], 422);
        }

        // التحقق من عدم تسجيل الإيميل مجدداً (race condition)
        if (User::where('email', $request->email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'هذا الإيميل مسجل مسبقاً.',
            ], 409);
        }

        $user = User::create([
            'name'     => $otpRecord->name,
            'email'    => $request->email,
            'password' => $otpRecord->password_hash,
            'role'     => 'user',
        ]);

        $otpRecord->markUsed();
        $token = $user->createToken('nuzul-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء الحساب وتفعيله بنجاح!',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/forgot-password  (إرسال OTP لاسترداد كلمة المرور)
    // ─────────────────────────────────────────────────────────────────────
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // لا نُفصح عن وجود/عدم وجود الإيميل لأسباب أمنية
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'إذا كان الإيميل مسجلاً، ستصلك رسالة بالرمز.',
            ]);
        }

        $code = $this->otpService->generate($request->email, 'forgot_password');

        try {
            $this->otpService->sendEmail($request->email, $code, 'forgot_password');
        } catch (\Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'تعذّر إرسال الإيميل.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال رمز إعادة التعيين إلى ' . $request->email,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/reset-password
    // ─────────────────────────────────────────────────────────────────────
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'       => 'required|email',
            'otp'         => 'required|string|size:6',
            'newPassword' => 'required|string|min:6',
        ]);

        $otpRecord = $this->otpService->verify($request->email, $request->otp, 'forgot_password');

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'المستخدم غير موجود.'], 404);
        }

        $user->update(['password' => Hash::make($request->newPassword)]);
        $otpRecord->markUsed();

        // إلغاء كل التوكنات الحالية لإجبار المستخدم على تسجيل دخول جديد
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/auth/profile  (تعديل الاسم أو كلمة المرور)
    // ─────────────────────────────────────────────────────────────────────
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        // تحديث الاسم فقط
        if ($request->has('name') && !$request->has('currentPassword')) {
            $request->validate(['name' => 'required|string|max:100']);
            $user->update(['name' => $request->name]);

            return response()->json([
                'success' => true,
                'message' => 'تم تحديث الاسم بنجاح.',
                'user'    => $this->formatUser($user->fresh()),
            ]);
        }

        // تغيير كلمة المرور
        if ($request->has('currentPassword')) {
            $request->validate([
                'currentPassword' => 'required|string',
                'newPassword'     => 'required|string|min:6',
            ]);

            if (!Hash::check($request->currentPassword, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'كلمة المرور الحالية غير صحيحة.',
                ], 422);
            }

            $user->update(['password' => Hash::make($request->newPassword)]);

            return response()->json([
                'success' => true,
                'message' => 'تم تغيير كلمة المرور بنجاح.',
            ]);
        }

        return response()->json(['success' => false, 'message' => 'لا توجد بيانات للتحديث.'], 400);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE /api/auth/account
    // ─────────────────────────────────────────────────────────────────────
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'user') {
            return response()->json([
                'success' => false,
                'message' => 'لا يمكن حذف حسابات المديرين وموظفي الدعم.',
            ], 403);
        }

        // حذف الصورة إن وجدت
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الحساب بنجاح.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/auth/logout
    // ─────────────────────────────────────────────────────────────────────
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/auth/me
    // ─────────────────────────────────────────────────────────────────────
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user'    => $this->formatUser($request->user()),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/auth/users  (superadmin فقط)
    // ─────────────────────────────────────────────────────────────────────
    public function listUsers(Request $request)
    {
        $users = User::select('id', 'name', 'email', 'role', 'avatar', 'created_at')
            ->orderByRaw("FIELD(role, 'superadmin', 'support', 'user')")
            ->orderBy('created_at')
            ->get()
            ->map(fn($u) => $this->formatUser($u));

        return response()->json([
            'success' => true,
            'users'   => $users,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE /api/auth/users/{id}  (superadmin فقط)
    // ─────────────────────────────────────────────────────────────────────
    public function deleteUser(Request $request, int $id)
    {
        $target = User::findOrFail($id);

        if ($target->role !== 'user') {
            return response()->json([
                'success' => false,
                'message' => 'لا يمكن حذف حسابات المديرين أو موظفي الدعم.',
            ], 403);
        }

        if ($target->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'لا يمكنك حذف حسابك الخاص من هنا.',
            ], 403);
        }

        if ($target->avatar) {
            Storage::disk('public')->delete($target->avatar);
        }

        $target->tokens()->delete();
        $target->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف المستخدم بنجاح.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────────
    private function formatUser(User $user): array
    {
        return [
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'role'                 => $user->role,
            'avatar'               => $user->avatar
                ? (str_starts_with($user->avatar, 'http')
                    ? $user->avatar
                    : asset('storage/' . $user->avatar))
                : null,
            'onboarding_completed' => (bool) $user->onboarding_completed,
            'createdAt'            => $user->created_at?->toISOString(),
        ];
    }
}
