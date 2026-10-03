-- Full replacement of one journal entry, not a generic table writer.
grant insert,update,delete on public.refill_events,public.refill_event_inks to collection_writer;
grant usage on sequence public.refill_events_sequence_seq to collection_writer;
create policy owner_events_write on public.refill_events for all to collection_writer
 using (owner_id=(select auth.uid()) and (select private.is_owner()))
 with check (owner_id=(select auth.uid()) and (select private.is_owner()));
create policy owner_links_write on public.refill_event_inks for all to collection_writer
 using (owner_id=(select auth.uid()) and (select private.is_owner()))
 with check (owner_id=(select auth.uid()) and (select private.is_owner()));

create function private.mutate_refill_event(
 p_action text,p_request_id uuid,p_event_id text,p_expected_version bigint,p_entry jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_owner uuid := auth.uid(); v_hash text; receipt private.mutation_receipts;
 event public.refill_events; pen public.pens; answer jsonb;
 v_date date; v_today date; v_latest date; v_kind text; v_inks text[]; v_queue boolean;
begin
 if v_owner is null or not private.is_owner() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action is null or p_action not in ('create','update','delete') or p_request_id is null then
  raise exception 'validation' using errcode='22023';
 end if;
 if (p_action='create' and (p_event_id is not null or p_expected_version is not null)) or
    (p_action<>'create' and (p_event_id is null or p_event_id='' or p_expected_version is null or p_expected_version<1)) then
  raise exception 'validation' using errcode='22023';
 end if;
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
 perform pg_catalog.pg_advisory_xact_lock(17012026,1);
 v_hash:=encode(sha256(convert_to(jsonb_build_array('refill/v1',p_action,p_event_id,p_expected_version::text,p_entry)::text,'UTF8')),'hex');
 select * into receipt from private.mutation_receipts where owner_id=v_owner and request_id=p_request_id;
 if found then
  if receipt.command<>'refill/v1' or receipt.payload_sha256<>v_hash then raise exception 'request conflict' using errcode='40001'; end if;
  return receipt.result;
 end if;
 if p_action<>'create' then
  select * into event from public.refill_events where id=p_event_id and owner_id=v_owner for update;
  if not found then raise exception 'not found' using errcode='P0002'; end if;
  if event.version<>p_expected_version then raise exception 'version conflict' using errcode='40001'; end if;
 end if;
 if p_action='delete' then
  delete from public.refill_events where id=event.id and owner_id=v_owner;
  answer:=jsonb_build_object('deletedId',event.id);
 else
  select (now() at time zone time_zone)::date into v_today from private.collection_owner where user_id=v_owner;
  if v_date>v_today then raise exception 'future date' using errcode='22023'; end if;
  select * into pen from public.pens where id=p_entry->>'penId' and owner_id=v_owner for update;
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
     update public.pens set needs_refill=v_queue,version=version+1,updated_at=now() where id=pen.id and owner_id=v_owner returning * into pen;
    end if;
   end if;
  else
   -- Every accepted replacement advances once, even identical data; queue intent stays untouched.
   update public.refill_events set pen_id=pen.id,occurred_on=v_date,kind=v_kind,notes=p_entry->>'notes',not_pure=(p_entry->>'notPure')::boolean,
    version=version+1,updated_at=now() where id=event.id and owner_id=v_owner returning * into event;
   delete from public.refill_event_inks where event_id=event.id and owner_id=v_owner;
  end if;
  insert into public.refill_event_inks(owner_id,event_id,ink_id,position)
   select v_owner,event.id,ink_id,ord-1 from unnest(v_inks) with ordinality as x(ink_id,ord);
  set constraints public.event_links_valid immediate;
  answer:=jsonb_build_object('event',jsonb_build_object('id',event.id,'version',event.version::text,'sequence',event.sequence::text,
   'penId',event.pen_id,'date',event.occurred_on::text,'kind',event.kind,'inkIds',to_jsonb(v_inks),'notes',event.notes,'notPure',event.not_pure),
   'pen',jsonb_build_object('id',pen.id,'version',pen.version::text,'needsRefill',pen.needs_refill));
 end if;
 insert into private.mutation_receipts(owner_id,request_id,command,payload_sha256,result) values(v_owner,p_request_id,'refill/v1',v_hash,answer);
 return answer;
end $$;
alter function private.mutate_refill_event(text,uuid,text,bigint,jsonb) owner to collection_writer;
revoke all on function private.mutate_refill_event(text,uuid,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function private.mutate_refill_event(text,uuid,text,bigint,jsonb) to authenticated;
create function public.create_refill_event(p_request_id uuid,p_entry jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_refill_event('create',p_request_id,null,null,p_entry)
$$;
create function public.update_refill_event(p_request_id uuid,p_event_id text,p_expected_version bigint,p_entry jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_refill_event('update',p_request_id,p_event_id,p_expected_version,p_entry)
$$;
create function public.delete_refill_event(p_request_id uuid,p_event_id text,p_expected_version bigint) returns jsonb language sql security invoker set search_path='' as $$
 select private.mutate_refill_event('delete',p_request_id,p_event_id,p_expected_version,'{}'::jsonb)
$$;
revoke all on function public.create_refill_event(uuid,jsonb),public.update_refill_event(uuid,text,bigint,jsonb),public.delete_refill_event(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.create_refill_event(uuid,jsonb),public.update_refill_event(uuid,text,bigint,jsonb),public.delete_refill_event(uuid,text,bigint) to authenticated;
