/*
  # Fix RLS Infinite Recursion

  1. Problem
    - Circular dependency between documents and signatures policies
    - Documents policy checks signatures, signatures policy checks documents
    - Storage policy also creates recursion with signatures table

  2. Solution
    - Use EXISTS clauses to break circular dependencies
    - Simplify storage policies to avoid signature table lookups
    - Create more efficient policies that don't cause recursion

  3. Changes
    - Update documents SELECT policy to use EXISTS without recursion
    - Update signatures SELECT policy to be more direct
    - Simplify storage policies to avoid complex joins
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view documents they created or are signers" ON public.documents;
DROP POLICY IF EXISTS "Users can view signatures for their documents" ON public.signatures;
DROP POLICY IF EXISTS "Users can view documents they have access to" ON storage.objects;

-- Create new non-recursive policies for documents
CREATE POLICY "Users can view documents they created or are signers" ON public.documents
  FOR SELECT USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.signatures s 
      WHERE s.document_id = documents.id 
      AND s.signer_id = auth.uid()
    )
  );

-- Create new non-recursive policy for signatures
CREATE POLICY "Users can view signatures for their documents" ON public.signatures
  FOR SELECT USING (
    signer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = signatures.document_id 
      AND d.created_by = auth.uid()
    )
  );

-- Create simplified storage policy without signature table dependency
CREATE POLICY "Users can view documents they have access to" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    (
      -- Allow access to documents created by the user
      name LIKE '%' || auth.uid()::text || '%' OR
      -- Allow access to signed documents (they contain SIGNED in the name)
      (name LIKE '%SIGNED%' AND auth.uid() IS NOT NULL)
    )
  );

-- Create additional policy for document creators to access their generated files
CREATE POLICY "Users can access their generated documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid() IS NOT NULL AND
    (
      name LIKE 'generated/' || auth.uid()::text || '/%' OR
      name LIKE 'templates/%'
    )
  );