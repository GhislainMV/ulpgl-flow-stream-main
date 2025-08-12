import { supabase } from '@/integrations/supabase/client';
import { TemplateService, SignatureData } from './templateService';
import { toast } from '@/components/ui/use-toast';

export interface WorkflowStep {
  order: number;
  role: string;
  signer_id?: string;
  status: 'pending' | 'signed' | 'rejected';
  signed_at?: string;
  comments?: string;
}

export interface DocumentWorkflow {
  document_id: string;
  steps: WorkflowStep[];
  current_step: number;
  status: 'pending' | 'completed' | 'rejected';
}

export class SignatureWorkflowService {
  // Définir les workflows par type de document
  private static readonly WORKFLOWS = {
    releve_notes: [
      { order: 1, role: 'saf' },
      { order: 2, role: 'appariteur' },
      { order: 3, role: 'comptable' },
      { order: 4, role: 'doyen' }
    ],
    lettre_honoraires: [
      { order: 1, role: 'saf' },
      { order: 2, role: 'doyen' },
      { order: 3, role: 'sgad' },
      { order: 4, role: 'sgac' },
      { order: 5, role: 'ab' },
      { order: 6, role: 'recteur' }
    ],
    pv_conseil: [
      { order: 1, role: 'saf' },
      { order: 2, role: 'doyen' },
      { order: 3, role: 'sgac' },
      { order: 4, role: 'recteur' }
    ],
    correspondance: [
      { order: 1, role: 'saf' },
      { order: 2, role: 'doyen' }
    ]
  };

  // Initialiser un workflow pour un document
  static async initializeWorkflow(
    documentId: string,
    documentType: string
  ): Promise<boolean> {
    try {
      const workflowSteps = this.WORKFLOWS[documentType as keyof typeof this.WORKFLOWS] || [];
      
      // Créer les entrées de signature dans la base
      for (const step of workflowSteps) {
        // Trouver l'utilisateur avec ce rôle
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', step.role)
          .eq('is_active', true)
          .limit(1);

        if (users && users.length > 0) {
          await supabase
            .from('signatures')
            .insert({
              document_id: documentId,
              signer_id: users[0].id,
              signature_order: step.order,
              status: 'pending'
            });
        }
      }

      // Mettre à jour le document avec le premier signataire
      if (workflowSteps.length > 0) {
        const { data: firstSigner } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', workflowSteps[0].role)
          .eq('is_active', true)
          .limit(1);

        if (firstSigner && firstSigner.length > 0) {
          await supabase
            .from('documents')
            .update({
              current_signer: firstSigner[0].id,
              status: 'pending_signature'
            })
            .eq('id', documentId);
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur initialisation workflow:', error);
      return false;
    }
  }

  // Signer un document
  static async signDocument(
    documentId: string,
    signerId: string,
    comments?: string
  ): Promise<boolean> {
    try {
      // 1. Marquer la signature comme signée
      const { error: signError } = await supabase
        .from('signatures')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          comments: comments
        })
        .eq('document_id', documentId)
        .eq('signer_id', signerId);

      if (signError) throw signError;

      // 2. Vérifier s'il y a une prochaine étape
      const { data: nextSignature } = await supabase
        .from('signatures')
        .select('signer_id, signature_order')
        .eq('document_id', documentId)
        .eq('status', 'pending')
        .order('signature_order', { ascending: true })
        .limit(1);

      // 3. Mettre à jour le document
      if (nextSignature && nextSignature.length > 0) {
        // Il y a encore des signatures en attente
        await supabase
          .from('documents')
          .update({
            current_signer: nextSignature[0].signer_id
          })
          .eq('id', documentId);

        // Créer une notification pour le prochain signataire
        await this.createSignatureNotification(documentId, nextSignature[0].signer_id);
      } else {
        // Toutes les signatures sont complètes
        await this.completeDocumentSignature(documentId);
      }

      toast({
        title: "Document signé avec succès",
        description: "Votre signature a été enregistrée et le document a été transmis.",
      });

      return true;
    } catch (error) {
      console.error('Erreur signature document:', error);
      toast({
        title: "Erreur de signature",
        description: "Impossible d'enregistrer votre signature.",
        variant: "destructive",
      });
      return false;
    }
  }

