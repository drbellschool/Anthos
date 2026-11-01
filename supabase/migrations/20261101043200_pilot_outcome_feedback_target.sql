alter table public.anthos_pilot_comments drop constraint if exists anthos_pilot_comments_target_kind_check;
alter table public.anthos_pilot_comments add constraint anthos_pilot_comments_target_kind_check
 check (target_kind in ('chapter','option','message','general','answer','outcome'));
