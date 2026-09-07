<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_ref')->unique(); // BK-XXXXXX
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('user_name');
            $table->string('user_email')->nullable();
            $table->foreignId('hotel_id')->constrained('hotels')->cascadeOnDelete();
            $table->string('hotel_name');
            $table->string('country')->default('سوريا');
            $table->string('city');
            $table->date('check_in');
            $table->date('check_out');
            $table->integer('nights');
            $table->integer('guests');
            $table->decimal('amount', 10, 2);
            $table->string('room_type')->default('standard');
            $table->text('notes')->nullable();
            $table->enum('status', [
                'pending_admin',
                'accepted_waiting_payment',
                'paid_confirmed',
                'completed',
                'cancelled_by_admin',
                'cancelled_by_user',
            ])->default('pending_admin');
            $table->foreignId('decided_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('decided_by_name')->nullable();
            $table->text('reason')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
