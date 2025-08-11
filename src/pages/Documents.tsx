import { useState } from "react";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageProvider";
import { DocumentViewer } from "@/components/DocumentViewer";
import { DocumentUpload } from "@/components/DocumentUpload";
import { SignatureModal } from "@/components/SignatureModal";
import { DocumentService, DocumentFile } from "@/lib/documentService";
import { toast } from "@/components/ui/use-toast";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  PenTool, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  Send
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function Documents() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await DocumentService.getUserDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les documents.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-orange-600 border-orange-600">En cours</Badge>;
      case "signed":
        return <Badge variant="outline" className="text-green-600 border-green-600">Signé</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Terminé</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Brouillon</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-orange-600" />;
      case "signed":
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "draft":
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.document_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleViewDocument = (document: DocumentFile) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };

  const handleSignDocument = (document: DocumentFile) => {
    setSelectedDocument(document);
    setShowSignatureModal(true);
  };

  const handleDownloadDocument = (document: DocumentFile) => {
    DocumentService.downloadDocument(document);
  };

  const handleSendDocument = (document: DocumentFile) => {
    // Mettre à jour le statut du document
    DocumentService.updateDocument(document.id, {
      status: 'pending_signature'
    });
    
    toast({
      title: "Document envoyé",
      description: `Le document "${document.title}" a été envoyé pour signature.`,
    });
    
    loadDocuments(); // Recharger la liste
  };

  const handleDocumentSigned = (documentId: string, comments?: string) => {
    DocumentService.updateDocument(documentId, {
      status: 'signed'
    });
    
    loadDocuments(); // Recharger la liste
  };

  const handleUploadSuccess = (document: DocumentFile) => {
    loadDocuments(); // Recharger la liste après upload
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("documents")}</h1>
          <p className="text-muted-foreground">
            Gérez et suivez tous vos documents administratifs
          </p>
        </div>
        <div className="flex gap-2">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
          <Button variant="outline" className="gap-2" onClick={() => window.location.href = '/create-document'}>
            <FileText className="h-4 w-4" />
            Créer document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre ou type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="pending">En cours</SelectItem>
                <SelectItem value="signed">Signé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Relevé de notes">Relevé de notes</SelectItem>
                <SelectItem value="releve_notes">Relevé de notes</SelectItem>
                <SelectItem value="Lettre d'honoraires">Lettre d'honoraires</SelectItem>
                <SelectItem value="lettre_honoraires">Lettre d'honoraires</SelectItem>
                <SelectItem value="PV Conseil">PV Conseil</SelectItem>
                <SelectItem value="pv_conseil">PV Conseil</SelectItem>
                <SelectItem value="Correspondance">Correspondance</SelectItem>
                <SelectItem value="correspondance">Correspondance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des documents</CardTitle>
          <CardDescription>
            {filteredDocuments.length} document(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {doc.file_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        {getStatusBadge(doc.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => handleViewDocument(doc)}>
                            <Eye className="h-4 w-4" />
                            <span>{t("view")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleDownloadDocument(doc)}>
                            <Download className="h-4 w-4" />
                            <span>{t("download")}</span>
                          </DropdownMenuItem>
                          {doc.status === "pending_signature" && (
                            <DropdownMenuItem className="gap-2" onClick={() => handleSignDocument(doc)}>
                              <PenTool className="h-4 w-4" />
                              <span>{t("sign")}</span>
                            </DropdownMenuItem>
                          )}
                          {doc.status === "draft" && (
                            <DropdownMenuItem className="gap-2" onClick={() => handleSendDocument(doc)}>
                              <Send className="h-4 w-4" />
                              <span>Envoyer</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      <DocumentViewer
        document={selectedDocument}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          setSelectedDocument(null);
        }}
      />

      {/* Signature Modal */}
      <SignatureModal
        document={selectedDocument}
        isOpen={showSignatureModal}
        onClose={() => {
          setShowSignatureModal(false);
          setSelectedDocument(null);
        }}
        onSign={handleDocumentSigned}
      />
    </div>
  );
}