-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  service_amount DECIMAL(15, 2) DEFAULT 0,
  tip_amount DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create transaction items table
CREATE TABLE public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_price DECIMAL(15, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transaction_items
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Transaction items policies (check via transaction ownership)
CREATE POLICY "Users can view items of their transactions"
  ON public.transaction_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for their transactions"
  ON public.transaction_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of their transactions"
  ON public.transaction_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items of their transactions"
  ON public.transaction_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Create transaction participants table
CREATE TABLE public.transaction_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transaction_participants
ALTER TABLE public.transaction_participants ENABLE ROW LEVEL SECURITY;

-- Transaction participants policies
CREATE POLICY "Users can view participants of their transactions"
  ON public.transaction_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_participants.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create participants for their transactions"
  ON public.transaction_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_participants.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update participants of their transactions"
  ON public.transaction_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_participants.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete participants of their transactions"
  ON public.transaction_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_participants.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Create item assignments table (which items belong to which participants)
CREATE TABLE public.item_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.transaction_items(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.transaction_participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, participant_id)
);

-- Enable RLS on item_assignments
ALTER TABLE public.item_assignments ENABLE ROW LEVEL SECURITY;

-- Item assignments policies
CREATE POLICY "Users can view assignments of their transactions"
  ON public.item_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transaction_items
      JOIN public.transactions ON transactions.id = transaction_items.transaction_id
      WHERE transaction_items.id = item_assignments.item_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assignments for their transactions"
  ON public.item_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transaction_items
      JOIN public.transactions ON transactions.id = transaction_items.transaction_id
      WHERE transaction_items.id = item_assignments.item_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assignments of their transactions"
  ON public.item_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transaction_items
      JOIN public.transactions ON transactions.id = transaction_items.transaction_id
      WHERE transaction_items.id = item_assignments.item_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();