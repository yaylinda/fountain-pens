-- Named arrangements share the existing owner permissions and ink relationships.
-- The original arrangement becomes "My palette", retaining every saved position.
create table public.desk_palettes (
 owner_id uuid not null references private.collection_owner(user_id),
 id text not null default gen_random_uuid()::text,
 name text not null check (char_length(btrim(name)) between 1 and 80),
 created_at timestamptz not null default now(),
 primary key (owner_id,id)
);
alter table public.desk_palettes enable row level security;
alter table public.desk_palettes force row level security;
revoke all on public.desk_palettes from public,anon,authenticated;
grant select on public.desk_palettes to anon;
grant select,insert,update,delete on public.desk_palettes to authenticated;
create policy public_read on public.desk_palettes for select to anon,authenticated using (true);
create policy owner_write on public.desk_palettes for all to authenticated
 using (owner_id=(select auth.uid()) and (select private.is_owner()))
 with check (owner_id=(select auth.uid()) and (select private.is_owner()));

insert into public.desk_palettes(owner_id,id,name)
 select user_id,'default','My palette' from private.collection_owner;
alter table public.desk_palette add column palette_id text not null default 'default';
alter table public.desk_palette drop constraint desk_palette_pkey;
alter table public.desk_palette drop constraint desk_palette_owner_id_position_key;
alter table public.desk_palette add primary key (owner_id,palette_id,ink_id);
alter table public.desk_palette add unique (owner_id,palette_id,position);
alter table public.desk_palette add foreign key (owner_id,palette_id)
 references public.desk_palettes(owner_id,id) on delete cascade;

create function public.save_named_palette(p_id text,p_name text,p_items jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_palette_id text := coalesce(p_id,gen_random_uuid()::text);
begin
 if auth.uid() is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80
   or p_items is null or jsonb_typeof(p_items)<>'array' then
  raise exception 'validation' using errcode='22023';
 end if;
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
 if p_id is null or p_id='default' then
  insert into public.desk_palettes(owner_id,id,name) values(auth.uid(),v_palette_id,btrim(p_name))
   on conflict (owner_id,id) do nothing;
 end if;
 update public.desk_palettes p set name=btrim(p_name) where p.owner_id=auth.uid() and p.id=v_palette_id;
 if not found then raise exception 'missing palette' using errcode='P0002'; end if;
 delete from public.desk_palette c where c.owner_id=auth.uid() and c.palette_id=v_palette_id;
 insert into public.desk_palette(owner_id,palette_id,ink_id,position,omitted)
 select auth.uid(),v_palette_id,item->>'inkId',(ordinality-1)::integer,(item->>'omitted')::boolean
 from jsonb_array_elements(p_items) with ordinality as items(item,ordinality);
 return jsonb_build_object('palette',jsonb_build_object('id',v_palette_id,'name',btrim(p_name),'items',p_items));
end $$;
revoke all on function public.save_named_palette(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_named_palette(text,text,jsonb) to authenticated;

create function public.delete_named_palette(p_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 delete from public.desk_palettes where owner_id=auth.uid() and id=p_id;
 if not found then raise exception 'missing palette' using errcode='P0002'; end if;
 return jsonb_build_object('deletedId',p_id);
end $$;
revoke all on function public.delete_named_palette(text) from public,anon,authenticated;
grant execute on function public.delete_named_palette(text) to authenticated;

-- Older clients can still read and save the original arrangement.
create or replace function public.save_desk_palette(p_items jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 perform public.save_named_palette('default',coalesce((select name from public.desk_palettes
  where owner_id=auth.uid() and id='default'),'My palette'),p_items);
 return jsonb_build_object('items',p_items);
end $$;

create or replace function public.get_collection() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 return jsonb_build_object(
  'palette',coalesce((select jsonb_agg(jsonb_build_object('inkId',ink_id,'omitted',omitted) order by position) from public.desk_palette where palette_id='default'),'[]'::jsonb),
  'palettes',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'items',coalesce((select jsonb_agg(jsonb_build_object('inkId',c.ink_id,'omitted',c.omitted) order by c.position) from public.desk_palette c where c.owner_id=p.owner_id and c.palette_id=p.id),'[]'::jsonb)) order by p.created_at,p.id) from public.desk_palettes p),'[]'::jsonb),
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
