export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          identity_status: 'unverified' | 'pending' | 'verified' | 'rejected'
          location: string | null
          address_city: string | null
          address_country: string | null
          rating_avg: number
          rating_count: number
          response_time_avg_minutes: number | null
          completed_rentals: number
          payway_beneficiary_id: string | null
          bank_name: string | null
          bank_account_masked: string | null
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          identity_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          location?: string | null
          address_city?: string | null
          address_country?: string | null
          rating_avg?: number
          rating_count?: number
          response_time_avg_minutes?: number | null
          completed_rentals?: number
          payway_beneficiary_id?: string | null
          bank_name?: string | null
          bank_account_masked?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          identity_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          location?: string | null
          address_city?: string | null
          address_country?: string | null
          rating_avg?: number
          rating_count?: number
          response_time_avg_minutes?: number | null
          completed_rentals?: number
          payway_beneficiary_id?: string | null
          bank_name?: string | null
          bank_account_masked?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          parent_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          owner_id: string
          category_id: string | null
          title: string
          description: string | null
          type: 'offer' | 'request'
          status: 'draft' | 'active' | 'paused' | 'archived'
          price_hourly: number | null
          price_daily: number
          price_weekly: number | null
          deposit_amount: number
          currency: string
          location: string | null
          address_text: string | null
          address_city: string | null
          address_country: string | null
          availability_type: string
          min_rental_hours: number
          max_rental_days: number | null
          delivery_available: boolean
          delivery_fee: number
          pickup_available: boolean
          view_count: number
          rating_avg: number
          rating_count: number
          published_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          category_id?: string | null
          title: string
          description?: string | null
          type?: 'offer' | 'request'
          status?: 'draft' | 'active' | 'paused' | 'archived'
          price_hourly?: number | null
          price_daily: number
          price_weekly?: number | null
          deposit_amount?: number
          currency?: string
          location?: string | null
          address_text?: string | null
          address_city?: string | null
          address_country?: string | null
          availability_type?: string
          min_rental_hours?: number
          max_rental_days?: number | null
          delivery_available?: boolean
          delivery_fee?: number
          pickup_available?: boolean
          view_count?: number
          rating_avg?: number
          rating_count?: number
          published_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      listing_media: {
        Row: {
          id: string
          listing_id: string
          url: string
          thumbnail_url: string | null
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          url: string
          thumbnail_url?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      availability: {
        Row: {
          id: string
          listing_id: string
          start_time: string
          end_time: string
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          start_time: string
          end_time: string
          is_available?: boolean
          created_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      bookings: {
        Row: {
          id: string
          listing_id: string
          renter_id: string
          owner_id: string
          start_time: string
          end_time: string
          status: 'requested' | 'approved' | 'declined' | 'auto_declined' | 'active' | 'completed' | 'cancelled' | 'disputed' | 'resolved'
          payment_authorized: boolean
          subtotal: number
          service_fee: number
          delivery_fee: number
          protection_fee: number
          deposit_amount: number
          total_amount: number
          owner_payout: number
          currency: string
          delivery_method: string | null
          delivery_address: string | null
          protection_plan: string
          approved_at: string | null
          declined_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          renter_id: string
          owner_id: string
          start_time: string
          end_time: string
          status?: 'requested' | 'approved' | 'declined' | 'auto_declined' | 'active' | 'completed' | 'cancelled' | 'disputed' | 'resolved'
          payment_authorized?: boolean
          subtotal: number
          service_fee: number
          delivery_fee?: number
          protection_fee?: number
          deposit_amount?: number
          total_amount: number
          owner_payout: number
          currency?: string
          delivery_method?: string | null
          delivery_address?: string | null
          protection_plan?: string
          approved_at?: string | null
          declined_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      transactions: {
        Row: {
          id: string
          booking_id: string
          type: 'pre_auth' | 'capture' | 'payout' | 'refund' | 'partial_refund'
          status: 'pending' | 'authorized' | 'completed' | 'failed' | 'cancelled' | 'refunded'
          amount: number
          currency: string
          payway_tran_id: string | null
          payway_status: string | null
          metadata: Json
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          type: 'pre_auth' | 'capture' | 'payout' | 'refund' | 'partial_refund'
          status?: 'pending' | 'authorized' | 'completed' | 'failed' | 'cancelled' | 'refunded'
          amount: number
          currency?: string
          payway_tran_id?: string | null
          payway_status?: string | null
          metadata?: Json
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      message_threads: {
        Row: {
          id: string
          listing_id: string | null
          booking_id: string | null
          participant_ids: string[]
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          booking_id?: string | null
          participant_ids: string[]
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          content: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_id: string
          content: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          listing_id: string
          reviewer_id: string
          target_id: string
          rating: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          listing_id: string
          reviewer_id: string
          target_id: string
          rating: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json
          read_at?: string | null
          created_at?: string
        }
        Update: {
          [key: string]: any
        }
      }
    }
    Functions: {
      search_listings: {
        Args: {
          search_query?: string | null
          search_lat?: number | null
          search_lng?: number | null
          search_radius_km?: number
          category_slug?: string | null
          listing_type?: string | null
          price_min?: number | null
          price_max?: number | null
          sort_by?: string
          result_limit?: number
          result_offset?: number
        }
        Returns: {
          id: string
          title: string
          description: string | null
          type: 'offer' | 'request'
          price_daily: number
          deposit_amount: number
          currency: string
          owner_id: string
          owner_display_name: string
          owner_avatar_url: string | null
          owner_rating: number
          owner_verified: boolean
          listing_rating: number
          review_count: number
          distance_km: number | null
          first_image_url: string | null
          created_at: string
        }[]
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type ListingMedia = Database['public']['Tables']['listing_media']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type MessageThread = Database['public']['Tables']['message_threads']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
