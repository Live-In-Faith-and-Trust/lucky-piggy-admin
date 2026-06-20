-- PostgREST max_rows 제한 우회: 응모 인원(distinct user_id) 서버 집계
CREATE OR REPLACE FUNCTION public.get_draw_entrant_count(p_draw_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT user_id) FROM draw_entries WHERE draw_id = p_draw_id;
$$;
