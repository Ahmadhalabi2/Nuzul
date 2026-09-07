<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Hotel extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'country',
        'city',
        'province_id',
        'stars',
        'price_per_night',
        'discount_price',
        'rating',
        'rooms',
        'status',
        'tag',
        'image_url',
        'amenities',
        'offer_text',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'amenities'   => 'array',
            'price_per_night' => 'float',
            'discount_price'  => 'float',
            'rating'          => 'float',
        ];
    }

    // ── Relations ─────────────────────────────────────────────────────────
    public function province()
    {
        return $this->belongsTo(Province::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function ratings()
    {
        return $this->hasMany(Rating::class);
    }

    // ── Computed ──────────────────────────────────────────────────────────
    public function getEffectivePriceAttribute(): float
    {
        return $this->discount_price ?? $this->price_per_night;
    }

    public function getAverageRatingAttribute(): float
    {
        $avg = $this->ratings()->avg('stars');
        return $avg ? round($avg, 1) : $this->rating;
    }
}
