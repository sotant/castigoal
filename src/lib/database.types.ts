export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      assigned_punishments: {
        Row: {
          assigned_at: string;
          completed_at: string | null;
          goal_id: string;
          id: string;
          period_key: string;
          punishment_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          completed_at?: string | null;
          goal_id: string;
          id?: string;
          period_key: string;
          punishment_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          completed_at?: string | null;
          goal_id?: string;
          id?: string;
          period_key?: string;
          punishment_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assigned_punishments_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assigned_punishments_goal_user_id_fkey';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'assigned_punishments_punishment_id_fkey';
            columns: ['punishment_id'];
            isOneToOne: false;
            referencedRelation: 'punishments';
            referencedColumns: ['id'];
          },
        ];
      };
      goal_period_outcomes: {
        Row: {
          assigned_punishment_id: string | null;
          completed_days: number;
          completion_rate: number;
          evaluated_at: string;
          goal_id: string;
          id: string;
          minimum_success_rate: number;
          passed: boolean;
          period_key: string;
          planned_days: number;
          required_days: number;
          resolution_source: string;
          target_days: number;
          user_id: string;
          window_end: string;
          window_start: string;
        };
        Insert: {
          assigned_punishment_id?: string | null;
          completed_days: number;
          completion_rate: number;
          evaluated_at?: string;
          goal_id: string;
          id?: string;
          minimum_success_rate: number;
          passed: boolean;
          period_key: string;
          planned_days: number;
          required_days: number;
          resolution_source: string;
          target_days: number;
          user_id: string;
          window_end: string;
          window_start: string;
        };
        Update: {
          assigned_punishment_id?: string | null;
          completed_days?: number;
          completion_rate?: number;
          evaluated_at?: string;
          goal_id?: string;
          id?: string;
          minimum_success_rate?: number;
          passed?: boolean;
          period_key?: string;
          planned_days?: number;
          required_days?: number;
          resolution_source?: string;
          target_days?: number;
          user_id?: string;
          window_end?: string;
          window_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'goal_period_outcomes_assigned_punishment_id_fkey';
            columns: ['assigned_punishment_id'];
            isOneToOne: false;
            referencedRelation: 'assigned_punishments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'goal_period_outcomes_goal_user_fkey';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      checkins: {
        Row: {
          checkin_date: string;
          created_at: string;
          goal_id: string;
          id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          checkin_date: string;
          created_at?: string;
          goal_id: string;
          id?: string;
          status: string;
          user_id: string;
        };
        Update: {
          checkin_date?: string;
          created_at?: string;
          goal_id?: string;
          id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkins_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_goal_user_id_fkey';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          active: boolean;
          closed_on: string | null;
          created_at: string;
          description: string | null;
          frequency: string;
          id: string;
          lifecycle_status: string;
          minimum_success_rate: number;
          punishment_category_ids: string[];
          punishment_category_mode: string;
          punishment_pool_scope: string;
          resolution_source: string | null;
          resolution_status: string;
          resolved_at: string | null;
          start_date: string;
          target_days: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          closed_on?: string | null;
          created_at?: string;
          description?: string | null;
          frequency?: string;
          id?: string;
          lifecycle_status?: string;
          minimum_success_rate: number;
          punishment_category_ids?: string[];
          punishment_category_mode?: string;
          punishment_pool_scope?: string;
          resolution_source?: string | null;
          resolution_status?: string;
          resolved_at?: string | null;
          start_date: string;
          target_days: number;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          closed_on?: string | null;
          created_at?: string;
          description?: string | null;
          frequency?: string;
          id?: string;
          lifecycle_status?: string;
          minimum_success_rate?: number;
          punishment_category_ids?: string[];
          punishment_category_mode?: string;
          punishment_pool_scope?: string;
          resolution_source?: string | null;
          resolution_status?: string;
          resolved_at?: string | null;
          start_date?: string;
          target_days?: number;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          onboarding_completed: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      punishment_completion_history: {
        Row: {
          assigned_punishment_id: string | null;
          completed_at: string;
          created_at: string;
          goal_id: string | null;
          id: string;
          punishment_description: string;
          punishment_id: string | null;
          punishment_title: string;
          user_id: string;
        };
        Insert: {
          assigned_punishment_id?: string | null;
          completed_at?: string;
          created_at?: string;
          goal_id?: string | null;
          id?: string;
          punishment_description: string;
          punishment_id?: string | null;
          punishment_title: string;
          user_id: string;
        };
        Update: {
          assigned_punishment_id?: string | null;
          completed_at?: string;
          created_at?: string;
          goal_id?: string | null;
          id?: string;
          punishment_description?: string;
          punishment_id?: string | null;
          punishment_title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'punishment_completion_history_assigned_punishment_id_fkey';
            columns: ['assigned_punishment_id'];
            isOneToOne: false;
            referencedRelation: 'assigned_punishments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'punishment_completion_history_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'punishment_completion_history_punishment_id_fkey';
            columns: ['punishment_id'];
            isOneToOne: false;
            referencedRelation: 'punishments';
            referencedColumns: ['id'];
          },
        ];
      };
      punishments: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          difficulty: number;
          id: string;
          is_custom: boolean;
          owner_id: string | null;
          title: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          difficulty: number;
          id?: string;
          is_custom?: boolean;
          owner_id?: string | null;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          difficulty?: number;
          id?: string;
          is_custom?: boolean;
          owner_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'punishments_category_fkey';
            columns: ['category'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      user_feedback: {
        Row: {
          affected_section: string | null;
          app_version: string | null;
          category: string | null;
          created_at: string;
          device_model: string | null;
          id: string;
          locale: string | null;
          message: string;
          platform: string | null;
          reproduction_steps: string | null;
          source_screen: string | null;
          status: string;
          subject: string;
          type: string;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          affected_section?: string | null;
          app_version?: string | null;
          category?: string | null;
          created_at?: string;
          device_model?: string | null;
          id?: string;
          locale?: string | null;
          message: string;
          platform?: string | null;
          reproduction_steps?: string | null;
          source_screen?: string | null;
          status?: string;
          subject: string;
          type: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          affected_section?: string | null;
          app_version?: string | null;
          category?: string | null;
          created_at?: string;
          device_model?: string | null;
          id?: string;
          locale?: string | null;
          message?: string;
          platform?: string | null;
          reproduction_steps?: string | null;
          source_screen?: string | null;
          status?: string;
          subject?: string;
          type?: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          created_at: string;
          pending_punishment_reminder_enabled: boolean;
          reminder_hour: number;
          reminder_minute: number;
          reminders_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          pending_punishment_reminder_enabled?: boolean;
          reminder_hour?: number;
          reminder_minute?: number;
          reminders_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          pending_punishment_reminder_enabled?: boolean;
          reminder_hour?: number;
          reminder_minute?: number;
          reminders_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_assigned_punishment: {
        Args: { p_assigned_id: string };
        Returns: {
          assigned_at: string;
          completed_at: string | null;
          goal_id: string;
          id: string;
          period_key: string;
          punishment_id: string;
          status: string;
          user_id: string;
        };
      };
      delete_personal_punishment: {
        Args: { p_punishment_id: string };
        Returns: string;
      };
      get_goal_calendar_month: {
        Args: { p_goal_id: string; p_month_start?: string };
        Returns: {
          date: string;
          day_number: number;
          in_month: boolean;
          status: string;
        }[];
      };
      get_home_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          active_goals_count: number;
          latest_pending_assigned_id: string;
          latest_pending_goal_id: string;
          latest_pending_punishment_id: string;
          latest_pending_status: string;
          latest_punishment_category_id: string;
          latest_punishment_category_name: string;
          latest_punishment_created_at: string;
          latest_punishment_description: string;
          latest_punishment_difficulty: number;
          latest_punishment_scope: string;
          latest_punishment_title: string;
          pending_punishments_count: number;
        }[];
      };
      get_stats_summary: {
        Args: { p_reference_date?: string };
        Returns: {
          average_rate: number;
          completed_punishments: number;
          completion_ratio: number;
          goals_active_count: number;
          total_checkins: number;
        }[];
      };
      evaluate_goal_period: {
        Args: { p_goal_id: string; p_reference_date?: string };
        Returns: {
          completed_days: number;
          completion_rate: number;
          goal_id: string;
          passed: boolean;
          period_key: string;
          planned_days: number;
          required_days: number;
          window_end: string;
          window_start: string;
        }[];
      };
      list_home_goal_summaries: {
        Args: { p_reference_date?: string };
        Returns: {
          active: boolean;
          best_streak: number;
          closed_on: string;
          completed_days: number;
          completion_rate: number;
          current_streak: number;
          days_until_start: number;
          description: string;
          goal_id: string;
          lifecycle_status: string;
          passed: boolean;
          remaining_days: number;
          required_days: number;
          resolution_status: string;
          target_days: number;
          title: string;
          today_status: string;
        }[];
      };
      list_pending_punishments: {
        Args: Record<PropertyKey, never>;
        Returns: {
          assigned_at: string;
          assigned_id: string;
          goal_id: string;
          goal_title: string;
          punishment_category_id: string;
          punishment_category_name: string;
          punishment_description: string;
          punishment_difficulty: number;
          punishment_id: string;
          punishment_scope: string;
          punishment_title: string;
          status: string;
        }[];
      };
      list_punishment_catalog: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category_id: string;
          category_name: string;
          created_at: string;
          description: string;
          difficulty: number;
          id: string;
          scope: string;
          title: string;
        }[];
      };
      list_punishment_completion_history: {
        Args: { p_limit?: number };
        Returns: {
          assigned_punishment_id: string;
          completed_at: string;
          goal_id: string;
          goal_title: string;
          id: string;
          punishment_description: string;
          punishment_id: string;
          punishment_title: string;
        }[];
      };
      list_goal_evaluations: {
        Args: { p_reference_date?: string };
        Returns: {
          completed_days: number;
          completion_rate: number;
          goal_id: string;
          passed: boolean;
          period_key: string;
          planned_days: number;
          required_days: number;
          window_end: string;
          window_start: string;
        }[];
      };
      list_goal_period_outcomes: {
        Args: { p_goal_id?: string; p_limit?: number };
        Returns: {
          assigned_punishment_id: string;
          completed_days: number;
          completion_rate: number;
          evaluated_at: string;
          goal_id: string;
          id: string;
          minimum_success_rate: number;
          passed: boolean;
          period_key: string;
          planned_days: number;
          required_days: number;
          resolution_source: string;
          target_days: number;
          window_end: string;
          window_start: string;
        }[];
      };
      record_goal_checkin: {
        Args: {
          p_checkin_date?: string;
          p_goal_id: string;
          p_status: string;
        };
        Returns: {
          assigned_punishment_assigned_at: string;
          assigned_punishment_completed_at: string;
          assigned_punishment_goal_id: string;
          assigned_punishment_id: string;
          assigned_punishment_period_key: string;
          assigned_punishment_punishment_id: string;
          assigned_punishment_status: string;
          checkin_created_at: string;
          checkin_date: string;
          checkin_goal_id: string;
          checkin_id: string;
          checkin_status: string;
          evaluation_completed_days: number;
          evaluation_completion_rate: number;
          evaluation_goal_id: string;
          evaluation_passed: boolean;
          evaluation_period_key: string;
          evaluation_planned_days: number;
          evaluation_required_days: number;
          evaluation_window_end: string;
          evaluation_window_start: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;
