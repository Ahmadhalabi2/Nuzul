<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_ref',
        'user_id',
        'user_name',
        'user_email',
        'hotel_id',
        'hotel_name',
        'country',
        'city',
        'check_in',
        'check_out',
        'nights',
        'guests',
        'amount',
        'room_type',
        'notes',
        'status',
        'decided_by_id',
        'decided_by_name',
        'reason',
        'decided_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'check_in'    => 'date:Y-m-d',
            'check_out'   => 'date:Y-m-d',
            'decided_at'  => 'datetime',
            'paid_at'     => 'datetime',
            'amount'      => 'float',
        ];
    }

    // ── Statuses ──────────────────────────────────────────────────────────
    const STATUS_PENDING    = 'pending_admin';
    const STATUS_ACCEPTED   = 'accepted_waiting_payment';
    const STATUS_PAID       = 'paid_confirmed';
    const STATUS_COMPLETED  = 'completed';
    const STATUS_CANCEL_ADM = 'cancelled_by_admin';
    const STATUS_CANCEL_USR = 'cancelled_by_user';

    public function canCancelByUser(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_ACCEPTED]);
    }

    public function canAccept(): bool    { return $this->status === self::STATUS_PENDING; }
    public function canMarkPaid(): bool  { return $this->status === self::STATUS_ACCEPTED; }
    public function canComplete(): bool  { return $this->status === self::STATUS_PAID; }

    // ── Relations ─────────────────────────────────────────────────────────
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function hotel()
    {
        return $this->belongsTo(Hotel::class);
    }

    public function decidedBy()
    {
        return $this->belongsTo(User::class, 'decided_by_id');
    }

    public function rating()
    {
        return $this->hasOne(Rating::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // ── Ref Generator ─────────────────────────────────────────────────────
    public static function generateRef(): string
    {
        do {
            $ref = 'BK-' . strtoupper(substr(uniqid(), -6));
        } while (self::where('booking_ref', $ref)->exists());

        return $ref;
    }
}
