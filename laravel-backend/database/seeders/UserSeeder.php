<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // superadmin
        User::firstOrCreate(
            ['email' => 'admin@nuzul.sy'],
            [
                'name'     => 'مدير النظام',
                'password' => Hash::make('admin123'),
                'role'     => 'superadmin',
                'avatar'   => null,
            ]
        );

        // support
        User::firstOrCreate(
            ['email' => 'support@nuzul.sy'],
            [
                'name'     => 'موظف الدعم',
                'password' => Hash::make('support123'),
                'role'     => 'support',
                'avatar'   => null,
            ]
        );

        // demo user
        User::firstOrCreate(
            ['email' => 'user@nuzul.sy'],
            [
                'name'     => 'أحمد السوري',
                'password' => Hash::make('user1234'),
                'role'     => 'user',
                'avatar'   => null,
            ]
        );
    }
}
