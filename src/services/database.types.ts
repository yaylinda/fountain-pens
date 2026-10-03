/** Reviewed RPC contract for the shipped migrations. This is not generated from
 * a hosted project. Regenerate/compare with provider types during cloud rehearsal.
 * Event ordering sequences cross the JSON boundary as decimal strings. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Target = { p_id: string };
type EventTarget = { p_event_id: string };
type Rpc<Args> = { Args: Args; Returns: Json };
export interface Database {
    public: {
        Tables: Record<string, never>;
        Views: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
        Functions: {
            get_collection: Rpc<Record<string, never>>;
            create_pen: Rpc<{ p_item: Json }>;
            update_pen: Rpc<Target & { p_item: Json }>;
            delete_pen: Rpc<Target>;
            create_ink: Rpc<{ p_item: Json }>;
            update_ink: Rpc<Target & { p_item: Json }>;
            delete_ink: Rpc<Target>;
            create_refill_event: Rpc<{ p_entry: Json }>;
            update_refill_event: Rpc<EventTarget & { p_entry: Json }>;
            delete_refill_event: Rpc<EventTarget>;
        };
    };
}
export type MutationName = Exclude<keyof Database['public']['Functions'], 'get_collection'>;
export type MutationPayload = { [K in MutationName]: Database['public']['Functions'][K]['Args'] }[MutationName];
