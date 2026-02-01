export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          progress_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          progress_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          progress_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          author_id: string
          category: string
          created_at: string
          description: string | null
          difficulty: string
          duration: number
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          views: number
        }
        Insert: {
          author_id: string
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration?: number
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          views?: number
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration?: number
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views?: number
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          participants_count: number
          scheduled_at: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          participants_count?: number
          scheduled_at: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          participants_count?: number
          scheduled_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          accuracy_score: number | null
          created_at: string
          duration: number
          id: string
          signs_practiced: string[]
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string
          duration?: number
          id?: string
          signs_practiced?: string[]
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string
          duration?: number
          id?: string
          signs_practiced?: string[]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raised_hands: {
        Row: {
          answer_confidence: number | null
          answer_sign: string | null
          called_at: string | null
          id: string
          raised_at: string
          session_id: string
          status: string
          student_id: string
          student_name: string
        }
        Insert: {
          answer_confidence?: number | null
          answer_sign?: string | null
          called_at?: string | null
          id?: string
          raised_at?: string
          session_id: string
          status?: string
          student_id: string
          student_name: string
        }
        Update: {
          answer_confidence?: number | null
          answer_sign?: string | null
          called_at?: string | null
          id?: string
          raised_at?: string
          session_id?: string
          status?: string
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "raised_hands_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          id: string
          is_active: boolean
          is_muted: boolean
          is_video_off: boolean
          joined_at: string
          left_at: string | null
          session_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          is_muted?: boolean
          is_video_off?: boolean
          joined_at?: string
          left_at?: string | null
          session_id: string
          user_id: string
          user_name: string
        }
        Update: {
          id?: string
          is_active?: boolean
          is_muted?: boolean
          is_video_off?: boolean
          joined_at?: string
          left_at?: string | null
          session_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_recordings: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          recorded_at: string
          recording_url: string | null
          session_id: string
          status: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          recorded_at?: string
          recording_url?: string | null
          session_id: string
          status?: string
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          recorded_at?: string
          recording_url?: string | null
          session_id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sign_messages: {
        Row: {
          confidence: number
          created_at: string
          id: string
          participant_id: string
          participant_name: string
          session_id: string
          sign_text: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          participant_id: string
          participant_name: string
          session_id: string
          sign_text: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          participant_id?: string
          participant_name?: string
          session_id?: string
          sign_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "sign_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_responses: {
        Row: {
          confidence: number | null
          created_at: string
          detected_sign: string | null
          id: string
          is_featured: boolean
          response_content: string | null
          response_type: string
          session_id: string
          student_id: string
          student_name: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          detected_sign?: string | null
          id?: string
          is_featured?: boolean
          response_content?: string | null
          response_type?: string
          session_id: string
          student_id: string
          student_name: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          detected_sign?: string | null
          id?: string
          is_featured?: boolean
          response_content?: string | null
          response_type?: string
          session_id?: string
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          ai_prediction: Json | null
          feedback: string | null
          id: string
          lesson_id: string
          reviewed_at: string | null
          status: string
          student_id: string
          submitted_at: string
          video_url: string | null
        }
        Insert: {
          ai_prediction?: Json | null
          feedback?: string | null
          id?: string
          lesson_id: string
          reviewed_at?: string | null
          status?: string
          student_id: string
          submitted_at?: string
          video_url?: string | null
        }
        Update: {
          ai_prediction?: Json | null
          feedback?: string | null
          id?: string
          lesson_id?: string
          reviewed_at?: string | null
          status?: string
          student_id?: string
          submitted_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          session_id: string
          target_student_id: string | null
          teacher_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          session_id: string
          target_student_id?: string | null
          teacher_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          session_id?: string
          target_student_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          current_streak: number
          id: string
          last_activity_date: string | null
          lessons_completed: number
          longest_streak: number
          practice_sessions: number
          signs_learned: number
          total_watch_time: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          lessons_completed?: number
          longest_streak?: number
          practice_sessions?: number
          signs_learned?: number
          total_watch_time?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          lessons_completed?: number
          longest_streak?: number
          practice_sessions?: number
          signs_learned?: number
          total_watch_time?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_streak: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
