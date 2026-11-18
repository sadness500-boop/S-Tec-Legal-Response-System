-- =====================================================================
--  Legal Response System(법률 대응 시스템) — 프로그램별 권한에 'stlr' 추가
--  Designed & Developed by Rat Rae Choi
--
--  ● 어디에 실행하나요?  통합 로그인 Supabase 프로젝트(mnsuebexlzhvomxhrear) → SQL Editor → 이 파일 전체 붙여넣기 → Run (한 번만)
--  ● 전제: supabase_app_access.sql(프로그램별 권한)이 이미 실행되어 있어야 합니다.
--  ● 무엇을 하나요?  app_access.app 허용값 목록 제한을 「영문 소문자 프로그램 코드」 형식 검사로 바꿔
--    stlr(법률 대응 시스템)을 포함해 앞으로 추가되는 프로그램도 SQL 수정 없이 권한을 지정할 수 있게 합니다.
--    기존 권한 자료는 그대로 유지됩니다. 다시 실행해도 안전합니다.
-- =====================================================================
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.app_access'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%(app = ANY%'
  loop
    execute format('alter table public.app_access drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.app_access drop constraint if exists app_access_app_format;
alter table public.app_access add constraint app_access_app_format check (app ~ '^[a-z]{2,8}$');