  // Rejeter un document
  static async rejectDocument(
    documentId: string,
    signerId: string,
    reason: string
  ): Promise<boolean> {
    try {
      // 1. Marquer la signature comme rejetée
      await supabase
        .from('signatures')
        .update({
          status: 'rejected',
          signed_at: new Date().toISOString(),
          comments: reason
        })
        .eq('document_id', documentId)
        .eq('signer_id', signerId);

      // 2. Mettre à jour le document comme rejeté
      await supabase
        .from('documents')
        .update({
          status: 'rejected',
          current_signer: null
        })
        .eq('id', documentId);

      // 3. Notifier le créateur du document
      const { data: document } = await supabase
        .from('documents')
        .select('created_by, title')
        .eq('id', documentId)
        .single();

      if (document) {
        await supabase
          .from('notifications')
          .insert({
            user_id: document.created_by,
            title: 'Document rejeté',
            message: `Le document "${document.title}" a été rejeté. Raison: ${reason}`,
            type: 'document_rejected',
            document_id: documentId
          });
      }

      toast({
        title: "Document rejeté",
        description: "Le document a été rejeté et renvoyé au créateur.",
        variant: "destructive",
      });

      return true;
    } catch (error) {
      console.error('Erreur rejet document:', error);
      return false;
    }
  }

  // Finaliser un document (toutes signatures complètes)
  private static async completeDocumentSignature(documentId: string): Promise<void> {
    try {
      // 1. Récupérer le document et ses signatures
      const { data: document } = await supabase
        .from('documents')
        .select(`
          *,
          signatures (
            signer_id,
            signed_at,
            comments,
            signature_order,
            profiles (first_name, last_name, role)
          )
        `)
        .eq('id', documentId)
        .single();

      if (!document) return;

      // 2. Préparer les données de signature
      const signatures: SignatureData[] = document.signatures.map((sig: any) => ({
        signer_id: sig.signer_id,
        signer_name: `${sig.profiles.first_name} ${sig.profiles.last_name}`,
        signer_role: sig.profiles.role,
        signed_at: sig.signed_at
      }));

      // 3. Finaliser le document avec les signatures
      const finalPath = await TemplateService.finalizeDocumentWithSignatures(
        document.file_path,
        signatures,
        document.title
      );

      // 4. Mettre à jour le document en base
      await supabase
        .from('documents')
        .update({
          status: 'completed',
          current_signer: null,
          file_path: finalPath, // Nouveau chemin du document signé
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      // 5. Archiver le document
      if (finalPath) {
        await TemplateService.archiveDocument(finalPath);
      }

      // 6. Notifier le créateur
      await supabase
        .from('notifications')
        .insert({
          user_id: document.created_by,
          title: 'Document finalisé',
          message: `Le document "${document.title}" a été signé par tous les intervenants et est maintenant finalisé.`,
          type: 'document_completed',
          document_id: documentId
        });

    } catch (error) {
      console.error('Erreur finalisation document:', error);
    }
  }

  // Créer une notification de signature
  private static async createSignatureNotification(
    documentId: string,
    signerId: string
  ): Promise<void> {
    try {
      const { data: document } = await supabase
        .from('documents')
        .select('title')
        .eq('id', documentId)
        .single();

      if (document) {
        await supabase
          .from('notifications')
          .insert({
            user_id: signerId,
            title: 'Signature requise',
            message: `Le document "${document.title}" attend votre signature.`,
            type: 'signature_required',
            document_id: documentId
          });
      }
    } catch (error) {
      console.error('Erreur création notification:', error);
    }
  }

  // Récupérer le workflow d'un document
  static async getDocumentWorkflow(documentId: string): Promise<DocumentWorkflow | null> {
    try {
      const { data: signatures } = await supabase
        .from('signatures')
        .select(`
          signature_order,
          status,
          signed_at,
          comments,
          profiles (first_name, last_name, role)
        `)
        .eq('document_id', documentId)
        .order('signature_order');

      if (!signatures) return null;

      const steps: WorkflowStep[] = signatures.map((sig: any) => ({
        order: sig.signature_order,
        role: sig.profiles.role,
        status: sig.status,
        signed_at: sig.signed_at,
        comments: sig.comments
      }));

      const currentStep = steps.findIndex(step => step.status === 'pending') + 1;
      const allSigned = steps.every(step => step.status === 'signed');
      const hasRejected = steps.some(step => step.status === 'rejected');

      return {
        document_id: documentId,
        steps,
        current_step: currentStep || steps.length,
        status: hasRejected ? 'rejected' : (allSigned ? 'completed' : 'pending')
      };
    } catch (error) {
      console.error('Erreur récupération workflow:', error);
      return null;
    }
  }

  // Vérifier si un utilisateur peut signer un document
  static async canUserSignDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const { data: signature } = await supabase
        .from('signatures')
        .select('status')
        .eq('document_id', documentId)
        .eq('signer_id', userId)
        .single();

      return signature?.status === 'pending';
    } catch (error) {
      return false;
    }
  }
}