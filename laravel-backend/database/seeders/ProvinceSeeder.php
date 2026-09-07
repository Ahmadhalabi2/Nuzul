<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Province;

class ProvinceSeeder extends Seeder
{
    public function run(): void
    {
        $provinces = [
            ['name_ar' => 'دمشق',       'name_en' => 'Damascus'],
            ['name_ar' => 'ريف دمشق',   'name_en' => 'Rif Dimashq'],
            ['name_ar' => 'حمص',        'name_en' => 'Homs'],
            ['name_ar' => 'حماة',       'name_en' => 'Hama'],
            ['name_ar' => 'حلب',        'name_en' => 'Aleppo'],
            ['name_ar' => 'اللاذقية',   'name_en' => 'Latakia'],
            ['name_ar' => 'طرطوس',      'name_en' => 'Tartous'],
            ['name_ar' => 'درعا',       'name_en' => 'Daraa'],
            ['name_ar' => 'السويداء',   'name_en' => 'As-Suwayda'],
            ['name_ar' => 'إدلب',       'name_en' => 'Idlib'],
            ['name_ar' => 'الرقة',      'name_en' => 'Raqqa'],
            ['name_ar' => 'دير الزور',  'name_en' => 'Deir ez-Zor'],
            ['name_ar' => 'الحسكة',     'name_en' => 'Al-Hasakah'],
        ];

        foreach ($provinces as $province) {
            Province::firstOrCreate(['name_ar' => $province['name_ar']], $province);
        }
    }
}
