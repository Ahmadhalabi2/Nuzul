<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BookingController;
use App\Http\Controllers\API\HotelController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\SupportController;
use App\Http\Controllers\API\UploadController;
use App\Http\Controllers\API\RatingController;
use App\Http\Controllers\API\ResetController;
use App\Http\Controllers\API\ChatbotController;

// ── Health check ──────────────────────────────────────────────────────────────
Route::get('/ping', fn() => response()->json([
    'success' => true,
    'message' => 'Nuzul API is running 🚀',
    'version' => '1.0.0',
]));

// ── Auth (public) ─────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/register',        [AuthController::class, 'register']);
    Route::post('/send-otp',        [AuthController::class, 'sendOtp']);
    Route::post('/verify-otp',      [AuthController::class, 'verifyOtp']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);
});

// ── Hotels (public — عرض فقط) ─────────────────────────────────────────────────
Route::get('/hotels',            [HotelController::class, 'index']);
Route::get('/hotels/{id}',       [HotelController::class, 'show']);
Route::get('/provinces',         [HotelController::class, 'provinces']);

// ── Bookings (public — social proof فقط) ─────────────────────────────────────
Route::get('/bookings/recent',   [BookingController::class, 'recent']);

// ── Protected routes ──────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::get('/me',                AuthController::class . '@me');
        Route::post('/logout',           [AuthController::class, 'logout']);
        Route::patch('/profile',         [AuthController::class, 'updateProfile']);
        Route::delete('/account',        [AuthController::class, 'deleteAccount']);
        // superadmin فقط
        Route::middleware('role:superadmin')->group(function () {
            Route::get('/users',         [AuthController::class, 'listUsers']);
            Route::delete('/users/{id}', [AuthController::class, 'deleteUser']);
        });
    });

    // Hotels — إدارة (superadmin)
    // Upload Hotel Image
    Route::post('/hotels/upload-image', [HotelController::class, 'uploadImage']);
    Route::middleware('role:superadmin')->group(function () {
        Route::post('/hotels',           [HotelController::class, 'store']);
        Route::patch('/hotels/{id}',     [HotelController::class, 'update']);
        Route::delete('/hotels/{id}',    [HotelController::class, 'destroy']);
    });

    // Bookings
    Route::prefix('bookings')->group(function () {
        Route::get('/',                  [BookingController::class, 'index']);
        Route::post('/',                 [BookingController::class, 'store']);
        // superadmin actions
        Route::middleware('role:superadmin')->group(function () {
            // static routes أولاً قبل الـ dynamic /{id}
            Route::post('/send-confirmation',    [BookingController::class, 'sendConfirmation']);
            Route::patch('/{id}/accept',         [BookingController::class, 'accept']);
            Route::patch('/{id}/mark-paid',      [BookingController::class, 'markPaid']);
            Route::patch('/{id}/complete',       [BookingController::class, 'complete']);
            Route::delete('/{id}',               [BookingController::class, 'destroy']);
        });
        // user أو superadmin
        Route::patch('/{id}/cancel',          [BookingController::class, 'cancel']);
        Route::patch('/{id}/notify-payment',  [BookingController::class, 'notifyPayment']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/',                  [NotificationController::class, 'index']);
        Route::post('/',                 [NotificationController::class, 'store']);
        Route::patch('/read-all',        [NotificationController::class, 'markAllRead']);
        Route::patch('/{id}/read',       [NotificationController::class, 'markRead']);
        Route::delete('/{id}',           [NotificationController::class, 'dismiss']);
    });

    // Support
    Route::prefix('support')->group(function () {
        Route::get('/threads',                        [SupportController::class, 'threads']);
        Route::post('/threads',                       [SupportController::class, 'ensureThread']);
        Route::get('/threads/{id}/messages',          [SupportController::class, 'messages']);
        Route::post('/threads/{id}/messages',         [SupportController::class, 'sendMessage']);
        Route::patch('/threads/{id}/read',            [SupportController::class, 'markThreadRead']);
        Route::middleware('role:superadmin,support')->group(function () {
            Route::delete('/threads/{id}',            [SupportController::class, 'deleteThread']);
        });
        Route::get('/feedbacks',                      [SupportController::class, 'feedbacks']);
        Route::post('/feedbacks',                     [SupportController::class, 'createFeedback']);
        Route::middleware('role:superadmin,support')->group(function () {
            Route::patch('/feedbacks/{id}/reply',     [SupportController::class, 'replyFeedback']);
            Route::patch('/feedbacks/{id}/read',      [SupportController::class, 'markFeedbackRead']);
        });
    });

    // Upload
    Route::prefix('upload')->group(function () {
        Route::post('/avatar',           [UploadController::class, 'uploadAvatar']);
        Route::delete('/avatar',         [UploadController::class, 'deleteAvatar']);
    });

    // Ratings
    Route::prefix('ratings')->group(function () {
        Route::get('/',                  [RatingController::class, 'index']);
        Route::post('/',                 [RatingController::class, 'store']);
    });

    // Chatbot (Gemini)
    // throttle:20,1 => 20 طلب كحد أقصى بالدقيقة لكل مستخدم مسجّل، لمنع استنزاف تكلفة Gemini API
    Route::prefix('chatbot')->group(function () {
        Route::post('/message',          [ChatbotController::class, 'sendMessage'])
            ->middleware('throttle:20,1');
        Route::get('/history',           [ChatbotController::class, 'history']);
        Route::delete('/session',        [ChatbotController::class, 'clearSession']);
    });

    // Reset — superadmin فقط
    Route::middleware('role:superadmin')->post('/reset', [ResetController::class, 'reset']);
});