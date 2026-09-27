<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Hotel;
use App\Models\Province;

class HotelSeeder extends Seeder
{
    public function run(): void
    {
        $prov = Province::pluck('id', 'name_ar');

        // ── صور Unsplash مصنّفة حسب نوع الفندق ──────────────────────────────
        $IMG = [
            'luxury'   => [
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
            ],
            'heritage' => [
                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
            ],
            'beach'    => [
                'https://images.unsplash.com/photo-1506059612708-99d6c258160e?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
            ],
            'mountain' => [
                'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80',
            ],
            'business' => [
                'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1554009975-d74653b879f1?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1606046604972-77cc76aee944?auto=format&fit=crop&w=800&q=80',
            ],
        ];

        $img = function (string $type, int $idx = 0) use ($IMG): string {
            $list = $IMG[$type] ?? $IMG['business'];
            return $list[$idx % count($list)];
        };

        $amenBase   = ['واي فاي مجاني', 'تكييف مركزي', 'خدمة الغرف'];
        $amenLux    = ['مسبح', 'سبا', 'فطور فاخر', 'موقف سيارات', 'نادي رياضي'];
        $amenBeach  = ['شاطئ خاص', 'مسبح خارجي', 'ألعاب مائية', 'مطعم بحري'];
        $amenHer    = ['فناء داخلي', 'فطور شرقي', 'ديكور تراثي'];
        $amenBiz    = ['قاعات مؤتمرات', 'إنترنت سريع', 'خدمة غرف 24 ساعة'];

        $hotels = [

            // ══════════════════ دمشق ══════════════════════════════════════════
            ['name'=>'Four Seasons Hotel Damascus',          'city'=>'دمشق','prov'=>'دمشق','stars'=>5,'price'=>290,'disc'=>260,'rating'=>4.8,'tag'=>'فاخر',  'img'=>$img('luxury',0),  'amen'=>array_merge($amenBase,$amenLux),      'offer'=>'خصم 10% للحجوزات المبكرة',      'desc'=>'فندق عالمي فاخر في قلب دمشق. هاتف: +963112232300'],
            ['name'=>'Beit Zafran Hotel De Charme',          'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>130,'disc'=>null,'rating'=>4.7,'tag'=>'تراثي', 'img'=>$img('heritage',0),'amen'=>array_merge($amenBase,$amenHer),      'offer'=>'تجربة دمشقية أصيلة',            'desc'=>'بيت دمشقي تراثي بوتيكي في الأحياء القديمة.'],
            ['name'=>'Cham Palace Hotel',                    'city'=>'دمشق','prov'=>'دمشق','stars'=>5,'price'=>220,'disc'=>200,'rating'=>4.5,'tag'=>'فاخر',  'img'=>$img('luxury',1),  'amen'=>array_merge($amenBase,$amenLux),      'offer'=>null,                             'desc'=>'فندق شام بالاس الشهير. هاتف: +963112232300'],
            ['name'=>'Beit Al Wali Hotel',                   'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>150,'disc'=>null,'rating'=>4.8,'tag'=>'تراثي', 'img'=>$img('heritage',1),'amen'=>array_merge($amenBase,$amenHer),      'offer'=>'في قلب الحي المسيحي',           'desc'=>'بيت الوالي في باب توما. هاتف: +963115436666'],
            ['name'=>'Dama Rose Hotel',                      'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>180,'disc'=>165,'rating'=>4.4,'tag'=>'أعمال', 'img'=>$img('business',0),'amen'=>array_merge($amenBase,$amenBiz,$amenLux),'offer'=>'عرض خاص لرجال الأعمال',        'desc'=>'فندق داما روز. هاتف: +963112229200'],
            ['name'=>'Beit al-Mamlouka',                     'city'=>'دمشق','prov'=>'دمشق','stars'=>5,'price'=>200,'disc'=>null,'rating'=>4.9,'tag'=>'تراثي', 'img'=>$img('heritage',2),'amen'=>array_merge($amenBase,$amenHer),      'offer'=>'أجمل البيوت الدمشقية',          'desc'=>'بيت المملوكة في جادة البكري. هاتف: +963115430445'],
            ['name'=>'Beit Rumman',                          'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>140,'disc'=>null,'rating'=>4.6,'tag'=>'تراثي', 'img'=>$img('heritage',3),'amen'=>array_merge($amenBase,$amenHer),      'offer'=>null,                             'desc'=>'بيت رمان في دمشق القديمة. هاتف: +963115435002'],
            ['name'=>'Hotel Talisman',                       'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>120,'disc'=>null,'rating'=>4.5,'tag'=>'تراثي', 'img'=>$img('heritage',0),'amen'=>array_merge($amenBase,$amenHer),      'offer'=>null,                             'desc'=>'فندق طلسمان في دمشق القديمة. هاتف: +963115415379'],
            ['name'=>'Omayad Hotel',                         'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>120,'disc'=>105,'rating'=>4.2,'tag'=>'سياحي', 'img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenBiz),       'offer'=>null,                             'desc'=>'فندق أموية. هاتف: +963112217700'],
            ['name'=>'Art House Hotel',                      'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>110,'disc'=>null,'rating'=>4.1,'tag'=>'سياحي', 'img'=>$img('business',2),'amen'=>$amenBase,                             'offer'=>null,                             'desc'=>'آرت هاوس هوتيل في دمشق.'],
            ['name'=>'Hotel Dedeman Royal Club',             'city'=>'دمشق','prov'=>'دمشق','stars'=>5,'price'=>230,'disc'=>210,'rating'=>4.5,'tag'=>'فاخر',  'img'=>$img('luxury',2),  'amen'=>array_merge($amenBase,$amenLux,$amenBiz),'offer'=>null,                           'desc'=>'ديدمان رويال كلوب. هاتف: +963113322650'],
            ['name'=>'Al Shahbandar Palace Hotel',           'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>160,'disc'=>null,'rating'=>4.3,'tag'=>'تراثي', 'img'=>$img('heritage',1),'amen'=>array_merge($amenBase,$amenHer),      'offer'=>null,                             'desc'=>'قصر الشهبندر في القيمرية. هاتف: +963988161616'],
            ['name'=>'Sheraton Damascus Hotel',              'city'=>'دمشق','prov'=>'دمشق','stars'=>5,'price'=>240,'disc'=>null,'rating'=>4.5,'tag'=>'فاخر',  'img'=>$img('luxury',3),  'amen'=>array_merge($amenBase,$amenLux),      'offer'=>null,                             'desc'=>'شيراتون دمشق في شارع شكري القوتلي.'],
            ['name'=>'Royal Semiramis Hotel',                'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>130,'disc'=>null,'rating'=>4.2,'tag'=>'سياحي', 'img'=>$img('business',3),'amen'=>array_merge($amenBase,$amenBiz),       'offer'=>null,                             'desc'=>'رويال سيميراميس. هاتف: +963946900522'],
            ['name'=>'Armitage Hotel',                       'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>100,'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',0),'amen'=>$amenBase,                             'offer'=>null,                             'desc'=>'فندق آرميتاج دمشق. هاتف: +963114435344'],
            ['name'=>'Kaisar Palace',                        'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>140,'disc'=>null,'rating'=>4.1,'tag'=>'سياحي', 'img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenBiz),       'offer'=>null,                             'desc'=>'قيصر بالاس. هاتف: +963112334000'],
            ['name'=>'The City Hotel',                       'city'=>'دمشق','prov'=>'دمشق','stars'=>3,'price'=>70, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',2),'amen'=>$amenBase,                           'offer'=>null,                             'desc'=>'ذا سيتي هوتيل. هاتف: +963112219375'],
            ['name'=>'Fardoss Tower Hotel',                  'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>120,'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',3),'amen'=>array_merge($amenBase,$amenBiz),       'offer'=>null,                             'desc'=>'فردوس تاور. هاتف: +963112232100'],
            ['name'=>'Dar Al Mamlouka',                      'city'=>'دمشق','prov'=>'دمشق','stars'=>5,'price'=>210,'disc'=>null,'rating'=>4.8,'tag'=>'تراثي', 'img'=>$img('heritage',2),'amen'=>array_merge($amenBase,$amenHer),      'offer'=>'أيقونة التراث الدمشقي',         'desc'=>'دار المملوكة في جادة البكري. هاتف: +963115430445'],
            ['name'=>'فندق الزيتونة',                       'city'=>'دمشق','prov'=>'دمشق','stars'=>3,'price'=>60, 'disc'=>null,'rating'=>3.7,'tag'=>'اقتصادي','img'=>$img('business',0),'amen'=>$amenBase,                           'offer'=>null,                             'desc'=>'فندق الزيتونة دمشق.'],
            ['name'=>'فندق الشام',                          'city'=>'دمشق','prov'=>'دمشق','stars'=>4,'price'=>130,'disc'=>null,'rating'=>4.1,'tag'=>'سياحي', 'img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenBiz),       'offer'=>null,                             'desc'=>'فندق الشام التاريخي في دمشق.'],
            ['name'=>'Queen Centre',                         'city'=>'دمشق','prov'=>'دمشق','stars'=>3,'price'=>75, 'disc'=>null,'rating'=>3.9,'tag'=>'اقتصادي','img'=>$img('business',2),'amen'=>$amenBase,                           'offer'=>null,                             'desc'=>'كوين سنتر. هاتف: +963116664003'],

            // ══════════════════ ريف دمشق ══════════════════════════════════════
            ['name'=>'Ebla Hotel',                           'city'=>'شبعا',    'prov'=>'ريف دمشق','stars'=>4,'price'=>95, 'disc'=>null,'rating'=>4.2,'tag'=>'منتجع', 'img'=>$img('mountain',0),'amen'=>array_merge($amenBase,$amenLux),    'offer'=>null,                          'desc'=>'فندق إيبلا ريف دمشق. هاتف: +963112241900'],
            ['name'=>'Sheraton Ma\'aret Sednaya Resort',     'city'=>'صيدنايا', 'prov'=>'ريف دمشق','stars'=>5,'price'=>185,'disc'=>165,'rating'=>4.6,'tag'=>'منتجع', 'img'=>$img('mountain',1),'amen'=>array_merge($amenBase,$amenLux),    'offer'=>'منتجع شيراتون الجبلي',        'desc'=>'شيراتون معرة صيدنايا. هاتف: +963115958000'],
            ['name'=>'Bloudan Grand Hotel',                  'city'=>'بلودان',  'prov'=>'ريف دمشق','stars'=>4,'price'=>95, 'disc'=>null,'rating'=>4.3,'tag'=>'جبلي',  'img'=>$img('mountain',2),'amen'=>array_merge($amenBase,$amenLux),    'offer'=>'خصم عائلي نهاية الأسبوع',    'desc'=>'فندق بلودان الكبير. هاتف: +963117160070'],
            ['name'=>'Yafour Hotel and Resort',              'city'=>'يعفور',   'prov'=>'ريف دمشق','stars'=>4,'price'=>110,'disc'=>null,'rating'=>4.4,'tag'=>'منتجع', 'img'=>$img('mountain',0),'amen'=>array_merge($amenBase,$amenLux),    'offer'=>null,                          'desc'=>'منتجع يعفور. هاتف: +963113921555'],
            ['name'=>'Jawadain Hotel',                       'city'=>'السيدة زينب','prov'=>'ريف دمشق','stars'=>3,'price'=>65,'disc'=>null,'rating'=>3.8,'tag'=>'سياحي','img'=>$img('business',0),'amen'=>$amenBase,                      'offer'=>null,                          'desc'=>'فندق جوادين السيدة زينب. هاتف: +963116478888'],
            ['name'=>'Dana Hotel',                           'city'=>'قدسيا',   'prov'=>'ريف دمشق','stars'=>3,'price'=>60, 'disc'=>null,'rating'=>3.7,'tag'=>'اقتصادي','img'=>$img('business',1),'amen'=>$amenBase,                      'offer'=>null,                          'desc'=>'دانا هوتيل قدسيا.'],
            ['name'=>'منتجع مونتي روزا',                    'city'=>'ريف دمشق','prov'=>'ريف دمشق','stars'=>4,'price'=>120,'disc'=>null,'rating'=>4.3,'tag'=>'منتجع', 'img'=>$img('mountain',2),'amen'=>array_merge($amenBase,$amenLux),    'offer'=>null,                          'desc'=>'منتجع مونتي روزا. هاتف: +963117139911'],
            ['name'=>'Saffeer Hotel Maaloula',               'city'=>'معلولا',  'prov'=>'ريف دمشق','stars'=>3,'price'=>70, 'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('heritage',0),'amen'=>array_merge($amenBase,$amenHer),    'offer'=>'قريب من معلولا الأثرية',     'desc'=>'فندق سفير معلولا. هاتف: +963117770250'],

            // ══════════════════ حلب ══════════════════════════════════════════
            ['name'=>'Sheraton Aleppo Hotel',                'city'=>'حلب','prov'=>'حلب','stars'=>5,'price'=>145,'disc'=>130,'rating'=>4.6,'tag'=>'فاخر',  'img'=>$img('luxury',0),  'amen'=>array_merge($amenBase,$amenLux,$amenBiz),'offer'=>null,                          'desc'=>'شيراتون حلب. هاتف: +963212121111'],
            ['name'=>'Laurus Hotel',                         'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>90, 'disc'=>null,'rating'=>4.2,'tag'=>'سياحي', 'img'=>$img('business',0),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'لوروس هوتيل حلب. هاتف: +963212244008'],
            ['name'=>'Park Hotel Aleppo',                    'city'=>'حلب','prov'=>'حلب','stars'=>3,'price'=>65, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',1),'amen'=>$amenBase,                               'offer'=>null,                          'desc'=>'بارك هوتيل حلب. هاتف: +963212233283'],
            ['name'=>'Arman Hotel',                          'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>95, 'disc'=>null,'rating'=>4.1,'tag'=>'سياحي', 'img'=>$img('business',2),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'فندق أرمان حلب. هاتف: +963215111555'],
            ['name'=>'Baron Hotel',                          'city'=>'حلب','prov'=>'حلب','stars'=>3,'price'=>65, 'disc'=>null,'rating'=>4.3,'tag'=>'تراثي', 'img'=>$img('heritage',3),'amen'=>array_merge($amenBase,$amenHer),          'offer'=>'أقام فيه لورنس العرب',        'desc'=>'فندق بارون التاريخي 1909م في شارع بارون.'],
            ['name'=>'Riga Palace Hotel',                    'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>90, 'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',3),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'ريجا بالاس حلب. هاتف: +963956741618'],
            ['name'=>'Aleppo Palace Hotel',                  'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>90, 'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',0),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'حلب بالاس. هاتف: +963212115955'],
            ['name'=>'Dar Halabia Hotel',                    'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>110,'disc'=>95, 'rating'=>4.4,'tag'=>'تراثي', 'img'=>$img('heritage',0),'amen'=>array_merge($amenBase,$amenHer),          'offer'=>'في قلب المدينة القديمة',      'desc'=>'دار حلبية باب أنطاكية. هاتف: +963944245543'],
            ['name'=>'Aleppo Shahba Hotel',                  'city'=>'حلب','prov'=>'حلب','stars'=>5,'price'=>145,'disc'=>130,'rating'=>4.2,'tag'=>'أعمال', 'img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenLux,$amenBiz),'offer'=>'شامل الفطور والإنترنت',       'desc'=>'شهباء حلب. هاتف: +963212270100'],
            ['name'=>'Pullman Hotel Aleppo',                 'city'=>'حلب','prov'=>'حلب','stars'=>5,'price'=>160,'disc'=>145,'rating'=>4.5,'tag'=>'فاخر',  'img'=>$img('luxury',1),  'amen'=>array_merge($amenBase,$amenLux),          'offer'=>null,                          'desc'=>'بولمان الشهباء حلب. هاتف: +963212667200'],
            ['name'=>'Jdayde Hotel',                         'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>105,'disc'=>null,'rating'=>4.3,'tag'=>'تراثي', 'img'=>$img('heritage',1),'amen'=>array_merge($amenBase,$amenHer),          'offer'=>null,                          'desc'=>'فندق الجديدة في حي الجديدة.'],
            ['name'=>'Coral Julia Dumna Hotel',              'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>100,'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',2),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'كورال جوليا دومنا. هاتف: +963213330660'],
            ['name'=>'فندق الديديمان حلب',                  'city'=>'حلب','prov'=>'حلب','stars'=>5,'price'=>155,'disc'=>null,'rating'=>4.4,'tag'=>'فاخر',  'img'=>$img('luxury',2),  'amen'=>array_merge($amenBase,$amenLux,$amenBiz),'offer'=>null,                          'desc'=>'فندق الديديمان في حلب.'],
            ['name'=>'Hanadi Hotel',                         'city'=>'حلب','prov'=>'حلب','stars'=>3,'price'=>70, 'disc'=>null,'rating'=>3.9,'tag'=>'اقتصادي','img'=>$img('business',3),'amen'=>$amenBase,                               'offer'=>null,                          'desc'=>'هنادي هوتيل حلب. هاتف: +963212115003'],
            ['name'=>'Izes Hotel',                           'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>95, 'disc'=>null,'rating'=>4.1,'tag'=>'سياحي', 'img'=>$img('business',0),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'إيزيس هوتيل الجزيرة حلب. هاتف: +963212126345'],
            ['name'=>'QUATTRO HOTEL Aleppo',                 'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>100,'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'كواترو هوتيل حلب. هاتف: +963212229888'],
            ['name'=>'فندق قصر الحمراء حلب',               'city'=>'حلب','prov'=>'حلب','stars'=>3,'price'=>65, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',2),'amen'=>$amenBase,                               'offer'=>null,                          'desc'=>'قصر الحمراء حلب.'],
            ['name'=>'Zain Palace Hotel',                    'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>90, 'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',3),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'زين بالاس حلب. هاتف: +963212646068'],
            ['name'=>'فندق المدينة حلب',                    'city'=>'حلب','prov'=>'حلب','stars'=>3,'price'=>70, 'disc'=>null,'rating'=>3.9,'tag'=>'اقتصادي','img'=>$img('business',0),'amen'=>$amenBase,                               'offer'=>null,                          'desc'=>'فندق المدينة حلب. هاتف: +963996688112'],
            ['name'=>'Mirage Palace Hotel',                  'city'=>'حلب','prov'=>'حلب','stars'=>4,'price'=>95, 'disc'=>null,'rating'=>4.1,'tag'=>'سياحي', 'img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'ميراج بالاس حلب في شارع المتنبي.'],

            // ══════════════════ اللاذقية ══════════════════════════════════════
            ['name'=>'فندق أفاميا اللاذقية',               'city'=>'اللاذقية','prov'=>'اللاذقية','stars'=>5,'price'=>160,'disc'=>145,'rating'=>4.6,'tag'=>'بحري', 'img'=>$img('beach',0),'amen'=>array_merge($amenBase,$amenBeach,$amenLux),'offer'=>'فطور بوفيه لشخصين مجاناً',   'desc'=>'منتجع أفاميا الساحلي باللاذقية.'],
            ['name'=>'فندق السمان اللاذقية',               'city'=>'اللاذقية','prov'=>'اللاذقية','stars'=>4,'price'=>100,'disc'=>null,'rating'=>4.2,'tag'=>'بحري', 'img'=>$img('beach',1),'amen'=>array_merge($amenBase,$amenBeach),     'offer'=>null,                          'desc'=>'فندق السمان على شاطئ اللاذقية.'],
            ['name'=>'فندق غولدن بيتش اللاذقية',          'city'=>'اللاذقية','prov'=>'اللاذقية','stars'=>4,'price'=>110,'disc'=>null,'rating'=>4.3,'tag'=>'بحري', 'img'=>$img('beach',2),'amen'=>array_merge($amenBase,$amenBeach),     'offer'=>null,                          'desc'=>'غولدن بيتش اللاذقية.'],
            ['name'=>'فندق فيترو اللاذقية',               'city'=>'اللاذقية','prov'=>'اللاذقية','stars'=>4,'price'=>105,'disc'=>null,'rating'=>4.1,'tag'=>'بحري', 'img'=>$img('beach',3),'amen'=>array_merge($amenBase,$amenBeach),     'offer'=>null,                          'desc'=>'فيترو هوتيل اللاذقية.'],

            // ══════════════════ حمص ══════════════════════════════════════════
            ['name'=>'فندق لويس حمص',                      'city'=>'حمص','prov'=>'حمص','stars'=>4,'price'=>90, 'disc'=>null,'rating'=>4.0,'tag'=>'سياحي', 'img'=>$img('business',0),'amen'=>array_merge($amenBase,$amenBiz),          'offer'=>null,                          'desc'=>'فندق لويس في حمص.'],
            ['name'=>'فندق سفير حمص',                      'city'=>'حمص','prov'=>'حمص','stars'=>5,'price'=>180,'disc'=>null,'rating'=>4.6,'tag'=>'فاخر',  'img'=>$img('luxury',0),  'amen'=>array_merge($amenBase,$amenLux),          'offer'=>'دخول النادي الرياضي مجاني',  'desc'=>'سفير حمص الأفضل في المدينة.'],

            // ══════════════════ حماة ══════════════════════════════════════════
            ['name'=>'Borj Hama Hotel',                     'city'=>'حماة','prov'=>'حماة','stars'=>4,'price'=>85, 'disc'=>null,'rating'=>4.1,'tag'=>'سياحي', 'img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenBiz),         'offer'=>null,                          'desc'=>'برج حماة فندق.'],
            ['name'=>'Afamia Alsham Hotel Hama',            'city'=>'حماة','prov'=>'حماة','stars'=>5,'price'=>130,'disc'=>null,'rating'=>4.3,'tag'=>'سياحي', 'img'=>$img('mountain',1),'amen'=>array_merge($amenBase,$amenLux),         'offer'=>null,                          'desc'=>'أفاميا الشام على نهر العاصي. هاتف: +963332525335'],
            ['name'=>'Orient House Hotel Hama',             'city'=>'حماة','prov'=>'حماة','stars'=>4,'price'=>85, 'disc'=>null,'rating'=>4.2,'tag'=>'سياحي', 'img'=>$img('business',2),'amen'=>array_merge($amenBase,$amenBiz),         'offer'=>null,                          'desc'=>'أورينت هاوس حماة. هاتف: +963332225599'],
            ['name'=>'Sarah Hotel Hama',                    'city'=>'حماة','prov'=>'حماة','stars'=>3,'price'=>65, 'disc'=>null,'rating'=>3.9,'tag'=>'اقتصادي','img'=>$img('business',3),'amen'=>$amenBase,                              'offer'=>null,                          'desc'=>'سارة هوتيل حماة. هاتف: +963332515941'],
            ['name'=>'فندق الرياض حماة',                   'city'=>'حماة','prov'=>'حماة','stars'=>3,'price'=>60, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',0),'amen'=>$amenBase,                              'offer'=>null,                          'desc'=>'فندق الرياض حماة. هاتف: +963945555602'],
            ['name'=>'Alnwaer Hotel',                       'city'=>'حماة','prov'=>'حماة','stars'=>3,'price'=>55, 'disc'=>null,'rating'=>3.7,'tag'=>'اقتصادي','img'=>$img('business',1),'amen'=>$amenBase,                              'offer'=>null,                          'desc'=>'النواعير حماة. هاتف: +963332512414'],
            ['name'=>'Imata Hotel',                         'city'=>'حماة','prov'=>'حماة','stars'=>3,'price'=>60, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',2),'amen'=>$amenBase,                              'offer'=>null,                          'desc'=>'إيماتا هوتيل حماة. هاتف: +963332759801'],
            ['name'=>'فندق أبو سمرة مصياف',               'city'=>'مصياف', 'prov'=>'حماة','stars'=>3,'price'=>55, 'disc'=>null,'rating'=>3.8,'tag'=>'سياحي', 'img'=>$img('mountain',0),'amen'=>array_merge($amenBase,$amenHer),        'offer'=>'قريب من قلعة مصياف',         'desc'=>'فندق أبو سمرة في مصياف.'],

            // ══════════════════ طرطوس ══════════════════════════════════════════
            ['name'=>'Crowne Plaza Hotel Tartous',          'city'=>'طرطوس','prov'=>'طرطوس','stars'=>5,'price'=>175,'disc'=>155,'rating'=>4.7,'tag'=>'بحري', 'img'=>$img('beach',0),'amen'=>array_merge($amenBase,$amenBeach,$amenLux),'offer'=>'احجز ليلة واحصل على الثانية بنصف السعر','desc'=>'كراون بلازا طرطوس على البحر المتوسط.'],

            // ══════════════════ الرقة ══════════════════════════════════════════
            ['name'=>'The May Fair Hotel',                  'city'=>'الرقة','prov'=>'الرقة','stars'=>3,'price'=>55, 'disc'=>null,'rating'=>3.7,'tag'=>'اقتصادي','img'=>$img('business',0),'amen'=>$amenBase,                            'offer'=>null,                          'desc'=>'ذا ماي فير هوتيل الرقة.'],

            // ══════════════════ درعا ══════════════════════════════════════════
            ['name'=>'Stewart Hotel Daraa',                 'city'=>'درعا','prov'=>'درعا','stars'=>3,'price'=>60, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',1),'amen'=>$amenBase,                              'offer'=>null,                          'desc'=>'ستيوارت هوتيل درعا.'],

            // ══════════════════ الحسكة ══════════════════════════════════════════
            ['name'=>'Dylan Hotel Hasakah',                 'city'=>'الحسكة','prov'=>'الحسكة','stars'=>4,'price'=>110,'disc'=>null,'rating'=>4.1,'tag'=>'أعمال','img'=>$img('business',2),'amen'=>array_merge($amenBase,$amenBiz),       'offer'=>null,                          'desc'=>'ديلان هوتيل الحسكة.'],

            // ══════════════════ السويداء ══════════════════════════════════════
            ['name'=>'Castello Casole Hotel',               'city'=>'السويداء','prov'=>'السويداء','stars'=>4,'price'=>90, 'disc'=>null,'rating'=>4.1,'tag'=>'سياحي','img'=>$img('mountain',2),'amen'=>array_merge($amenBase,$amenLux),   'offer'=>null,                          'desc'=>'كاستيلو كاسول السويداء.'],
            ['name'=>'Dylan Hotel Sweida',                  'city'=>'السويداء','prov'=>'السويداء','stars'=>3,'price'=>65, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',3),'amen'=>$amenBase,                       'offer'=>null,                          'desc'=>'ديلان هوتيل السويداء.'],

            // ══════════════════ إدلب ══════════════════════════════════════════
            ['name'=>'Redac Gateway Hotel',                 'city'=>'إدلب','prov'=>'إدلب','stars'=>3,'price'=>55, 'disc'=>null,'rating'=>3.7,'tag'=>'اقتصادي','img'=>$img('business',0),'amen'=>$amenBase,                              'offer'=>null,                          'desc'=>'ريداك غيتواي هوتيل إدلب.'],

            // ══════════════════ دير الزور ══════════════════════════════════════
            ['name'=>'Hotel Furat Cham Palace',             'city'=>'دير الزور','prov'=>'دير الزور','stars'=>4,'price'=>132,'disc'=>null,'rating'=>4.2,'tag'=>'سياحي','img'=>$img('business',1),'amen'=>array_merge($amenBase,$amenBiz), 'offer'=>null,                          'desc'=>'فرات شام بالاس دير الزور. هاتف: +96351225418'],
            ['name'=>'Ziyad Hotel',                         'city'=>'دير الزور','prov'=>'دير الزور','stars'=>3,'price'=>65, 'disc'=>null,'rating'=>3.8,'tag'=>'اقتصادي','img'=>$img('business',2),'amen'=>$amenBase,                    'offer'=>null,                          'desc'=>'فندق زياد دير الزور.'],
            ['name'=>'Badia Cham Hotel',                    'city'=>'دير الزور','prov'=>'دير الزور','stars'=>4,'price'=>110,'disc'=>null,'rating'=>4.0,'tag'=>'سياحي','img'=>$img('business',3),'amen'=>array_merge($amenBase,$amenBiz), 'offer'=>null,                          'desc'=>'بادية شام دير الزور.'],
            ['name'=>'فندق السلامة',                       'city'=>'دير الزور','prov'=>'دير الزور','stars'=>3,'price'=>60, 'disc'=>null,'rating'=>3.7,'tag'=>'اقتصادي','img'=>$img('business',0),'amen'=>$amenBase,                    'offer'=>null,                          'desc'=>'فندق السلامة دير الزور. هاتف: +96351314170'],
        ];

        foreach ($hotels as $h) {
            Hotel::firstOrCreate(
                ['name' => $h['name'], 'city' => $h['city']],
                [
                    'province_id'    => $prov[$h['prov']] ?? null,
                    'country'        => 'سوريا',
                    'stars'          => $h['stars'],
                    'price_per_night'=> $h['price'],
                    'discount_price' => $h['disc'],
                    'rating'         => $h['rating'],
                    'rooms'          => rand(20, 120),
                    'status'         => 'active',
                    'tag'            => $h['tag'],
                    'image_url'      => $h['img'],
                    'amenities'      => $h['amen'],
                    'offer_text'     => $h['offer'],
                    'description'    => $h['desc'],
                ]
            );
        }

        $this->command->info('✅ تم إضافة ' . count($hotels) . ' فندق سوري من قاعدة البيانات الحقيقية');
    }
}
