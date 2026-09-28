<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $contacts = [
            // دمشق
            ['name' => 'Four Seasons Hotel Damascus',  'phone' => '+963112232300', 'maps' => 'Four+Seasons+Hotel+Damascus'],
            ['name' => 'Cham Palace Hotel',             'phone' => '+963112232300', 'maps' => 'Cham+Palace+Hotel+Damascus'],
            ['name' => 'Beit Al Wali Hotel',            'phone' => '+963115436666', 'maps' => 'Beit+Al+Wali+Hotel+Damascus'],
            ['name' => 'Dama Rose Hotel',               'phone' => '+963112229200', 'maps' => 'Dama+Rose+Hotel+Damascus'],
            ['name' => 'Beit al-Mamlouka',              'phone' => '+963115430445', 'maps' => 'Beit+al-Mamlouka+Damascus'],
            ['name' => 'Dar Al Mamlouka',               'phone' => '+963115430445', 'maps' => 'Dar+Al+Mamlouka+Damascus'],
            ['name' => 'Beit Rumman',                   'phone' => '+963115435002', 'maps' => 'Beit+Rumman+Damascus'],
            ['name' => 'Hotel Talisman',                'phone' => '+963115415379', 'maps' => 'Hotel+Talisman+Damascus'],
            ['name' => 'Omayad Hotel',                  'phone' => '+963112217700', 'maps' => 'Omayad+Hotel+Damascus'],
            ['name' => 'Hotel Dedeman Royal Club',      'phone' => '+963113322650', 'maps' => 'Hotel+Dedeman+Damascus'],
            ['name' => 'Al Shahbandar Palace Hotel',    'phone' => '+963988161616', 'maps' => 'Al+Shahbandar+Palace+Hotel+Damascus'],
            ['name' => 'Sheraton Damascus Hotel',       'phone' => '+963112221111', 'maps' => 'Sheraton+Hotel+Damascus'],
            ['name' => 'Royal Semiramis Hotel',         'phone' => '+963946900522', 'maps' => 'Royal+Semiramis+Hotel+Damascus'],
            ['name' => 'Armitage Hotel',                'phone' => '+963114435344', 'maps' => 'Armitage+Hotel+Damascus'],
            ['name' => 'Kaisar Palace',                 'phone' => '+963112334000', 'maps' => 'Kaisar+Palace+Damascus'],
            ['name' => 'The City Hotel',                'phone' => '+963112219375', 'maps' => 'The+City+Hotel+Damascus'],
            ['name' => 'Fardoss Tower Hotel',           'phone' => '+963112232100', 'maps' => 'Fardoss+Tower+Hotel+Damascus'],

            // ريف دمشق
            ['name' => 'Ebla Hotel',                   'phone' => '+963112241900', 'maps' => 'Ebla+Hotel+Syria'],
            ['name' => 'Bloudan Grand Hotel',           'phone' => '+963117160070', 'maps' => 'Bloudan+Grand+Hotel+Syria'],
            ['name' => 'Yafour Hotel and Resort',       'phone' => '+963113921555', 'maps' => 'Yafour+Hotel+Resort+Syria'],
            ['name' => 'Jawadain Hotel',                'phone' => '+963116478888', 'maps' => 'Jawadain+Hotel+Syria'],
            ['name' => 'منتجع مونتي روزا',              'phone' => '+963117139911', 'maps' => 'Monte+Rosa+Resort+Syria'],
            ['name' => 'Saffeer Hotel Maaloula',        'phone' => '+963117770250', 'maps' => 'Saffeer+Hotel+Maaloula+Syria'],

            // حلب
            ['name' => 'Sheraton Aleppo Hotel',        'phone' => '+963212121111', 'maps' => 'Sheraton+Aleppo+Hotel'],
            ['name' => 'Laurus Hotel',                  'phone' => '+963212244008', 'maps' => 'Laurus+Hotel+Aleppo'],
            ['name' => 'Park Hotel Aleppo',             'phone' => '+963212233283', 'maps' => 'Park+Hotel+Aleppo'],
            ['name' => 'Arman Hotel',                   'phone' => '+963215111555', 'maps' => 'Arman+Hotel+Aleppo'],
            ['name' => 'Riga Palace Hotel',             'phone' => '+963956741618', 'maps' => 'Riga+Palace+Hotel+Aleppo'],
            ['name' => 'Aleppo Palace Hotel',           'phone' => '+963212115955', 'maps' => 'Aleppo+Palace+Hotel'],
            ['name' => 'Dar Halabia Hotel',             'phone' => '+963944245543', 'maps' => 'Dar+Halabia+Hotel+Aleppo'],
            ['name' => 'Aleppo Shahba Hotel',           'phone' => '+963212270100', 'maps' => 'Aleppo+Shahba+Hotel'],
            ['name' => 'Pullman Aleppo Hotel',          'phone' => '+963212667200', 'maps' => 'Pullman+Hotel+Aleppo'],
            ['name' => 'Coral Julia Dumna Hotel',       'phone' => '+963213330660', 'maps' => 'Coral+Julia+Dumna+Hotel+Aleppo'],
            ['name' => 'Hanadi Hotel',                  'phone' => '+963212115003', 'maps' => 'Hanadi+Hotel+Aleppo'],
            ['name' => 'Izes Hotel',                    'phone' => '+963212126345', 'maps' => 'Izes+Hotel+Aleppo'],
            ['name' => 'QUATTRO HOTEL Aleppo',          'phone' => '+963212229888', 'maps' => 'QUATTRO+HOTEL+Aleppo'],
            ['name' => 'Zain Palace Hotel',             'phone' => '+963212646068', 'maps' => 'Zain+Palace+Hotel+Aleppo'],
            ['name' => 'فندق المدينة حلب',              'phone' => '+963996688112', 'maps' => 'فندق+المدينة+حلب'],

            // حماة
            ['name' => 'Afamia Alsham Hotel Hama',     'phone' => '+963332525335', 'maps' => 'Afamia+Alsham+Hama'],
            ['name' => 'Orient House Hotel Hama',      'phone' => '+963332225599', 'maps' => 'Orient+House+Hotel+Hama'],
            ['name' => 'Sarah Hotel Hama',              'phone' => '+963332515941', 'maps' => 'Sarah+Hotel+Hama'],
            ['name' => 'فندق الرياض حماة',              'phone' => '+963945555602', 'maps' => 'فندق+الرياض+حماة'],
            ['name' => 'Alnwaer Hotel',                 'phone' => '+963332512414', 'maps' => 'Alnwaer+Hotel+Hama'],
            ['name' => 'Imata Hotel',                   'phone' => '+963332759801', 'maps' => 'Imata+Hotel+Hama'],

            // دير الزور
            ['name' => 'Hotel Furat Cham Palace',      'phone' => '+96351225418',  'maps' => 'Furat+Cham+Palace+Deir+ez-Zur'],
            ['name' => 'فندق السلامة',                  'phone' => '+96351314170',  'maps' => 'فندق+السلامة+دير+الزور'],
        ];

        foreach ($contacts as $c) {
            DB::table('hotels')
                ->where('name', $c['name'])
                ->update([
                    'phone'           => $c['phone'],
                    'google_maps_url' => 'https://www.google.com/maps/search/?api=1&query=' . $c['maps'],
                ]);
        }
    }

    public function down(): void
    {
        DB::table('hotels')->update(['phone' => null, 'google_maps_url' => null]);
    }
};
