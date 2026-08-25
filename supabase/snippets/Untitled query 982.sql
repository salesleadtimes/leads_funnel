INSERT INTO public.user_segments (user_id, segment_id)
SELECT p.id, s.id
FROM public.profiles p
CROSS JOIN public.segments s
WHERE p.role = 'owner'
  AND s.is_active = true
ON CONFLICT (user_id, segment_id) DO NOTHING;
