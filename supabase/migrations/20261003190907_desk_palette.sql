-- One owner-managed arrangement, independent of refill history and active status.
create table public.desk_palette (
 owner_id uuid not null references private.collection_owner(user_id),
 ink_id text not null,
 position integer not null check (position >= 0),
 omitted boolean not null default false,
 primary key (owner_id, ink_id),
 unique (owner_id, position),
 foreign key (owner_id, ink_id) references public.inks(owner_id,id) on delete cascade
);
alter table public.desk_palette enable row level security;
alter table public.desk_palette force row level security;
revoke all on public.desk_palette from public,anon,authenticated;
grant select on public.desk_palette to anon;
grant select,insert,update,delete on public.desk_palette to authenticated;
create policy public_read on public.desk_palette for select to anon,authenticated using (true);
create policy owner_write on public.desk_palette for all to authenticated
 using (owner_id=(select auth.uid()) and (select private.is_owner()))
 with check (owner_id=(select auth.uid()) and (select private.is_owner()));

create function public.save_desk_palette(p_items jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'validation' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) item
   where jsonb_typeof(item)<>'object' or jsonb_typeof(item->'inkId') is distinct from 'string'
   or jsonb_typeof(item->'omitted') is distinct from 'boolean') then
  raise exception 'validation' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(p_items) item
   where not exists(select 1 from public.inks i where i.id=item->>'inkId' and i.owner_id=auth.uid()))
   or (select count(*) from jsonb_array_elements(p_items)) <>
      (select count(distinct item->>'inkId') from jsonb_array_elements(p_items) item) then
  raise exception 'validation' using errcode='22023';
 end if;
 delete from public.desk_palette where owner_id=auth.uid();
 insert into public.desk_palette(owner_id,ink_id,position,omitted)
 select auth.uid(),item->>'inkId',(ordinality-1)::integer,(item->>'omitted')::boolean
 from jsonb_array_elements(p_items) with ordinality as items(item,ordinality);
 return jsonb_build_object('items',p_items);
end $$;
revoke all on function public.save_desk_palette(jsonb) from public,anon,authenticated;
grant execute on function public.save_desk_palette(jsonb) to authenticated;

create or replace function public.get_collection() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 return jsonb_build_object(
  'palette',coalesce((select jsonb_agg(jsonb_build_object('inkId',ink_id,'omitted',omitted) order by position) from public.desk_palette),'[]'::jsonb),
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
