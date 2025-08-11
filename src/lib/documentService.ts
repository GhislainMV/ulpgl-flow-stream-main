import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface DocumentFile {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  document_type: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class DocumentService {
  private static readonly BUCKET_NAME = 'documents';

  // Upload un nouveau document
  static async uploadDocument(file: File, metadata: {
    title: string;
    description?: string;
    document_type: string;
  }): Promise<DocumentFile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Créer l'entrée dans la base de données
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          title: metadata.title,
          description: metadata.description,
          document_type: metadata.document_type,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          created_by: user.id,
          status: 'draft'
        })
        .select()
        .single();

      if (docError) throw docError;

      toast({
        title: "Document uploadé avec succès",
        description: `Le document "${metadata.title}" a été ajouté.`,
      });

      return docData;
    } catch (error) {
      console.error('Erreur upload document:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader le document. Vérifiez votre connexion.",
        variant: "destructive",
      });
      return null;
    }
  }

  // Télécharger un document
  static async downloadDocument(document: DocumentFile): Promise<void> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(document.file_path);

      if (error) throw error;

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement commencé",
        description: `Le document "${document.title}" est en cours de téléchargement.`,
      });
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le document.",
        variant: "destructive",
      });
    }
  }

  // Obtenir l'URL publique temporaire d'un document
  static async getDocumentUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, 3600); // URL valide 1 heure

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Erreur génération URL:', error);
      return null;
    }
  }

  // Vérifier les permissions d'un utilisateur sur un document
  static async checkDocumentPermissions(documentId: string): Promise<{
    canView: boolean;
    canEdit: boolean;
    canSign: boolean;
    canDownload: boolean;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { canView: false, canEdit: false, canSign: false, canDownload: false };

      // Récupérer le profil utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Récupérer le document et ses signatures
      const { data: document } = await supabase
        .from('documents')
        .select(`
          *,
          signatures (
            signer_id,
            status,
            signature_order
          )
        `)
        .eq('id', documentId)
        .single();

      if (!document || !profile) {
        return { canView: false, canEdit: false, canSign: false, canDownload: false };
      }

      const userRole = profile.role;
      const isCreator = document.created_by === user.id;
      const isCurrentSigner = document.current_signer === user.id;

      // Permissions basées sur le rôle et le statut
      const permissions = {
        canView: isCreator || isCurrentSigner || this.hasViewPermission(userRole, document.document_type),
        canEdit: isCreator && document.status === 'draft',
        canSign: isCurrentSigner && document.status === 'pending_signature',
        canDownload: isCreator || this.hasDownloadPermission(userRole, document.document_type)
      };

      return permissions;
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return { canView: false, canEdit: false, canSign: false, canDownload: false };
    }
  }

  // Vérifier si un rôle peut voir un type de document
  private static hasViewPermission(role: string, documentType: string): boolean {
    const viewPermissions: Record<string, string[]> = {
      'releve_notes': ['saf', 'doyen', 'appariteur', 'comptable'],
      'lettre_honoraires': ['saf', 'doyen', 'sgad', 'sgac', 'ab', 'recteur', 'caissiere'],
      'pv_conseil': ['saf', 'doyen', 'sgac', 'recteur'],
      'correspondance': ['saf', 'doyen', 'sgac', 'sgad', 'recteur', 'dircab']
    };

    return viewPermissions[documentType]?.includes(role) || false;
  }

  // Vérifier si un rôle peut télécharger un type de document
  private static hasDownloadPermission(role: string, documentType: string): boolean {
    // Généralement, si on peut voir, on peut télécharger
    return this.hasViewPermission(role, documentType);
  }

  // Récupérer tous les documents accessibles à l'utilisateur
  static async getUserDocuments(): Promise<DocumentFile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: documents, error } = await supabase
        .from('documents')
        .select(`
          *,
          profiles!documents_created_by_fkey (
            first_name,
            last_name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return documents || [];
    } catch (error) {
      console.error('Erreur récupération documents:', error);
      return [];
    }
  }

  // Mettre à jour un document
  static async updateDocument(documentId: string, updates: Partial<DocumentFile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document mis à jour",
        description: "Les modifications ont été sauvegardées.",
      });

      return true;
    } catch (error) {
      console.error('Erreur mise à jour document:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive",
      });
      return false;
    }
  }

  // Supprimer un document
  static async deleteDocument(document: DocumentFile): Promise<boolean> {
    try {
      // Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Supprimer l'entrée de la base de données
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: "Document supprimé",
        description: `Le document "${document.title}" a été supprimé.`,
      });

      return true;
    } catch (error) {
      console.error('Erreur suppression document:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le document.",
        variant: "destructive",
      });
      return false;
    }
  }
}