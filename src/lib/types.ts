export type CourseStatus = 'active' | 'draft' | 'archived'
export type ClassStatus = 'scheduled' | 'open' | 'closed' | 'archived'

export type AppSettings = {
  id: string
  platform_name: string
  church_name: string
  welcome_text: string
  footer_text: string
  primary_color: string
  accent_color: string
  logo_url: string | null
  default_banner_url: string | null
  created_at?: string
  updated_at?: string
}

export type Profile = {
  id: string
  full_name: string | null
  is_admin: boolean
  created_at?: string
  updated_at?: string
}

export type Course = {
  id: string
  name: string
  description: string | null
  owner_name: string | null
  event_date: string | null
  status: CourseStatus
  location: string | null
  banner_url: string | null
  color: string
  notes: string | null
  created_at?: string
  updated_at?: string
}

export type ClassSession = {
  id: string
  course_id: string
  name: string
  description: string | null
  session_date: string | null
  starts_at: string | null
  location: string | null
  banner_url: string | null
  status: ClassStatus
  qr_token: string
  created_at?: string
  updated_at?: string
  courses?: Pick<Course, 'id' | 'name' | 'color' | 'banner_url' | 'location'>
}

export type Student = {
  id: string
  full_name: string
  normalized_name: string
  email: string | null
  phone: string | null
  created_at?: string
  updated_at?: string
}

export type Checkin = {
  id: string
  class_id: string
  student_id: string
  note: string | null
  receipt_requested?: boolean
  receipt_sent_at?: string | null
  checked_in_at: string
  students?: Student
  class_sessions?: ClassSession & { courses?: Course }
}
