<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportFeedback extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'message',
        'reply',
        'is_read_by_support',
        'replied_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read_by_support' => 'boolean',
            'replied_at'         => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
