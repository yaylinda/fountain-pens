-- Writing is explicitly recorded, never inferred from a refill.
create table public.writing_logs (
 id text primary key default gen_random_uuid()::text,
 owner_id uuid not null references private.collection_owner(user_id) on delete restrict,
 refill_id text not null,
 written_on date not null,
 created_at timestamptz not null default now(),
 foreign key (owner_id,refill_id) references public.refill_events(owner_id,id) on delete restrict,
 unique (owner_id,refill_id,written_on)
);
alter table public.writing_logs enable row level security;
alter table public.writing_logs force row level security;
revoke all on public.writing_logs from public,anon,authenticated;
grant select on public.writing_logs to anon;
grant select,insert,update,delete on public.writing_logs to authenticated;
create policy public_read on public.writing_logs for select to anon,authenticated using (true);
create policy owner_write on public.writing_logs for all to authenticated
 using (owner_id=(select auth.uid()) and (select private.is_owner()))
 with check (owner_id=(select auth.uid()) and (select private.is_owner()));

-- Preserve valid history even when a refill is corrected through its existing RPC.
create function private.check_writing_dates() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='writing_logs' then
  if new.written_on > (now() at time zone 'America/Chicago')::date or not exists (
   select 1 from public.refill_events e where e.id=new.refill_id and e.owner_id=new.owner_id
    and e.kind='refill' and e.occurred_on<=new.written_on
  ) then raise exception 'invalid writing date or refill' using errcode='23514'; end if;
 else
  if exists(select 1 from public.writing_logs w where w.refill_id=new.id
   and (new.kind<>'refill' or w.written_on<new.occurred_on)) then
   raise exception 'refill has writing history' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.check_writing_dates() from public,anon,authenticated;
create trigger writing_dates before insert or update on public.writing_logs for each row execute function private.check_writing_dates();
create trigger writing_dates before update on public.refill_events for each row execute function private.check_writing_dates();

create function public.save_writing_log(p_id text,p_refill_id text,p_written_on date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v public.writing_logs;
begin
 if auth.uid() is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_refill_id is null or p_written_on is null then raise exception 'validation' using errcode='22023'; end if;
 if p_id is null then
  insert into public.writing_logs(owner_id,refill_id,written_on) values(auth.uid(),p_refill_id,p_written_on)
   on conflict (owner_id,refill_id,written_on) do update set written_on=excluded.written_on returning * into v;
 else
  update public.writing_logs set refill_id=p_refill_id,written_on=p_written_on
   where id=p_id and owner_id=auth.uid() returning * into v;
  if not found then raise exception 'missing writing log' using errcode='P0002'; end if;
 end if;
 return jsonb_build_object('item',jsonb_build_object('id',v.id,'refillId',v.refill_id,'writtenOn',v.written_on::text));
end $$;
create function public.delete_writing_log(p_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 delete from public.writing_logs where id=p_id and owner_id=auth.uid();
 if not found then raise exception 'missing writing log' using errcode='P0002'; end if;
 return jsonb_build_object('deletedId',p_id);
end $$;
revoke all on function public.save_writing_log(text,text,date),public.delete_writing_log(text) from public,anon,authenticated;
grant execute on function public.save_writing_log(text,text,date),public.delete_writing_log(text) to authenticated;

create or replace function public.get_collection() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 return jsonb_build_object(
  'palette',coalesce((select jsonb_agg(jsonb_build_object('inkId',ink_id,'omitted',omitted) order by position) from public.desk_palette where palette_id='default'),'[]'::jsonb),
  'palettes',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'items',coalesce((select jsonb_agg(jsonb_build_object('inkId',c.ink_id,'omitted',c.omitted) order by c.position) from public.desk_palette c where c.owner_id=p.owner_id and c.palette_id=p.id),'[]'::jsonb)) order by p.created_at,p.id) from public.desk_palettes p),'[]'::jsonb),
  'writingLogs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'refillId',refill_id,'writtenOn',written_on::text) order by written_on desc,id) from public.writing_logs),'[]'::jsonb),
  'canEdit',private.is_owner(),
  'asOf',(now() at time zone 'America/Chicago')::date::text,
  'pens',coalesce((select jsonb_agg(jsonb_build_object('id',id,'brand',brand,'model',model,'color',color,'nibSize',nib_size,'nibType',nib_type,'archived',archived,'favorite',favorite,'needsRefill',needs_refill,'details',details,'sources',sources) order by id) from public.pens),'[]'::jsonb),
  'inks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'brand',brand,'collection',collection,'name',name,'colorHex',color_hex,'archived',archived,'favorite',favorite,'details',details,'sources',sources,'reference',reference,'swatchReference',swatch_reference) order by id) from public.inks),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'sequence',e.sequence::text,'penId',e.pen_id,'date',e.occurred_on::text,'kind',e.kind,'notes',e.notes,'notPure',e.not_pure,
   'inkIds',coalesce((select jsonb_agg(l.ink_id order by l.position) from public.refill_event_inks l where l.event_id=e.id),'[]'::jsonb)) order by e.sequence) from public.refill_events e),'[]'::jsonb)
 );
end $$;
revoke all on function public.get_collection() from public,anon,authenticated;
grant execute on function public.get_collection() to anon,authenticated;
