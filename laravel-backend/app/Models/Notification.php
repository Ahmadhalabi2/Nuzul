<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'booking_id',
        'created_by_user_id',
        'created_by_name',
        'target_role',
        'target_user_id',
        'type',
        'title',
        'description',
        'is_read',
        'dismissed',
    ];

    protected function casts(): array
    {
        return [
            'is_read'   => 'boolean',
            'dismissed' => 'boolean',
        ];
    }

    // ── Relations ─────────────────────────────────────────────────────────
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    // ── Scopes ─────────────────────────────────────────────────────────────
    public function scopeForUser($query, User $user)
    {
        return $query->where(function ($q) use ($user) {
            // إشعارات موجهة مباشرة للمستخدم
            $q->where('target_user_id', $user->id)
              // أو إشعارات موجهة لدوره بدون مستخدم محدد
              ->orWhere(function ($q2) use ($user) {
                  $q2->where('target_role', $user->role)
                     ->whereNull('target_user_id');
              });
        })->where('dismissed', false);
    }
}
