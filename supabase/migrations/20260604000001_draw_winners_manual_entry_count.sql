-- draw_winners에 수동 당첨자용 응모 횟수 컬럼 추가
ALTER TABLE public.draw_winners
  ADD COLUMN IF NOT EXISTS manual_entry_count integer;

-- get_draw_winners_list RPC 수정: source='manual'이면 manual_entry_count를 entry_count로 반환
CREATE OR REPLACE FUNCTION public.get_draw_winners_list(p_draw_id uuid)
RETURNS setof jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'prize_rank',        dw.prize_rank,
    'display_name',      CASE
                           WHEN dw.real_name IS NOT NULL
                             THEN _anonymize_name(dw.real_name)
                           WHEN dw.real_name IS NULL AND dw.manual_referral_code IS NOT NULL
                             THEN _anonymize_name(dw.manual_referral_code)
                           ELSE _anonymize_name(p.referral_code)
                         END,
    'per_winner_amount', CASE
                           WHEN dp.amount IS NOT NULL AND rc.cnt > 0
                             THEN (dp.amount / rc.cnt)::bigint
                           ELSE NULL
                         END,
    'entry_count',       CASE
                           WHEN dw.source = 'manual' THEN dw.manual_entry_count
                           ELSE ec.cnt::integer
                         END
  )
  FROM draw_winners dw
  LEFT JOIN profiles p ON p.id = dw.user_id
  LEFT JOIN draw_prizes dp ON dp.draw_id = dw.draw_id AND dp.prize_rank = dw.prize_rank
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM draw_winners dw2
    WHERE dw2.draw_id = p_draw_id
      AND dw2.prize_rank = dw.prize_rank
  ) rc ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM draw_entries de
    WHERE de.draw_id = p_draw_id
      AND de.user_id = dw.user_id
  ) ec ON true
  WHERE dw.draw_id = p_draw_id
  ORDER BY dw.prize_rank ASC, dw.created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_draw_winners_list(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_draw_winners_list(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_draw_winners_list(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_draw_winners_list(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_draw_winners_list(uuid) TO authenticated;
