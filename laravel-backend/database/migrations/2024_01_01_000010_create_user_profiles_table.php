<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // بيانات شخصية
            $table->string('phone', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->string('city')->nullable();
            $table->foreignId('province_id')->nullable()->constrained('provinces')->nullOnDelete();

            // تفضيلات الإقامة
            $table->json('preferred_hotel_types')->nullable();  // ['luxury','heritage','beach','budget']
            $table->unsignedInteger('budget_min')->default(0);  // بالدولار/ليلة
            $table->unsignedInteger('budget_max')->default(500);
            $table->json('preferred_provinces')->nullable();    // [1,3,5] → province ids
            $table->enum('travel_type', ['solo','couple','family','business'])->default('solo');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
