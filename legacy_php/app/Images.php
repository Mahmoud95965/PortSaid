<?php
declare(strict_types=1);
namespace App;

final class Images
{
    /** صورة شخصية: نتأكد إنها صورة حقيقية، نقصّها مربعة 480×480 ونعيد ترميزها JPEG (بيشيل EXIF/GPS وأي بيانات مخفية). */
    public static function avatarJpeg(string $raw): string
    {
        if (strlen($raw) < 1000 || strlen($raw) > 2000000) { throw new ApiException('validation', 'الصورة مش مقبولة (حجمها أو صيغتها). الحد الأقصى 2MB.', 422); }
        if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) { throw new ApiException('unsupported', 'رفع الصور مش متاح على السيرفر ده حاليًا.', 501); }
        $info = @getimagesizefromstring($raw);
        if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) { throw new ApiException('validation', 'اختار صورة JPG أو PNG أو WebP.', 422); }
        $w = (int)$info[0]; $h = (int)$info[1];
        if ($w < 100 || $h < 100 || $w > 4000 || $h > 4000 || $w * $h > 12000000) { throw new ApiException('validation', 'مقاس الصورة مش مناسب (أقل حاجة 100 بكسل وأقصى 4000).', 422); }
        $src = @imagecreatefromstring($raw);
        if (!$src) { throw new ApiException('validation', 'مقدرتش أقرا الصورة دي. جرّب صورة تانية.', 422); }
        $side = min($w, $h);
        $dst = imagecreatetruecolor(480, 480);
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        imagecopyresampled($dst, $src, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), 480, 480, $side, $side);
        ob_start();
        imagejpeg($dst, null, 86);
        $jpg = (string)ob_get_clean();
        imagedestroy($src); imagedestroy($dst);
        if ($jpg === '') { throw new ApiException('server', 'حصلت مشكلة في معالجة الصورة.', 500); }
        return $jpg;
    }
}
