-- PostgREST max_rows 제한 우회: 등수별 당첨자 수 서버 집계
CREATE OR REPLACE FUNCTION public.get_draw_winner_counts(p_draw_id uuid)
RETURNS TABLE(prize_rank integer, cnt bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT prize_rank, COUNT(*) AS cnt
  FROM draw_winners
  WHERE draw_id = p_draw_id
  GROUP BY prize_rank
  ORDER BY prize_rank;
$$;
