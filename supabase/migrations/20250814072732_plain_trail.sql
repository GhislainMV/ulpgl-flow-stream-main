/*
  # Correction du système de documents avec workflows spécifiques

  1. Nouveaux workflows
    - Relevé de notes: SAF/Appariteur → Libraire → Comptable → Bibliothécaire → Doyen
    - Lettre d'honoraires: CP (optionnel) → Doyen → SGAC

  2. Permissions d'accès
    - Création: SAF ou Appariteur pour relevé, SAF pour lettre
    - Visualisation finale: SAF, Appariteur, Réceptionniste, Bibliothécaire

  3. Correction des politiques RLS sans récursion
*/

-- Supprimer les politiques problématiques
DROP POLICY IF EXISTS "Users can view documents they created or are signers" ON public.documents;
DROP POLICY IF EXISTS "Users can view signatures for their documents" ON public.signatures;
DROP POLICY IF EXISTS "Users can view documents they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their generated documents" ON storage.objects;

-- Nouvelles politiques simplifiées pour documents
CREATE POLICY "Document access policy" ON public.documents
  FOR SELECT USING (
    -- Créateur peut toujours voir
    created_by = auth.uid() OR
    -- Signataires actuels peuvent voir
    current_signer = auth.uid() OR
    -- Rôles autorisés pour visualisation finale
    (status = 'completed' AND public.get_user_role(auth.uid()) IN ('saf', 'appariteur', 'receptionniste', 'bibliothecaire'))
  );

-- Politique pour signatures
CREATE POLICY "Signature access policy" ON public.signatures
  FOR SELECT USING (
    -- Le signataire peut voir ses signatures
    signer_id = auth.uid() OR
    -- Le créateur du document peut voir toutes les signatures
    document_id IN (
      SELECT id FROM public.documents WHERE created_by = auth.uid()
    )
  );

-- Politiques storage simplifiées
CREATE POLICY "Template access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    name LIKE 'templates/%' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Generated document access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    (
      -- Accès aux documents générés par l'utilisateur
      name LIKE 'generated/%' AND auth.uid() IS NOT NULL OR
      -- Accès aux documents signés pour les rôles autorisés
      (name LIKE 'signed/%' AND public.get_user_role(auth.uid()) IN ('saf', 'appariteur', 'receptionniste', 'bibliothecaire'))
    )
  );

-- Ajouter le rôle bibliothécaire s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bibliothecaire' AND enumtypid = 'public.user_role'::regtype) THEN
    ALTER TYPE public.user_role ADD VALUE 'bibliothecaire';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'libraire' AND enumtypid = 'public.user_role'::regtype) THEN
    ALTER TYPE public.user_role ADD VALUE 'libraire';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cp' AND enumtypid = 'public.user_role'::regtype) THEN
    ALTER TYPE public.user_role ADD VALUE 'cp';
  END IF;
END $$;