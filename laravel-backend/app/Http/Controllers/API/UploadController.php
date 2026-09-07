<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    // POST /api/upload/avatar
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,jpg,png,webp|max:3072', // 3MB
        ]);

        $user = $request->user();

        // حذف الصورة القديمة
        if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar' => $path]);

        return response()->json([
            'success'   => true,
            'message'   => 'تم رفع الصورة بنجاح.',
            'avatarUrl' => asset('storage/' . $path),
        ]);
    }

    // DELETE /api/upload/avatar
    public function deleteAvatar(Request $request)
    {
        $user = $request->user();

        if (!$user->avatar) {
            return response()->json(['success' => false, 'message' => 'لا توجد صورة لحذفها.'], 404);
        }

        if (!str_starts_with($user->avatar, 'http')) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->update(['avatar' => null]);

        return response()->json(['success' => true, 'message' => 'تم حذف الصورة.']);
    }
}
