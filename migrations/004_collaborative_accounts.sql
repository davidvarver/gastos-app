-- MIGRATION 004: Collaborative Accounts Support
-- This migration adds multi-user support to accounts with admin/editor roles

-- ============================================================================
-- 1. CREATE NEW TABLES
-- ============================================================================

-- Account Members Table
create table account_members (
  id uuid default gen_random_uuid() primary key,
  account_id uuid references accounts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'editor')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(account_id, user_id)
);

-- Account Invitations Table
create table account_invitations (
  id uuid default gen_random_uuid() primary key,
  account_id uuid references accounts(id) on delete cascade not null,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  token text not null unique,
  role text not null check (role in ('admin', 'editor')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  unique(account_id, token)
);

-- ============================================================================
-- 2. ENABLE RLS ON NEW TABLES
-- ============================================================================

alter table account_members enable row level security;
alter table account_invitations enable row level security;

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR account_members
-- ============================================================================

-- SELECT: Users can view members of accounts they belong to
create policy "Users can view members of accounts they belong to" on account_members
  for select using (
    exists (
      select 1 from account_members am2
      where am2.account_id = account_members.account_id
      and am2.user_id = auth.uid()
    )
  );

-- INSERT: Account admins can invite members
create policy "Account admins can invite members" on account_members
  for insert with check (
    exists (
      select 1 from account_members am
      where am.account_id = account_members.account_id
      and am.user_id = auth.uid()
      and am.role = 'admin'
    )
  );

-- UPDATE: Account admins can update member roles
create policy "Account admins can update member roles" on account_members
  for update using (
    exists (
      select 1 from account_members am
      where am.account_id = account_members.account_id
      and am.user_id = auth.uid()
      and am.role = 'admin'
    )
  );

-- DELETE: Account admins can delete members
create policy "Account admins can delete members" on account_members
  for delete using (
    exists (
      select 1 from account_members am
      where am.account_id = account_members.account_id
      and am.user_id = auth.uid()
      and am.role = 'admin'
    )
  );

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR account_invitations
-- ============================================================================

-- SELECT: Anyone can fetch invitation info by token (for unauthenticated users accepting invite)
create policy "Anyone can view valid invitations by token" on account_invitations
  for select using (used_at is null and (expires_at is null or expires_at > now()));

-- INSERT: Account admins can create invitations
create policy "Account admins can create invitations" on account_invitations
  for insert with check (
    exists (
      select 1 from account_members
      where account_members.account_id = account_invitations.account_id
      and account_members.user_id = auth.uid()
      and account_members.role = 'admin'
    )
  );

-- UPDATE: Mark invitations as used
create policy "Users can mark invitations as used" on account_invitations
  for update using (true) with check (true);

-- DELETE: Account admins can revoke invitations
create policy "Account admins can revoke invitations" on account_invitations
  for delete using (
    exists (
      select 1 from account_members
      where account_members.account_id = account_invitations.account_id
      and account_members.user_id = auth.uid()
      and account_members.role = 'admin'
    )
  );

-- ============================================================================
-- 5. MODIFY EXISTING TABLES
-- ============================================================================

-- Add created_by_user_id to accounts table
alter table accounts add column created_by_user_id uuid references auth.users(id);

-- Data migration: Set created_by_user_id = user_id for existing accounts
update accounts set created_by_user_id = user_id where created_by_user_id is null;

-- Make created_by_user_id NOT NULL
alter table accounts alter column created_by_user_id set not null;

-- Add created_by_user_id to transactions table
alter table transactions add column created_by_user_id uuid references auth.users(id);

-- Data migration: Set created_by_user_id = user_id for existing transactions
update transactions set created_by_user_id = user_id where created_by_user_id is null;

-- Make created_by_user_id NOT NULL
alter table transactions alter column created_by_user_id set not null;

-- ============================================================================
-- 6. CREATE DATA MIGRATION: Auto-add existing account owners as admins
-- ============================================================================
-- For all existing accounts, automatically create an account_members entry
-- so the owner becomes an admin of their own account

insert into account_members (account_id, user_id, role, joined_at)
select
  a.id as account_id,
  a.created_by_user_id as user_id,
  'admin' as role,
  a.created_at as joined_at
from accounts a
where not exists (
  select 1 from account_members am
  where am.account_id = a.id
  and am.user_id = a.created_by_user_id
)
on conflict (account_id, user_id) do nothing;

-- ============================================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

create index idx_account_members_account_id on account_members(account_id);
create index idx_account_members_user_id on account_members(user_id);
create index idx_account_invitations_token on account_invitations(token);
create index idx_account_invitations_account_id on account_invitations(account_id);
create index idx_account_invitations_expires_at on account_invitations(expires_at) where used_at is null;

-- ============================================================================
-- 8. UPDATE RLS POLICIES FOR EXISTING TABLES
-- ============================================================================

-- Drop old accounts policies (one by one to avoid conflicts)
drop policy if exists "Users can view their own accounts" on accounts;
drop policy if exists "Users can insert their own accounts" on accounts;
drop policy if exists "Users can update their own accounts" on accounts;
drop policy if exists "Users can delete their own accounts" on accounts;

-- New accounts policies: Access account if user is a member OR is the creator
create policy "Users can view accounts they are members of" on accounts
  for select using (
    exists (
      select 1 from account_members
      where account_members.account_id = accounts.id
      and account_members.user_id = auth.uid()
    )
    or accounts.created_by_user_id = auth.uid()
  );

create policy "Users can create accounts" on accounts
  for insert with check (auth.uid() = created_by_user_id);

create policy "Account members can update accounts" on accounts
  for update using (
    exists (
      select 1 from account_members
      where account_members.account_id = accounts.id
      and account_members.user_id = auth.uid()
    )
  );

create policy "Account admins can delete accounts" on accounts
  for delete using (
    exists (
      select 1 from account_members
      where account_members.account_id = accounts.id
      and account_members.user_id = auth.uid()
      and account_members.role = 'admin'
    )
  );

-- Drop old transactions policies
drop policy if exists "Users can view their own transactions" on transactions;
drop policy if exists "Users can insert their own transactions" on transactions;
drop policy if exists "Users can update their own transactions" on transactions;
drop policy if exists "Users can delete their own transactions" on transactions;

-- New transactions policies: Access transaction if user is member of the account
create policy "Users can view transactions in accounts they are members of" on transactions
  for select using (
    exists (
      select 1 from account_members am
      where am.account_id = transactions.account_id
      and am.user_id = auth.uid()
    )
    or transactions.created_by_user_id = auth.uid()
  );

create policy "Users can create transactions in their accounts" on transactions
  for insert with check (
    auth.uid() = created_by_user_id
    and exists (
      select 1 from account_members am
      where am.account_id = transactions.account_id
      and am.user_id = auth.uid()
    )
  );

create policy "Users can update their own transactions" on transactions
  for update using (
    transactions.created_by_user_id = auth.uid()
    and exists (
      select 1 from account_members am
      where am.account_id = transactions.account_id
      and am.user_id = auth.uid()
    )
  );

-- DELETE: Only admins can delete (enforced at DB level)
create policy "Only admins can delete transactions" on transactions
  for delete using (
    transactions.created_by_user_id = auth.uid()
    and exists (
      select 1 from account_members am
      where am.account_id = transactions.account_id
      and am.user_id = auth.uid()
      and am.role = 'admin'
    )
  );

-- Keep categories and subcategories as user-level for now
-- (they are not shared per account in this version)
