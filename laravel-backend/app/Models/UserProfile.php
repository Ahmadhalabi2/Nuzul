<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'phone',
        'birth_date',
        'gender',
        'city',
        'province_id',
        'preferred_hotel_types',
        'budget_min',
        'budget_max',
        'preferred_provinces',
        'travel_type',
    ];

    protected $casts = [
        'preferred_hotel_types' => 'array',
        'preferred_provinces'   => 'array',
        'birth_date'            => 'date',
        'budget_min'            => 'integer',
        'budget_max'            => 'integer',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function province(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Province::class);
    }
}
