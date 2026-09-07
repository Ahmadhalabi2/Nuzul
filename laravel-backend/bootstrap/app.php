<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // CORS لكل الـ API routes
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // تعريف middleware الأدوار
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);

        // استثناء كل الـ API routes من CSRF
        $middleware->validateCsrfTokens(except: ['api/*']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // إرجاع JSON دائماً للـ API
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'غير مصرح. يرجى تسجيل الدخول.',
                    ], 401);
                }
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'بيانات غير صحيحة.',
                        'errors'  => $e->errors(),
                    ], 422);
                }
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'المورد غير موجود.',
                    ], 404);
                }
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'الطريقة غير مسموح بها.',
                    ], 405);
                }
                // أي خطأ آخر في الـ API
                return response()->json([
                    'success' => false,
                    'message' => config('app.debug') ? $e->getMessage() : 'حدث خطأ في الخادم.',
                ], 500);
            }
        });
    })->create();
