export type RoleType = 'owner' | 'admin' | 'merchant' | 'user';
export type UserTypeCategory = 'student' | 'visitor' | 'local';
export type GenderType = 'male' | 'female';

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: RoleType;
  type?: UserTypeCategory | null;
  gov?: string | null;
  gender?: GenderType | null;
  institution?: string | null;
  points: number;
  must_change_password?: boolean;
  avatar?: string | null;
  email_verified?: boolean;
  status?: 'active' | 'suspended';
  disabled_reason?: string | null;
  staff?: boolean;
  perms?: string[];
  created_at?: string;
  last_login_at?: string;
}

export interface Place {
  id: string;
  cat: string;
  n: string; // name
  a: string; // area
  ds?: string; // description
  lat: number;
  lon: number;
  p: number; // visit points
  disc: number; // discount percent
  cost: number; // coupon cost points
  commission?: number;
  radius?: number;
  status?: 'active' | 'draft' | 'hidden';
  steps?: string[];
  visited?: boolean;
  coupon?: {
    payload: string;
    expires_at: string;
    discount: number;
  } | null;
}

export interface Review {
  id: string;
  n: string; // author name
  r: number; // rating 1-5
  c?: string | null; // comment
  d?: string; // date
  mine?: boolean;
  v?: boolean; // verified badge
}

export interface CouponItem {
  id: string;
  place_name: string;
  discount: number;
  customer?: string;
  payload: string;
  expires_at: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
}

export interface PartnerApplication {
  id: string;
  user_id?: string;
  business_name: string;
  category?: string;
  area: string;
  phone: string;
  discount: number;
  commission: number;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  place_linked?: boolean;
  place_id?: string | null;
  place_name?: string | null;
  owner_name?: string;
  owner_email?: string;
  created_at?: string;
}

export interface FeedbackItem {
  id: string;
  kind: 'complaint' | 'suggestion';
  message: string;
  status: 'new' | 'read' | 'done';
  created_at: string;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
}

export interface ExploreItem {
  id: string;
  kind: 'image' | 'video';
  t: string; // title
  d?: string; // description
  f: string; // file name or path
  sort?: number;
}

export interface CommunityUpload {
  id: string;
  f: string;
  t: string;
  th?: string;
  s?: 'pending' | 'approved' | 'rejected';
  status?: 'pending' | 'approved' | 'rejected';
  user_name?: string;
  user_phone?: string;
  created_at?: string;
}

export interface ActivityLogRow {
  id: number;
  actor_id?: string | null;
  actor_name: string;
  actor_role?: string | null;
  tag: string;
  tag_label?: string;
  severity: 'info' | 'notice' | 'warning' | 'critical';
  severity_label?: string;
  description: string;
  meta?: any;
  ip?: string | null;
  user_agent?: string;
  created_at: string;
}

export interface TransportRouteStep {
  l: string; // line name
  f: string; // from stop
  t: string; // to stop
}

export interface Institution {
  name: string;
  kind: string;
  parent?: string;
}
