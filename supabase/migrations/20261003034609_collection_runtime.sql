-- Public collection viewing is intentional, including displayed journal notes.
-- The owner allowlist still gates every write command. The helper exposes only
-- a boolean capability; anonymous users gain no private table or command access.
grant usage on schema private to anon;
grant execute on function private.is_owner() to anon;
grant select on public.pens,public.inks,public.refill_events,public.refill_event_inks to anon;
create policy public_read on public.pens for select to anon,authenticated using (true);
create policy public_read on public.inks for select to anon,authenticated using (true);
create policy public_read on public.refill_events for select to anon,authenticated using (true);
create policy public_read on public.refill_event_inks for select to anon,authenticated using (true);

-- One MVCC snapshot, one JSON result: no PostgREST row-limit truncation or torn joins.
create function public.get_collection() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 return jsonb_build_object(
  'canEdit',private.is_owner(),
  'asOf',(now() at time zone 'America/Chicago')::date::text,
  'pens',coalesce((select jsonb_agg(jsonb_build_object('id',id,'brand',brand,'model',model,'color',color,'nibSize',nib_size,'nibType',nib_type,'archived',archived,'favorite',favorite,'needsRefill',needs_refill) order by id) from public.pens),'[]'::jsonb),
  'inks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'brand',brand,'collection',collection,'name',name,'colorHex',color_hex,'archived',archived,'favorite',favorite) order by id) from public.inks),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'sequence',e.sequence::text,'penId',e.pen_id,'date',e.occurred_on::text,'kind',e.kind,'notes',e.notes,'notPure',e.not_pure,
   'inkIds',coalesce((select jsonb_agg(l.ink_id order by l.position) from public.refill_event_inks l where l.event_id=e.id),'[]'::jsonb)) order by e.sequence) from public.refill_events e),'[]'::jsonb)
 );
end $$;
revoke all on function public.get_collection() from public,anon,authenticated;
grant execute on function public.get_collection() to anon,authenticated;

