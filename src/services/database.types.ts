/** Reviewed RPC contract for the shipped migrations. This is not generated from
 * a hosted project. Regenerate/compare with provider types during cloud rehearsal.
 * Bigints deliberately cross this JSON boundary as decimal strings. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Request = { p_request_id: string };
type Target = { p_id: string; p_expected_version: string };
type EventTarget = { p_event_id: string; p_expected_version: string };
type Rpc<Args> = { Args: Args; Returns: Json };
export interface Database {
    public: {
        Tables: Record<string, never>;
        Views: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
        Functions: {
            get_collection: Rpc<Record<string, never>>;
            create_pen: Rpc<Request & { p_item: Json }>;
            update_pen: Rpc<Request & Target & { p_item: Json }>;
            delete_pen: Rpc<Request & Target>;
            create_ink: Rpc<Request & { p_item: Json }>;
            update_ink: Rpc<Request & Target & { p_item: Json }>;
            delete_ink: Rpc<Request & Target>;
            create_refill_event: Rpc<Request & { p_entry: Json }>;
            update_refill_event: Rpc<Request & EventTarget & { p_entry: Json }>;
            delete_refill_event: Rpc<Request & EventTarget>;
            set_pen_queue: Rpc<Request & { p_pen_id: string; p_expected_version: string; p_needs_refill: boolean }>;
        };
    };
}
export type MutationName = Exclude<keyof Database['public']['Functions'], 'get_collection'>;
export type MutationPayload = { [K in MutationName]: Omit<Database['public']['Functions'][K]['Args'], 'p_request_id'> }[MutationName];
