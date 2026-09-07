<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotels', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('country')->default('سوريا');
            $table->string('city');
            $table->foreignId('province_id')->nullable()->constrained('provinces')->nullOnDelete();
            $table->tinyInteger('stars')->default(3);
            $table->decimal('price_per_night', 10, 2);
            $table->decimal('discount_price', 10, 2)->nullable();
            $table->decimal('rating', 3, 1)->default(4.0);
            $table->integer('rooms')->default(10);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('tag')->nullable();
            $table->string('image_url')->nullable();
            $table->json('amenities')->nullable();
            $table->string('offer_text')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotels');
    }
};
