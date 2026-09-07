<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Models\Province;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class HotelController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // POST /api/hotels/upload-image  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $path = $request->file('image')->store('hotels', 'public');

        return response()->json([
            'success'  => true,
            'imageUrl' => asset('storage/' . $path),
        ]);
    }
    // ─────────────────────────────────────────────────────────────────────
    // GET /api/hotels
    // ─────────────────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $query = Hotel::with('province:id,name_ar,name_en');

        if ($request->filled('province_id')) {
            $query->where('province_id', $request->province_id);
        }
        if ($request->filled('city')) {
            $query->where('city', 'like', '%' . $request->city . '%');
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('min_price')) {
            $query->where('price_per_night', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price_per_night', '<=', $request->max_price);
        }
        if ($request->filled('stars')) {
            $query->where('stars', $request->stars);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%");
            });
        }

        $hotels = $query->orderByDesc('rating')->get()->map(fn($h) => $this->format($h));

        return response()->json([
            'success' => true,
            'hotels'  => $hotels,
            'total'   => $hotels->count(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/hotels/{id}
    // ─────────────────────────────────────────────────────────────────────
    public function show(int $id)
    {
        $hotel = Hotel::with(['province:id,name_ar,name_en', 'ratings.user:id,name'])->findOrFail($id);
        return response()->json(['success' => true, 'hotel' => $this->format($hotel, true)]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/hotels  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:200',
            'city'           => 'required|string|max:100',
            'province_id'    => 'required|exists:provinces,id',
            'stars'          => 'required|integer|between:1,5',
            'price_per_night'=> 'required|numeric|min:1',
            'discount_price' => 'nullable|numeric|min:1',
            'rating'         => 'sometimes|numeric|between:0,5',
            'rooms'          => 'sometimes|integer|min:1',
            'status'         => 'sometimes|in:active,inactive',
            'tag'            => 'nullable|string|max:50',
            'image_url'      => 'nullable|url',
            'amenities'      => 'nullable|array',
            'amenities.*'    => 'string',
            'offer_text'     => 'nullable|string|max:200',
            'description'    => 'nullable|string',
        ]);

        $hotel = Hotel::create($data);

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة الفندق بنجاح.',
            'hotel'   => $this->format($hotel->load('province')),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATCH /api/hotels/{id}  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function update(Request $request, int $id)
    {
        $hotel = Hotel::findOrFail($id);

        $data = $request->validate([
            'name'           => 'sometimes|string|max:200',
            'city'           => 'sometimes|string|max:100',
            'province_id'    => 'sometimes|exists:provinces,id',
            'stars'          => 'sometimes|integer|between:1,5',
            'price_per_night'=> 'sometimes|numeric|min:1',
            'discount_price' => 'nullable|numeric|min:1',
            'rating'         => 'sometimes|numeric|between:0,5',
            'rooms'          => 'sometimes|integer|min:1',
            'status'         => 'sometimes|in:active,inactive',
            'tag'            => 'nullable|string|max:50',
            'image_url'      => 'nullable|url',
            'amenities'      => 'nullable|array',
            'amenities.*'    => 'string',
            'offer_text'     => 'nullable|string|max:200',
            'description'    => 'nullable|string',
        ]);

        $hotel->update($data);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الفندق بنجاح.',
            'hotel'   => $this->format($hotel->fresh()->load('province')),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE /api/hotels/{id}  (superadmin)
    // ─────────────────────────────────────────────────────────────────────
    public function destroy(int $id)
    {
        $hotel = Hotel::findOrFail($id);
        $hotel->delete();
        return response()->json(['success' => true, 'message' => 'تم حذف الفندق.']);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/provinces
    // ─────────────────────────────────────────────────────────────────────
    public function provinces()
    {
        $provinces = Province::withCount('hotels')->orderBy('name_ar')->get();
        return response()->json(['success' => true, 'provinces' => $provinces]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────────
    private function format(Hotel $h, bool $withRatings = false): array
    {
        $data = [
            'id'             => $h->id,
            'name'           => $h->name,
            'country'        => $h->country,
            'city'           => $h->city,
            'province_id'    => $h->province_id,
            'province_name'  => $h->province?->name_ar,
            'stars'          => $h->stars,
            'price'          => $h->effective_price,
            'price_per_night'=> $h->price_per_night,
            'discount_price' => $h->discount_price,
            'rating'         => $h->rating,
            'rooms'          => $h->rooms,
            'status'         => $h->status,
            'tag'            => $h->tag,
            'image'          => $h->image_url,
            'amenities'      => $h->amenities ?? [],
            'offer_text'     => $h->offer_text,
            'description'    => $h->description,
            'created_at'     => $h->created_at?->toISOString(),
        ];

        if ($withRatings && $h->relationLoaded('ratings')) {
            $data['ratings'] = $h->ratings->map(fn($r) => [
                'id'         => $r->id,
                'stars'      => $r->stars,
                'comment'    => $r->comment,
                'user_name'  => $r->user?->name,
                'created_at' => $r->created_at?->toISOString(),
            ]);
        }

        return $data;
    }
}
