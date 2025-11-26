-- Create Tables

-- Accounts
create table accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  type text not null, -- 'personal', 'business', etc.
  currency text default 'MXN',
  initial_balance numeric default 0,
  current_balance numeric default 0,
  color text,
  default_income_maaserable boolean default true,
  default_expense_deductible boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  type text not null, -- 'income', 'expense'
  color text,
  icon text,
  is_system boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  date timestamp with time zone not null,
  amount numeric not null,
  description text not null,
  type text not null, -- 'income', 'expense', 'transfer'
  category_id uuid references categories(id),
  account_id uuid references accounts(id) not null,
  to_account_id uuid references accounts(id), -- For transfers
  status text default 'cleared',
  notes text,
  related_transaction_id uuid references transactions(id), -- For system generated links
  is_system_generated boolean default false,
  is_maaserable boolean,
  is_deductible boolean,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

-- Create Policies (Users can only see their own data)

-- Accounts Policies
create policy "Users can view their own accounts" on accounts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own accounts" on accounts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own accounts" on accounts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own accounts" on accounts
  for delete using (auth.uid() = user_id);

-- Categories Policies
create policy "Users can view their own categories" on categories
  for select using (auth.uid() = user_id);

create policy "Users can insert their own categories" on categories
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own categories" on categories
  for update using (auth.uid() = user_id);

create policy "Users can delete their own categories" on categories
  for delete using (auth.uid() = user_id);

-- Transactions Policies
create policy "Users can view their own transactions" on transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions" on transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on transactions
  for delete using (auth.uid() = user_id);
