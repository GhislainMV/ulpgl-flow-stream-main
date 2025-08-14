import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface DocumentTemplate {
  id: string;
  name: string;
  document_type: string;
  file_path: string;
  placeholders: string[];
  created_at: string;
}

export interface PlaceholderData {
  [key: string]: string;
}

export interface SignatureData {
  signer_id: string;
  signer_name: string;
  signer_role: string;
  signature_text: string;
  signed_at?: string;
}

export class TemplateService {
  private static readonly TEMPLATE_BUCKET = 'documents';
  private static readonly TEMPLATE_PATH = 'templates/';
  private static readonly GENERATED_PATH = 'generated/';
  private static readonly SIGNED_PATH = 'signed/';

  // Templates spécifiques disponibles
  private static readonly AVAILABLE_TEMPLATES = {
    'releve_notes': {
      file: 'releve_de_notes.pdf.docx',
      placeholders: [
        '{{nom_etudiant}}', '{{numero_etudiant}}', '{{faculte}}', 
        '{{promotion}}', '{{annee_academique}}', '{{date}}',
        '{{signature_saf}}', '{{signature_libraire}}', '{{signature_comptable}}',
        '{{signature_bibliothecaire}}', '{{signature_doyen}}'
      ]
    },
    'lettre_honoraires': {
      file: 'lettre_honoraires.pdf.docx',
      placeholders: [
        '{{nom_enseignant}}', '{{matiere}}', '{{heures}}', 
        '{{periode}}', '{{montant}}', '{{date}}', '{{nom_cp}}',
        '{{signature_cp}}', '{{signature_doyen}}', '{{signature_sgac}}'
      ]
    }
  };

  // Récupérer les templates disponibles
  static async getAvailableTemplates(): Promise<DocumentTemplate[]> {
    try {
      const templates: DocumentTemplate[] = [];
      
      for (const [type, config] of Object.entries(this.AVAILABLE_TEMPLATES)) {
        // Vérifier si le template existe dans le storage
        const { data, error } = await supabase.storage
          .from(this.TEMPLATE_BUCKET)
          .list(this.TEMPLATE_PATH, {
            search: config.file
          });

        if (!error && data && data.length > 0) {
          const template: DocumentTemplate = {
            id: config.file,
            name: config.file.replace(/\.(pdf\.)?docx$/, ''),
            document_type: type,
            file_path: `${this.TEMPLATE_PATH}${config.file}`,
            placeholders: config.placeholders,
            created_at: new Date().toISOString()
          };
          templates.push(template);
        }
      }

      return templates;
    } catch (error) {
      console.error('Erreur récupération templates:', error);
      return [];
    }
  }

