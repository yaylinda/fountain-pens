-- Atomic refill + ordered ink links + current queue effect. Owner RLS applies.
create function private.mutate_refill_event(
 p_action text,p_event_id text,p_entry jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_owner uuid := auth.uid();
 event public.refill_events; pen public.pens; answer jsonb;
 v_date date; v_today date; v_latest date; v_kind text; v_inks text[]; v_queue boolean;
begin
 if v_owner is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action is null or p_action not in ('create','update','delete') then
  raise exception 'validation' using errcode='22023';
 end if;
 if p_action<>'create' and (p_event_id is null or p_event_id='') then raise exception 'validation' using errcode='22023'; end if;
 if p_action='delete' then
  if p_entry is distinct from '{}'::jsonb then raise exception 'validation' using errcode='22023'; end if;
 else
  if p_entry is null or jsonb_typeof(p_entry)<>'object' then raise exception 'validation' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_entry) k where k not in ('penId','date','kind','inkIds','notes','notPure','queueAfterCleaning')) or
    not (p_entry ?& array['penId','date','kind','inkIds','notes','notPure']) or
    jsonb_typeof(p_entry->'penId')<>'string' or p_entry->>'penId'='' or
    jsonb_typeof(p_entry->'date')<>'string' or (p_entry->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or
    jsonb_typeof(p_entry->'kind')<>'string' or p_entry->>'kind' not in ('refill','cleaning') or
    jsonb_typeof(p_entry->'inkIds')<>'array' or jsonb_typeof(p_entry->'notes')<>'string' or
    jsonb_typeof(p_entry->'notPure')<>'boolean' then raise exception 'validation' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_entry->'inkIds') x where jsonb_typeof(x)<>'string' or x#>>'{}' in ('','NONE')) then
   raise exception 'validation' using errcode='22023';
  end if;
  select coalesce(array_agg(value order by ord),array[]::text[]) into v_inks from jsonb_array_elements_text(p_entry->'inkIds') with ordinality as x(value,ord);
  if cardinality(v_inks)<>(select count(distinct x) from unnest(v_inks) x) then raise exception 'validation' using errcode='22023'; end if;
  v_kind:=p_entry->>'kind';
  if (v_kind='refill' and cardinality(v_inks)=0) or
     (v_kind='cleaning' and (cardinality(v_inks)>0 or (p_entry->>'notPure')::boolean)) then raise exception 'validation' using errcode='22023'; end if;
  if p_entry ? 'queueAfterCleaning' and (p_action<>'create' or v_kind<>'cleaning' or jsonb_typeof(p_entry->'queueAfterCleaning')<>'boolean') then
   raise exception 'validation' using errcode='22023';
  end if;
  begin v_date:=(p_entry->>'date')::date;
  exception when datetime_field_overflow or invalid_datetime_format then raise exception 'validation' using errcode='22023'; end;
 end if;
 if p_action<>'create' then
  select * into event from public.refill_events where id=p_event_id and owner_id=v_owner;
  if not found then raise exception 'not found' using errcode='P0002'; end if;
 end if;
 if p_action='delete' then
  delete from public.refill_events where id=event.id and owner_id=v_owner;
  answer:=jsonb_build_object('deletedId',event.id);
 else
  v_today := (now() at time zone 'America/Chicago')::date;
  if v_date>v_today then raise exception 'future date' using errcode='22023'; end if;
  select * into pen from public.pens where id=p_entry->>'penId' and owner_id=v_owner;
  if not found then raise exception 'not found' using errcode='P0002'; end if;
  if (select count(*) from public.inks where owner_id=v_owner and id=any(v_inks))<>cardinality(v_inks) then
   raise exception 'unknown ink' using errcode='22023';
  end if;
  if p_action='create' then
   select occurred_on into v_latest from public.refill_events where owner_id=v_owner and pen_id=pen.id and occurred_on<=v_today order by occurred_on desc,sequence desc limit 1;
   insert into public.refill_events(owner_id,pen_id,occurred_on,kind,notes,not_pure)
    values(v_owner,pen.id,v_date,v_kind,p_entry->>'notes',(p_entry->>'notPure')::boolean) returning * into event;
   if v_latest is null or v_date>=v_latest then
    v_queue:=case when v_kind='refill' then false else coalesce((p_entry->>'queueAfterCleaning')::boolean,pen.needs_refill) end;
    if pen.needs_refill<>v_queue then
     update public.pens set needs_refill=v_queue,updated_at=now() where id=pen.id and owner_id=v_owner returning * into pen;
    end if;
   end if;
  else
   -- Editing history leaves today’s queue intent untouched.
   update public.refill_events set pen_id=pen.id,occurred_on=v_date,kind=v_kind,notes=p_entry->>'notes',not_pure=(p_entry->>'notPure')::boolean,
    updated_at=now() where id=event.id and owner_id=v_owner returning * into event;
   delete from public.refill_event_inks where event_id=event.id and owner_id=v_owner;
  end if;
  insert into public.refill_event_inks(owner_id,event_id,ink_id,position)
   select v_owner,event.id,ink_id,ord-1 from unnest(v_inks) with ordinality as x(ink_id,ord);
  set constraints public.event_links_valid immediate;
  answer:=jsonb_build_object('event',jsonb_build_object('id',event.id,'sequence',event.sequence::text,
   'penId',event.pen_id,'date',event.occurred_on::text,'kind',event.kind,'inkIds',to_jsonb(v_inks),'notes',event.notes,'notPure',event.not_pure),
   'pen',jsonb_build_object('id',pen.id,'needsRefill',pen.needs_refill));
 end if;
 return answer;
end $$;
revoke all on function private.mutate_refill_event(text,text,jsonb) from public,anon,authenticated;
grant execute on function private.mutate_refill_event(text,text,jsonb) to authenticated;
create function public.create_refill_event(p_entry jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_refill_event('create',null,p_entry)
$$;
create function public.update_refill_event(p_event_id text,p_entry jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_refill_event('update',p_event_id,p_entry)
$$;
create function public.delete_refill_event(p_event_id text) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_refill_event('delete',p_event_id,'{}'::jsonb)
$$;
revoke all on function public.create_refill_event(jsonb),public.update_refill_event(text,jsonb),public.delete_refill_event(text) from public,anon,authenticated;
grant execute on function public.create_refill_event(jsonb),public.update_refill_event(text,jsonb),public.delete_refill_event(text) to authenticated;
