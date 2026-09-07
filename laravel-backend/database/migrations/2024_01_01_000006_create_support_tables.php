<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('user_name');
            $table->integer('unread_for_support')->default(0);
            $table->integer('unread_for_user')->default(0);
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });

        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('support_threads')->cascadeOnDelete();
            $table->enum('sender_role', ['user', 'support', 'superadmin']);
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('sender_name');
            $table->text('content');
            $table->timestamps();
        });

        Schema::create('support_feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('user_name');
            $table->text('message');
            $table->text('reply')->nullable();
            $table->boolean('is_read_by_support')->default(false);
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_feedbacks');
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_threads');
    }
};
