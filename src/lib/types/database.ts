export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			band_members: {
				Row: {
					band_id: string;
					created_at: string;
					id: string;
					instrument: Database['public']['Enums']['instrument'] | null;
					role: Database['public']['Enums']['band_role'];
					user_id: string;
				};
				Insert: {
					band_id: string;
					created_at?: string;
					id?: string;
					instrument?: Database['public']['Enums']['instrument'] | null;
					role?: Database['public']['Enums']['band_role'];
					user_id: string;
				};
				Update: {
					band_id?: string;
					created_at?: string;
					id?: string;
					instrument?: Database['public']['Enums']['instrument'] | null;
					role?: Database['public']['Enums']['band_role'];
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'band_members_band_id_fkey';
						columns: ['band_id'];
						isOneToOne: false;
						referencedRelation: 'bands';
						referencedColumns: ['id'];
					}
				];
			};
			bands: {
				Row: {
					created_at: string;
					id: string;
					logo_url: string | null;
					name: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					logo_url?: string | null;
					name: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					logo_url?: string | null;
					name?: string;
				};
				Relationships: [];
			};
			live_sessions: {
				Row: {
					band_id: string;
					created_at: string;
					current_song_id: string | null;
					id: string;
					leader_id: string;
					setlist_id: string | null;
					status: Database['public']['Enums']['session_status'];
				};
				Insert: {
					band_id: string;
					created_at?: string;
					current_song_id?: string | null;
					id?: string;
					leader_id: string;
					setlist_id?: string | null;
					status?: Database['public']['Enums']['session_status'];
				};
				Update: {
					band_id?: string;
					created_at?: string;
					current_song_id?: string | null;
					id?: string;
					leader_id?: string;
					setlist_id?: string | null;
					status?: Database['public']['Enums']['session_status'];
				};
				Relationships: [
					{
						foreignKeyName: 'live_sessions_band_id_fkey';
						columns: ['band_id'];
						isOneToOne: true;
						referencedRelation: 'bands';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'live_sessions_current_song_id_fkey';
						columns: ['current_song_id'];
						isOneToOne: false;
						referencedRelation: 'songs';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'live_sessions_setlist_id_fkey';
						columns: ['setlist_id'];
						isOneToOne: false;
						referencedRelation: 'setlists';
						referencedColumns: ['id'];
					}
				];
			};
			session_suggestions: {
				Row: {
					created_at: string;
					id: string;
					session_id: string;
					song_id: string;
					status: Database['public']['Enums']['suggestion_status'];
					suggested_by: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					session_id: string;
					song_id: string;
					status?: Database['public']['Enums']['suggestion_status'];
					suggested_by: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					session_id?: string;
					song_id?: string;
					status?: Database['public']['Enums']['suggestion_status'];
					suggested_by?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'session_suggestions_session_id_fkey';
						columns: ['session_id'];
						isOneToOne: false;
						referencedRelation: 'live_sessions';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'session_suggestions_song_id_fkey';
						columns: ['song_id'];
						isOneToOne: false;
						referencedRelation: 'songs';
						referencedColumns: ['id'];
					}
				];
			};
			setlist_songs: {
				Row: {
					created_at: string;
					id: string;
					position: number;
					setlist_id: string;
					song_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					position: number;
					setlist_id: string;
					song_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					position?: number;
					setlist_id?: string;
					song_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'setlist_songs_setlist_id_fkey';
						columns: ['setlist_id'];
						isOneToOne: false;
						referencedRelation: 'setlists';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'setlist_songs_song_id_fkey';
						columns: ['song_id'];
						isOneToOne: false;
						referencedRelation: 'songs';
						referencedColumns: ['id'];
					}
				];
			};
			setlists: {
				Row: {
					band_id: string;
					created_at: string;
					event_date: string | null;
					id: string;
					name: string;
				};
				Insert: {
					band_id: string;
					created_at?: string;
					event_date?: string | null;
					id?: string;
					name: string;
				};
				Update: {
					band_id?: string;
					created_at?: string;
					event_date?: string | null;
					id?: string;
					name?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'setlists_band_id_fkey';
						columns: ['band_id'];
						isOneToOne: false;
						referencedRelation: 'bands';
						referencedColumns: ['id'];
					}
				];
			};
			song_tabs: {
				Row: {
					content: Json | null;
					content_type: Database['public']['Enums']['tab_content_type'];
					content_url: string | null;
					created_at: string;
					id: string;
					instrument: Database['public']['Enums']['instrument'];
					song_id: string;
				};
				Insert: {
					content?: Json | null;
					content_type: Database['public']['Enums']['tab_content_type'];
					content_url?: string | null;
					created_at?: string;
					id?: string;
					instrument: Database['public']['Enums']['instrument'];
					song_id: string;
				};
				Update: {
					content?: Json | null;
					content_type?: Database['public']['Enums']['tab_content_type'];
					content_url?: string | null;
					created_at?: string;
					id?: string;
					instrument?: Database['public']['Enums']['instrument'];
					song_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'song_tabs_song_id_fkey';
						columns: ['song_id'];
						isOneToOne: false;
						referencedRelation: 'songs';
						referencedColumns: ['id'];
					}
				];
			};
			songs: {
				Row: {
					artist: string | null;
					band_id: string;
					bpm: number | null;
					capo: number;
					created_at: string;
					id: string;
					original_key: string | null;
					preferred_key: string | null;
					source_url: string | null;
					title: string;
				};
				Insert: {
					artist?: string | null;
					band_id: string;
					bpm?: number | null;
					capo?: number;
					created_at?: string;
					id?: string;
					original_key?: string | null;
					preferred_key?: string | null;
					source_url?: string | null;
					title: string;
				};
				Update: {
					artist?: string | null;
					band_id?: string;
					bpm?: number | null;
					capo?: number;
					created_at?: string;
					id?: string;
					original_key?: string | null;
					preferred_key?: string | null;
					source_url?: string | null;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'songs_band_id_fkey';
						columns: ['band_id'];
						isOneToOne: false;
						referencedRelation: 'bands';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			create_band: { Args: { band_name: string }; Returns: string };
			import_song: {
				Args: {
					existing_song_id?: string;
					song_artist: string;
					song_bpm?: number;
					song_capo?: number;
					song_original_key: string;
					song_preferred_key?: string;
					song_source_url?: string;
					song_title: string;
					tab_content: Json;
					tab_instrument: Database['public']['Enums']['instrument'];
					target_band: string;
				};
				Returns: string;
			};
			invite_band_member: {
				Args: { member_email: string; target_band: string };
				Returns: string;
			};
			is_band_admin: { Args: { target_band: string }; Returns: boolean };
			is_band_member: { Args: { target_band: string }; Returns: boolean };
			reorder_setlist: {
				Args: { song_ids: string[]; target_setlist_id: string };
				Returns: undefined;
			};
		};
		Enums: {
			band_role: 'admin' | 'member';
			instrument: 'vocal' | 'guitar' | 'bass' | 'drums' | 'keys' | 'cifra';
			session_status: 'idle' | 'playing' | 'paused';
			suggestion_status: 'pending' | 'accepted' | 'dismissed';
			tab_content_type: 'ast' | 'pdf_url';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never) = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never) = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never) = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {}
	},
	public: {
		Enums: {
			band_role: ['admin', 'member'],
			instrument: ['vocal', 'guitar', 'bass', 'drums', 'keys', 'cifra'],
			session_status: ['idle', 'playing', 'paused'],
			suggestion_status: ['pending', 'accepted', 'dismissed'],
			tab_content_type: ['ast', 'pdf_url']
		}
	}
} as const;
