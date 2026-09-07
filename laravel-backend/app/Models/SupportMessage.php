<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportMessage extends Model
{
    protected $fillable = [
        'thread_id',
        'sender_role',
        'sender_id',
        'sender_name',
        'content',
    ];

    public function thread()
    {
        return $this->belongsTo(SupportThread::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
