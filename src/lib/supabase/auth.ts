import { supabase, isSupabaseConfigured } from './client';

/**
 * دالة تشفير كلمة المرور باستخدام SHA-256 (Web Crypto API القياسية)
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined' && typeof crypto === 'undefined') {
    return password;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * دالة التحقق من صحة كلمة المرور ضد الهاش المخزن
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  // إذا كان الهاش عبارة عن 64 رمز سداسي عشري (SHA-256)
  if (storedHash.length === 64 && /^[0-9a-fA-F]+$/.test(storedHash)) {
    const computed = await hashPassword(password);
    return computed.toLowerCase() === storedHash.toLowerCase();
  }

  // في حال وجود هاش قديم أو كلمة مرور أولية تجريبية
  return password === storedHash;
}

/**
 * تسجيل النشاط في جدول activity_log على Supabase
 */
export async function logSupabaseActivity(
  actorId: string | null,
  actorName: string,
  actorRole: string,
  tag: string,
  description: string,
  meta?: any
) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('activity_log').insert({
      actor_id: actorId,
      actor_name: actorName || 'زائر',
      actor_role: actorRole || 'visitor',
      tag,
      severity: 'info',
      description,
      meta: meta || {},
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

/**
 * جلب المعرفات المرجعية (Governorate & Institution & UserType IDs)
 */
export async function resolveMetadataIds(options: {
  userType?: string;
  governorateName?: string;
  institutionName?: string;
}) {
  let userTypeId: number | null = null;
  let governorateId: number | null = null;
  let institutionId: number | null = null;

  if (!isSupabaseConfigured() || !supabase) {
    return { userTypeId, governorateId, institutionId };
  }

  try {
    // 1. نوع المستخدم
    if (options.userType) {
      const typeMap: Record<string, number> = {
        student: 1,
        visitor: 2,
        local: 3,
      };
      userTypeId = typeMap[options.userType] || null;
    }

    // 2. المحافظة
    if (options.governorateName) {
      const { data: gov } = await supabase
        .from('governorates')
        .select('id')
        .eq('name_ar', options.governorateName.trim())
        .maybeSingle();
      if (gov?.id) governorateId = gov.id;
    }

    // 3. الكلية أو المعهد
    if (options.institutionName) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('id')
        .eq('name_ar', options.institutionName.trim())
        .maybeSingle();
      if (inst?.id) institutionId = inst.id;
    }
  } catch (e) {
    console.warn('Error resolving metadata IDs:', e);
  }

  return { userTypeId, governorateId, institutionId };
}
