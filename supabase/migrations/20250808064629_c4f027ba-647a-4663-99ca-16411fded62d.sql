-- Create enum types for roles and document statuses
CREATE TYPE public.user_role AS ENUM (
  'saf', 'doyen', 'receptionniste', 'secretaire_sgac', 'secretaire_sgad', 
  'sgac', 'sgad', 'appariteur', 'comptable', 'caissiere', 'ab', 'dircab', 'recteur'
);

CREATE TYPE public.document_status AS ENUM (
  'draft', 'pending_review', 'pending_signature', 'signed', 'completed', 'rejected'
);

CREATE TYPE public.signature_status AS ENUM (
  'pending', 'signed', 'rejected'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  status document_status DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  current_signer UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create signatures table
CREATE TABLE public.signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES public.profiles(id),
  signature_order INTEGER NOT NULL,
  status signature_status DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, signer_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all active profiles" ON public.profiles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for documents  
CREATE POLICY "Users can view documents they created or are signers" ON public.documents
  FOR SELECT USING (
    created_by = auth.uid() OR 
    id IN (SELECT document_id FROM public.signatures WHERE signer_id = auth.uid())
  );

CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Document creators and current signers can update" ON public.documents
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    current_signer = auth.uid()
  );

-- RLS Policies for signatures
CREATE POLICY "Users can view signatures for their documents" ON public.signatures
  FOR SELECT USING (
    signer_id = auth.uid() OR 
    document_id IN (SELECT id FROM public.documents WHERE created_by = auth.uid())
  );

CREATE POLICY "Document creators can insert signatures" ON public.signatures
  FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM public.documents WHERE created_by = auth.uid())
  );

CREATE POLICY "Signers can update their own signatures" ON public.signatures
  FOR UPDATE USING (signer_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Storage policies for documents
CREATE POLICY "Users can view documents they have access to" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    name IN (
      SELECT file_path FROM public.documents 
      WHERE created_by = auth.uid() OR 
      id IN (SELECT document_id FROM public.signatures WHERE signer_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name', 
    NEW.email,
    (NEW.raw_user_meta_data ->> 'role')::user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();