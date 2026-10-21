export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'admin' | 'merchant' | 'user';
  type?: 'student' | 'visitor' | 'local';
  gov?: string;
  institution?: string;
  gender?: 'male' | 'female';
  points: number;
  avatar?: string | null;
  must_change_password?: boolean;
  email_verified?: boolean;
  verified_at?: string | null;
  staff?: boolean;
  perms?: string[];
}

export interface Place {
  id: string;
  category_id: number;
  name_ar: string;
  area_ar: string;
  description_ar?: string;
  latitude: number;
  longitude: number;
  visit_points: number;
  discount_percent: number;
  coupon_cost_points: number;
  commission_amount: number;
  checkin_radius_m: number;
  logo_b64?: string | null;
  status: 'active' | 'draft' | 'hidden';
  distance?: number;
  visited?: boolean;
  coupon?: Coupon | null;
}

export interface Category {
  id: number;
  code: string;
  name_ar: string;
  icon: string;
  color?: string;
}

export interface TransportLine {
  id: number;
  name_ar: string;
  details_ar: string;
  stops: string[];
}

export interface Coupon {
  id: string;
  place_id: string;
  place_name?: string;
  user_id: string;
  discount_percent: number;
  points_cost: number;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  expires_at: string;
  created_at?: string;
}

export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  name: string;
  rating: number;
  comment?: string;
  date: string;
  mine?: boolean;
  verified?: boolean;
}

export interface ExploreItem {
  id: string;
  kind: 'image' | 'video';
  title_ar: string;
  description_ar: string;
  file_name: string;
  img_b64?: string | null;
}

export interface ExploreUpload {
  id: string;
  user_id: string;
  user_name?: string;
  file_name: string;
  img_b64?: string | null;
  th_b64?: string | null;
  caption?: string;
  status: 'pending' | 'approved' | 'rejected';
  visibility: 'public' | 'private';
  created_at: string;
  rx?: Record<string, number>;
  rc?: number;
  my?: string | null;
}

export interface PartnerApplication {
  id: string;
  user_id: string;
  user_name?: string;
  business_name: string;
  category_id?: number;
  area_ar: string;
  phone: string;
  proposed_discount_percent: number;
  proposed_commission_amount: number;
  promo_notes?: string;
  commercial_registry_img?: string;
  status: 'pending' | 'approved' | 'rejected';
  place_id?: string;
  created_at: string;
}

export interface StudentVerification {
  id: string | number;
  user_id: string;
  user_name?: string;
  img_b64: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string | number;
  kind: 'admin' | 'offer';
  title: string;
  body: string;
  created_at: string;
  read?: boolean;
}
