<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use App\Models\Wallet;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // POST /api/onboarding/complete
    // يستقبل كل بيانات الـ onboarding دفعة واحدة ويحفظها
    // ─────────────────────────────────────────────────────────────────────
    public function complete(Request $request)
    {
        $request->validate([
            // الملف الشخصي
            'phone'                  => 'required|string|max:20',
            'birth_date'             => 'required|date|before:today',
            'gender'                 => 'required|in:male,female',
            'city'                   => 'required|string|max:100',
            'province_id'            => 'required|exists:provinces,id',

            // التفضيلات
            'preferred_hotel_types'  => 'required|array|min:1',
            'preferred_hotel_types.*'=> 'in:luxury,heritage,beach,budget,mountain,resort',
            'budget_min'             => 'required|integer|min:0',
            'budget_max'             => 'required|integer|gt:budget_min',
            'preferred_provinces'    => 'required|array|min:1',
            'preferred_provinces.*'  => 'exists:provinces,id',
            'travel_type'            => 'required|in:solo,couple,family,business',

            // المحفظة
            'wallet_balance'         => 'required|numeric|min:0',
            'wallet_currency'        => 'required|in:USD,SYP',
        ]);

        $user = $request->user();

        // حفظ أو تحديث الـ profile
        UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'phone'                 => $request->phone,
                'birth_date'            => $request->birth_date,
                'gender'                => $request->gender,
                'city'                  => $request->city,
                'province_id'           => $request->province_id,
                'preferred_hotel_types' => $request->preferred_hotel_types,
                'budget_min'            => $request->budget_min,
                'budget_max'            => $request->budget_max,
                'preferred_provinces'   => $request->preferred_provinces,
                'travel_type'           => $request->travel_type,
            ]
        );

        // إنشاء المحفظة
        Wallet::updateOrCreate(
            ['user_id' => $user->id],
            [
                'balance'  => $request->wallet_balance,
                'currency' => $request->wallet_currency,
            ]
        );

        // تعليم الـ onboarding كمكتمل
        $user->update(['onboarding_completed' => true]);

        return response()->json([
            'success' => true,
            'message' => 'تم إتمام إعداد الحساب بنجاح!',
            'user'    => [
                'id'                   => $user->id,
                'name'                 => $user->name,
                'email'                => $user->email,
                'role'                 => $user->role,
                'avatar'               => $user->avatar,
                'onboarding_completed' => true,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/onboarding/status
    // يُعيد حالة الـ onboarding + الـ profile + الـ wallet
    // ─────────────────────────────────────────────────────────────────────
    public function status(Request $request)
    {
        $user    = $request->user()->load(['profile.province', 'wallet']);
        $profile = $user->profile;
        $wallet  = $user->wallet;

        return response()->json([
            'success'               => true,
            'onboarding_completed'  => (bool) $user->onboarding_completed,
            'profile'               => $profile ? [
                'phone'                 => $profile->phone,
                'birth_date'            => $profile->birth_date?->format('Y-m-d'),
                'gender'                => $profile->gender,
                'city'                  => $profile->city,
                'province_id'           => $profile->province_id,
                'province_name'         => $profile->province?->name_ar,
                'preferred_hotel_types' => $profile->preferred_hotel_types ?? [],
                'budget_min'            => $profile->budget_min,
                'budget_max'            => $profile->budget_max,
                'preferred_provinces'   => $profile->preferred_provinces ?? [],
                'travel_type'           => $profile->travel_type,
            ] : null,
            'wallet' => $wallet ? [
                'balance'  => (float) $wallet->balance,
                'currency' => $wallet->currency,
            ] : null,
        ]);
    }
}