-- Straightforward owner-authorized inventory CRUD.
create function private.mutate_inventory(p_kind text,p_action text,p_id text,p_item jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_owner uuid:=auth.uid(); pen public.pens; ink public.inks; answer jsonb; fields text[];
begin
 if v_owner is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('pen','ink') or p_action is null or p_action not in ('create','update','delete') then raise exception 'validation' using errcode='22023'; end if;
 if p_action<>'create' and (p_id is null or p_id='') then raise exception 'validation' using errcode='22023'; end if;
 if p_action='delete' then
  if p_item is distinct from '{}'::jsonb then raise exception 'validation' using errcode='22023'; end if;
 else
  fields:=case when p_kind='pen' then array['brand','model','color','nibSize','nibType','archived','favorite','needsRefill'] else array['brand','collection','name','colorHex','archived','favorite'] end;
  if p_item is null or jsonb_typeof(p_item)<>'object' then raise exception 'validation' using errcode='22023'; end if;
  if not (p_item ?& fields) or exists(select 1 from jsonb_object_keys(p_item) k where not k=any(fields)) then raise exception 'validation' using errcode='22023'; end if;
  if exists(select 1 from unnest(fields) f where jsonb_typeof(p_item->f) is distinct from
    case when f in ('archived','favorite','needsRefill') then 'boolean' when f='colorHex' and p_item->f='null'::jsonb then 'null' else 'string' end) then raise exception 'validation' using errcode='22023'; end if;
  if btrim(p_item->>'brand')='' or btrim(p_item->>(case when p_kind='pen' then 'model' else 'name' end))='' or
    (p_kind='ink' and p_item->>'colorHex' is not null and (p_item->>'colorHex') !~ '^#[0-9A-Fa-f]{6}$') then raise exception 'validation' using errcode='22023'; end if;
 end if;
 if p_kind='pen' then
  if p_action<>'create' then
   select * into pen from public.pens where id=p_id and owner_id=v_owner;
   if not found then raise exception 'not found' using errcode='P0002'; end if;
  end if;
  if p_action='delete' then
   delete from public.pens where id=p_id and owner_id=v_owner;
  elsif p_action='create' then
   insert into public.pens(owner_id,brand,model,color,nib_size,nib_type,archived,favorite,needs_refill)
    values(v_owner,p_item->>'brand',p_item->>'model',p_item->>'color',p_item->>'nibSize',p_item->>'nibType',(p_item->>'archived')::boolean,(p_item->>'favorite')::boolean,(p_item->>'needsRefill')::boolean) returning * into pen;
  else
   update public.pens set brand=p_item->>'brand',model=p_item->>'model',color=p_item->>'color',nib_size=p_item->>'nibSize',nib_type=p_item->>'nibType',archived=(p_item->>'archived')::boolean,favorite=(p_item->>'favorite')::boolean,needs_refill=(p_item->>'needsRefill')::boolean,updated_at=now() where id=p_id and owner_id=v_owner returning * into pen;
  end if;
  answer:=jsonb_build_object('item',jsonb_build_object('id',pen.id,'brand',pen.brand,'model',pen.model,'color',pen.color,'nibSize',pen.nib_size,'nibType',pen.nib_type,'archived',pen.archived,'favorite',pen.favorite,'needsRefill',pen.needs_refill));
 else
  if p_action<>'create' then
   select * into ink from public.inks where id=p_id and owner_id=v_owner;
   if not found then raise exception 'not found' using errcode='P0002'; end if;
  end if;
  if p_action='delete' then
   delete from public.inks where id=p_id and owner_id=v_owner;
  elsif p_action='create' then
   insert into public.inks(owner_id,brand,collection,name,color_hex,archived,favorite)
    values(v_owner,p_item->>'brand',p_item->>'collection',p_item->>'name',p_item->>'colorHex',(p_item->>'archived')::boolean,(p_item->>'favorite')::boolean) returning * into ink;
  else
   update public.inks set brand=p_item->>'brand',collection=p_item->>'collection',name=p_item->>'name',color_hex=p_item->>'colorHex',archived=(p_item->>'archived')::boolean,favorite=(p_item->>'favorite')::boolean,updated_at=now() where id=p_id and owner_id=v_owner returning * into ink;
  end if;
  answer:=jsonb_build_object('item',jsonb_build_object('id',ink.id,'brand',ink.brand,'collection',ink.collection,'name',ink.name,'colorHex',ink.color_hex,'archived',ink.archived,'favorite',ink.favorite));
 end if;
 if p_action='delete' then answer:=jsonb_build_object('deletedId',p_id); end if;
 return answer;
end $$;
revoke all on function private.mutate_inventory(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.mutate_inventory(text,text,text,jsonb) to authenticated;
create function public.create_pen(p_item jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_inventory('pen','create',null,p_item)
$$;
revoke all on function public.create_pen(jsonb) from public,anon,authenticated;
grant execute on function public.create_pen(jsonb) to authenticated;
create function public.update_pen(p_id text,p_item jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_inventory('pen','update',p_id,p_item)
$$;
revoke all on function public.update_pen(text,jsonb) from public,anon,authenticated;
grant execute on function public.update_pen(text,jsonb) to authenticated;
create function public.delete_pen(p_id text) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_inventory('pen','delete',p_id,'{}'::jsonb)
$$;
revoke all on function public.delete_pen(text) from public,anon,authenticated;
grant execute on function public.delete_pen(text) to authenticated;
create function public.create_ink(p_item jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_inventory('ink','create',null,p_item)
$$;
revoke all on function public.create_ink(jsonb) from public,anon,authenticated;
grant execute on function public.create_ink(jsonb) to authenticated;
create function public.update_ink(p_id text,p_item jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_inventory('ink','update',p_id,p_item)
$$;
revoke all on function public.update_ink(text,jsonb) from public,anon,authenticated;
grant execute on function public.update_ink(text,jsonb) to authenticated;
create function public.delete_ink(p_id text) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_inventory('ink','delete',p_id,'{}'::jsonb)
$$;
revoke all on function public.delete_ink(text) from public,anon,authenticated;
grant execute on function public.delete_ink(text) to authenticated;