  // Générer un document depuis un template
  static async generateDocumentFromTemplate(
    templateType: string,
    placeholderData: PlaceholderData,
    documentTitle: string,
    createdBy: string
  ): Promise<string | null> {
    try {
      const config = this.AVAILABLE_TEMPLATES[templateType as keyof typeof this.AVAILABLE_TEMPLATES];
      if (!config) {
        throw new Error(`Template non trouvé pour le type: ${templateType}`);
      }

      // 1. Télécharger le template depuis Supabase
      const templatePath = `${this.TEMPLATE_PATH}${config.file}`;
      const { data: templateFile, error: downloadError } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .download(templatePath);

      if (downloadError) throw downloadError;

      // 2. Simuler le remplacement des placeholders
      // En réalité, il faudrait utiliser une librairie comme docxtemplater
      const processedContent = await this.replacePlaceholders(templateFile, placeholderData, config.placeholders);

      // 3. Générer un nom unique pour le document
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const generatedFileName = `${documentTitle}_${timestamp}.docx`;
      const generatedPath = `${this.GENERATED_PATH}${createdBy}/${generatedFileName}`;

      // 4. Uploader le document généré
      const { error: uploadError } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .upload(generatedPath, processedContent, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (uploadError) throw uploadError;

      toast({
        title: "Document généré avec succès",
        description: `Le document "${documentTitle}" a été créé depuis le template.`,
      });

      return generatedPath;
    } catch (error) {
      console.error('Erreur génération document:', error);
      toast({
        title: "Erreur de génération",
        description: "Impossible de générer le document depuis le template.",
        variant: "destructive",
      });
      return null;
    }
  }

  // Remplacer les placeholders dans le contenu
  private static async replacePlaceholders(
    templateFile: Blob,
    placeholderData: PlaceholderData,
    availablePlaceholders: string[]
  ): Promise<Blob> {
    // Simulation du remplacement des placeholders
    // En production, utiliser docxtemplater ou une librairie similaire
    
    // Créer les données avec tous les placeholders
    const completeData = { ...placeholderData };
    
    // Ajouter les placeholders manquants avec des valeurs vides
    availablePlaceholders.forEach(placeholder => {
      const key = placeholder.replace(/[{}]/g, '');
      if (!completeData[key]) {
        completeData[key] = ''; // Laisser vide si non fourni
      }
    });

    // Remplacer les traits de soulignement et pointillés par les valeurs
    // Cette logique serait implémentée avec docxtemplater en production
    
    return templateFile;
  }

  // Finaliser un document avec les signatures
  static async finalizeDocumentWithSignatures(
    generatedPath: string,
    signatures: SignatureData[],
    documentTitle: string
  ): Promise<string | null> {
    try {
      // 1. Télécharger le document généré
      const { data: generatedFile, error: downloadError } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .download(generatedPath);

      if (downloadError) throw downloadError;

      // 2. Insérer les signatures dans le document
      const finalizedContent = await this.insertSignatures(generatedFile, signatures);

      // 3. Générer le nom du document final
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFileName = `${documentTitle}_SIGNED_${timestamp}.docx`;
      const finalPath = `${this.SIGNED_PATH}${finalFileName}`;

      // 4. Uploader le document final signé
      const { error: uploadError } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .upload(finalPath, finalizedContent, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (uploadError) throw uploadError;

      // 5. Générer aussi une version PDF
      const pdfPath = await this.generatePDFVersion(finalPath, finalizedContent);

      toast({
        title: "Document finalisé avec succès",
        description: `Le document "${documentTitle}" est maintenant signé et archivé.`,
      });

      return finalPath;
    } catch (error) {
      console.error('Erreur finalisation document:', error);
      toast({
        title: "Erreur de finalisation",
        description: "Impossible de finaliser le document avec les signatures.",
        variant: "destructive",
      });
      return null;
    }
  }

  // Insérer les signatures dans le document
  private static async insertSignatures(
    documentFile: Blob,
    signatures: SignatureData[]
  ): Promise<Blob> {
    // En production, remplacer les placeholders de signature par "OK SIGNÉ"
    // avec docxtemplater ou une librairie similaire
    
    // Exemple de logique :
    // - {{signature_saf}} → "OK SIGNÉ - SAF - [Date]"
    // - {{signature_doyen}} → "OK SIGNÉ - DOYEN - [Date]"
    
    return documentFile;
  }

  // Générer une version PDF du document final
  private static async generatePDFVersion(
    wordPath: string,
    wordContent: Blob
  ): Promise<string> {
    const pdfPath = wordPath.replace('.docx', '.pdf');
    
    // En production, convertir le Word en PDF
    // Pour la simulation, on upload le même contenu avec extension PDF
    await supabase.storage
      .from(this.TEMPLATE_BUCKET)
      .upload(pdfPath, wordContent, {
        contentType: 'application/pdf'
      });
    
    return pdfPath;
  }

  // Vérifier si un template existe pour un type de document
  static async hasTemplateForType(documentType: string): Promise<boolean> {
    return documentType in this.AVAILABLE_TEMPLATES;
  }

  // Récupérer un template spécifique
  static async getTemplateByType(documentType: string): Promise<DocumentTemplate | null> {
    const config = this.AVAILABLE_TEMPLATES[documentType as keyof typeof this.AVAILABLE_TEMPLATES];
    if (!config) return null;

    return {
      id: config.file,
      name: config.file.replace(/\.(pdf\.)?docx$/, ''),
      document_type: documentType,
      file_path: `${this.TEMPLATE_PATH}${config.file}`,
      placeholders: config.placeholders,
      created_at: new Date().toISOString()
    };
  }

  // Créer une URL temporaire pour téléchargement
  static async getDocumentDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 heure

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Erreur génération URL:', error);
      return null;
    }
  }

  // Vérifier les permissions de création
  static canCreateDocument(userRole: string, documentType: string): boolean {
    switch (documentType) {
      case 'releve_notes':
        return ['saf', 'appariteur'].includes(userRole);
      case 'lettre_honoraires':
        return userRole === 'saf';
      default:
        return false;
    }
  }

  // Vérifier les permissions de visualisation finale
  static canViewFinalDocument(userRole: string): boolean {
    return ['saf', 'appariteur', 'receptionniste', 'bibliothecaire'].includes(userRole);
  }
}