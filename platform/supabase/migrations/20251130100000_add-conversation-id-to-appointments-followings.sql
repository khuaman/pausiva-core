-- Add conversation_id to appointments and followings tables
-- This allows mapping records back to the AI conversation that created them

begin;

-- Add conversation_id to appointments table
alter table public.appointments
  add column if not exists conversation_id uuid;

-- Add foreign key constraint to conversations table
alter table public.appointments
  add constraint appointments_conversation_id_fkey 
  foreign key (conversation_id) 
  references public.conversations (id) 
  on delete set null;

-- Add index for conversation_id lookups
create index if not exists appointments_conversation_id_idx 
  on public.appointments (conversation_id);

-- Add conversation_id to followings table
alter table public.followings
  add column if not exists conversation_id uuid;

-- Add foreign key constraint to conversations table
alter table public.followings
  add constraint followings_conversation_id_fkey 
  foreign key (conversation_id) 
  references public.conversations (id) 
  on delete set null;

-- Add index for conversation_id lookups
create index if not exists followings_conversation_id_idx 
  on public.followings (conversation_id);

commit;

