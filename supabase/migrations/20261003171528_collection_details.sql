-- Optional details live with inventory and inherit its existing owner/RLS rules.
-- Ordered source links retain field-level provenance (supports) where supplied.
create function private.valid_source_links(links jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare link jsonb;
begin
 if jsonb_typeof(links) is distinct from 'array' then return false; end if;
 for link in select value from jsonb_array_elements(links) loop
  if jsonb_typeof(link) is distinct from 'object' or
     jsonb_typeof(link->'label') is distinct from 'string' or btrim(link->>'label')='' or
     jsonb_typeof(link->'url') is distinct from 'string' or (link->>'url') !~* '^https?://[^[:space:]]+$' or
     exists(select 1 from jsonb_object_keys(link) k where k not in ('label','url','supports')) then return false; end if;
  if link ? 'supports' then
   if jsonb_typeof(link->'supports') is distinct from 'array' then return false; end if;
   if exists(select 1 from jsonb_array_elements(link->'supports') v where jsonb_typeof(v)<>'string') then return false; end if;
  end if;
 end loop;
 return true;
end $$;
revoke all on function private.valid_source_links(jsonb) from public;
grant execute on function private.valid_source_links(jsonb) to anon,authenticated;
alter table public.pens
 add column details text not null default '',
 add column sources jsonb not null default '[]' check (private.valid_source_links(sources));
alter table public.inks
 add column details text not null default '',
 add column sources jsonb not null default '[]' check (private.valid_source_links(sources)),
 add column reference jsonb check (jsonb_typeof(reference)='object'),
 add column swatch_reference jsonb check (jsonb_typeof(swatch_reference)='object');
comment on column public.inks.reference is 'Typed manufacturer reference, excluding editable description and sources. Original inkId/name are provenance, not runtime join keys.';
comment on column public.inks.swatch_reference is 'Historical InkSwatch reference matched once to the inventory ID; preserves name, hex, URL and note independently of custom color.';

create or replace function public.get_collection() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 return jsonb_build_object(
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

-- Straightforward owner-authorized inventory CRUD.
create or replace function private.mutate_inventory(p_kind text,p_action text,p_id text,p_item jsonb)
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
  if not (p_item ?& fields) or exists(select 1 from jsonb_object_keys(p_item) k where not k=any(fields || array['details','sources'])) then raise exception 'validation' using errcode='22023'; end if;
  if exists(select 1 from unnest(fields) f where jsonb_typeof(p_item->f) is distinct from
    case when f in ('archived','favorite','needsRefill') then 'boolean' when f='colorHex' and p_item->f='null'::jsonb then 'null' else 'string' end) then raise exception 'validation' using errcode='22023'; end if;
  if (p_item ? 'details' and jsonb_typeof(p_item->'details') is distinct from 'string') or
     (p_item ? 'sources' and not private.valid_source_links(p_item->'sources')) then raise exception 'validation' using errcode='22023'; end if;
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
   insert into public.pens(owner_id,brand,model,color,nib_size,nib_type,archived,favorite,needs_refill,details,sources)
    values(v_owner,p_item->>'brand',p_item->>'model',p_item->>'color',p_item->>'nibSize',p_item->>'nibType',(p_item->>'archived')::boolean,(p_item->>'favorite')::boolean,(p_item->>'needsRefill')::boolean,coalesce(p_item->>'details',''),coalesce(p_item->'sources','[]'::jsonb)) returning * into pen;
  else
   update public.pens set brand=p_item->>'brand',model=p_item->>'model',color=p_item->>'color',nib_size=p_item->>'nibSize',nib_type=p_item->>'nibType',archived=(p_item->>'archived')::boolean,favorite=(p_item->>'favorite')::boolean,needs_refill=(p_item->>'needsRefill')::boolean,details=coalesce(p_item->>'details',details),sources=coalesce(p_item->'sources',sources),updated_at=now() where id=p_id and owner_id=v_owner returning * into pen;
  end if;
  answer:=jsonb_build_object('item',jsonb_build_object('id',pen.id,'brand',pen.brand,'model',pen.model,'color',pen.color,'nibSize',pen.nib_size,'nibType',pen.nib_type,'archived',pen.archived,'favorite',pen.favorite,'needsRefill',pen.needs_refill,'details',pen.details,'sources',pen.sources));
 else
  if p_action<>'create' then
   select * into ink from public.inks where id=p_id and owner_id=v_owner;
   if not found then raise exception 'not found' using errcode='P0002'; end if;
  end if;
  if p_action='delete' then
   delete from public.inks where id=p_id and owner_id=v_owner;
  elsif p_action='create' then
   insert into public.inks(owner_id,brand,collection,name,color_hex,archived,favorite,details,sources)
    values(v_owner,p_item->>'brand',p_item->>'collection',p_item->>'name',p_item->>'colorHex',(p_item->>'archived')::boolean,(p_item->>'favorite')::boolean,coalesce(p_item->>'details',''),coalesce(p_item->'sources','[]'::jsonb)) returning * into ink;
  else
   update public.inks set brand=p_item->>'brand',collection=p_item->>'collection',name=p_item->>'name',color_hex=p_item->>'colorHex',archived=(p_item->>'archived')::boolean,favorite=(p_item->>'favorite')::boolean,details=coalesce(p_item->>'details',details),sources=coalesce(p_item->'sources',sources),updated_at=now() where id=p_id and owner_id=v_owner returning * into ink;
  end if;
  answer:=jsonb_build_object('item',jsonb_build_object('id',ink.id,'brand',ink.brand,'collection',ink.collection,'name',ink.name,'colorHex',ink.color_hex,'archived',ink.archived,'favorite',ink.favorite,'details',ink.details,'sources',ink.sources,'reference',ink.reference,'swatchReference',ink.swatch_reference));
 end if;
 if p_action='delete' then answer:=jsonb_build_object('deletedId',p_id); end if;
 return answer;
end $$;
revoke all on function private.mutate_inventory(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.mutate_inventory(text,text,text,jsonb) to authenticated;
