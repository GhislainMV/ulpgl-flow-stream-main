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
  signature_image?: string;
  signed_at?: string;
}

export class TemplateService {
  private static readonly TEMPLATE_BUCKET = 'documents';
  private static readonly TEMPLATE_PATH = 'templates/';
  private static readonly GENERATED_PATH = 'generated/';
  private static readonly SIGNED_PATH = 'signed/';

  // Récupérer les templates disponibles
  static async getAvailableTemplates(): Promise<DocumentTemplate[]> {
    try {
      const { data: files, error } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .list(this.TEMPLATE_PATH);

      if (error) throw error;

      const templates: DocumentTemplate[] = [];
      
      for (const file of files || []) {
        if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
          const template: DocumentTemplate = {
            id: file.name,
            name: file.name.replace(/\.(docx|doc)$/, ''),
            document_type: this.extractDocumentType(file.name),
            file_path: `${this.TEMPLATE_PATH}${file.name}`,
            placeholders: await this.extractPlaceholders(file.name),
            created_at: file.created_at || new Date().toISOString()
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

  // Extraire le type de document depuis le nom du fichier
  private static extractDocumentType(fileName: string): string {
    const name = fileName.toLowerCase();
    if (name.includes('releve') || name.includes('notes')) return 'releve_notes';
    if (name.includes('honoraires') || name.includes('enseignant')) return 'lettre_honoraires';
    if (name.includes('conseil') || name.includes('pv')) return 'pv_conseil';
    if (name.includes('correspondance')) return 'correspondance';
    return 'autre';
  }

  // Extraire les placeholders d'un template (simulation)
  private static async extractPlaceholders(fileName: string): Promise<string[]> {
    // En réalité, il faudrait parser le document Word pour extraire les {{placeholders}}
    // Pour la démo, on retourne des placeholders basés sur le type
    const type = this.extractDocumentType(fileName);
    
    const commonPlaceholders = ['{{date}}', '{{annee_academique}}'];
    
    switch (type) {
      case 'releve_notes':
        return [...commonPlaceholders, '{{nom_etudiant}}', '{{numero_etudiant}}', '{{faculte}}', '{{promotion}}'];
      case 'lettre_honoraires':
        return [...commonPlaceholders, '{{nom_enseignant}}', '{{matiere}}', '{{heures}}', '{{montant}}'];
      case 'pv_conseil':
        return [...commonPlaceholders, '{{date_reunion}}', '{{participants}}', '{{ordre_jour}}'];
      default:
        return [...commonPlaceholders, '{{titre}}', '{{contenu}}'];
    }
  }

  // Générer un document depuis un template
  static async generateDocumentFromTemplate(
    templateId: string,
    placeholderData: PlaceholderData,
    documentTitle: string,
    createdBy: string
  ): Promise<string | null> {
    try {
      // 1. Télécharger le template depuis Supabase
      const templatePath = `${this.TEMPLATE_PATH}${templateId}`;
      const { data: templateFile, error: downloadError } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .download(templatePath);

      if (downloadError) throw downloadError;

      // 2. Simuler le remplacement des placeholders
      // En réalité, il faudrait utiliser une librairie comme docxtemplater
      const processedContent = await this.replacePlaceholders(templateFile, placeholderData);

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

  // Remplacer les placeholders dans le contenu (simulation)
  private static async replacePlaceholders(
    templateFile: Blob,
    placeholderData: PlaceholderData
  ): Promise<Blob> {
    // En réalité, il faudrait utiliser docxtemplater ou une librairie similaire
    // Pour la démo, on retourne le fichier original
    // 
    // Exemple d'implémentation réelle :
    // const zip = new PizZip(await templateFile.arrayBuffer());
    // const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    // doc.setData(placeholderData);
    // doc.render();
    // return new Blob([doc.getZip().generate({ type: 'arraybuffer' })]);
    
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

  // Insérer les signatures dans le document (simulation)
  private static async insertSignatures(
    documentFile: Blob,
    signatures: SignatureData[]
  ): Promise<Blob> {
    // En réalité, il faudrait :
    // 1. Parser le document Word
    // 2. Trouver les placeholders de signature ({{signature_doyen}}, etc.)
    // 3. Les remplacer par les images de signature
    // 4. Ajouter les informations de signature (nom, date, etc.)
    
    // Pour la démo, on retourne le fichier original
    return documentFile;
  }

  // Générer une version PDF du document final
  private static async generatePDFVersion(
    wordPath: string,
    wordContent: Blob
  ): Promise<string> {
    // En réalité, il faudrait convertir le Word en PDF
    // Cela peut se faire avec des services comme :
    // - LibreOffice en ligne de commande
    // - API de conversion (CloudConvert, etc.)
    // - Bibliothèques Node.js spécialisées
    
    const pdfPath = wordPath.replace('.docx', '.pdf');
    
    // Simulation : on upload le même contenu avec extension PDF
    await supabase.storage
      .from(this.TEMPLATE_BUCKET)
      .upload(pdfPath, wordContent, {
        contentType: 'application/pdf'
      });
    
    return pdfPath;
  }

  // Vérifier si un template existe pour un type de document
  static async hasTemplateForType(documentType: string): Promise<boolean> {
    const templates = await this.getAvailableTemplates();
    return templates.some(t => t.document_type === documentType);
  }

  // Récupérer un template spécifique
  static async getTemplateByType(documentType: string): Promise<DocumentTemplate | null> {
    const templates = await this.getAvailableTemplates();
    return templates.find(t => t.document_type === documentType) || null;
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

  // Archiver un document (le rendre non modifiable)
  static async archiveDocument(filePath: string): Promise<boolean> {
    try {
      // En réalité, on pourrait :
      // 1. Déplacer vers un bucket d'archives
      // 2. Changer les permissions
      // 3. Ajouter des métadonnées d'archivage
      
      // Pour la démo, on simule l'archivage
      console.log(`Document archivé: ${filePath}`);
      return true;
    } catch (error) {
      console.error('Erreur archivage:', error);
      return false;
    }
  }
}