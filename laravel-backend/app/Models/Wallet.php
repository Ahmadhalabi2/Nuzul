<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    protected $fillable = ['user_id', 'balance', 'currency'];

    protected $casts = [
        'balance' => 'decimal:2',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** شحن الرصيد */
    public function deposit(float $amount): void
    {
        $this->increment('balance', $amount);
    }

    /** خصم الرصيد — يرجع false لو الرصيد غير كافٍ */
    public function withdraw(float $amount): bool
    {
        if ($this->balance < $amount) return false;
        $this->decrement('balance', $amount);
        return true;
    }
}
