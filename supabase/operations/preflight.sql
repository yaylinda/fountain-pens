-- Read-only. Run only on the explicitly approved project. No user data returned.
select current_user, version(),
 (select count(*) from auth.users) as auth_users,
 (select count(*) from pg_tables where schemaname='public') as public_tables,
 to_regprocedure('auth.uid()')::text as auth_uid,
 has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') as can_grant_auth_usage,
 has_function_privilege(current_user,'auth.uid()','EXECUTE WITH GRANT OPTION') as can_grant_auth_uid,
 has_table_privilege(current_user,'auth.users','REFERENCES') as can_reference_auth_users,
 (select jsonb_agg(jsonb_build_object('role',rolname,'superuser',rolsuper,'createrole',rolcreaterole,'bypassrls',rolbypassrls))
  from pg_roles where rolname in ('postgres','anon','authenticated','service_role','collection_writer')) as roles;
