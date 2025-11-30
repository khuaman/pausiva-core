-- Drop FK constraints on conversation_id columns
-- The conversation_id stores thread_id from conversations table (not the id PK)
-- thread_id is generated separately and passed to FastAPI, so FK validation fails

begin;

-- Drop FK constraint from appointments (if exists)
alter table public.appointments
  drop constraint if exists appointments_conversation_id_fkey;

-- Drop FK constraint from followings (if exists)
alter table public.followings
  drop constraint if exists followings_conversation_id_fkey;

commit;


