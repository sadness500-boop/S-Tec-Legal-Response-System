-- =====================================================================
--  Legal Response System(법률 대응 시스템) — 통합 로그인 서버에 'stlr' 등록
--  Designed & Developed by Rat Rae Choi
--
--  ● 어디에 실행하나요?  통합 로그인 Supabase 프로젝트(mnsuebexlzhvomxhrear) → SQL Editor → 이 파일 전체 붙여넣기 → Run (한 번만)
--  ● 무엇을 하나요?
--    1) 통합관리 시스템의 「프로그램 등록부」(program_registry)에 법률 대응 시스템(stlr)을 추가 → 메인 화면 메뉴 카드 표시
--    2) 프로그램별 권한(app_access)에서 stlr 를 지정할 수 있게 함
--       (등록부 방식이면 등록만으로 허용 / 예전 허용목록 방식이면 목록 제한을 형식 검사로 교체)
--  ● 기존 자료는 지우지 않습니다. 다시 실행해도 안전합니다.
-- =====================================================================
do $$
declare c record;
begin
  if to_regclass('public.program_registry') is not null then
    insert into public.program_registry (code, name, full_name, url, icon, color, sort, uses_access, version, note)
    values ('stlr', '법률 대응 시스템', 'Legal Response System',
            'https://sadness500-boop.github.io/S-Tec-Legal-Response-System/', 'assets/apps/stlr.png', '#1F3A73', 80, true, '1.0.0',
            '부당 클레임·근무자 사안 법률 검토 Word·PPT·PDF')
    on conflict (code) do nothing;
  end if;
  if to_regclass('public.app_access') is not null then
    for c in select conname from pg_constraint
             where conrelid = 'public.app_access'::regclass and contype = 'c'
               and pg_get_constraintdef(oid) ilike '%(app = ANY%'
    loop
      execute format('alter table public.app_access drop constraint %I', c.conname);
    end loop;
  end if;
end $$;

-- 확인: 아래 결과에 stlr 한 줄이 보이면 완료
select code, name, url, sort from public.program_registry where code = 'stlr';
