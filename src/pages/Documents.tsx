import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageProvider";
import { DocumentViewer } from "@/components/DocumentViewer";
import { SignatureModal } from "@/components/SignatureModal";
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

const mockDocuments = [
  {
    id: 1,
    title: "Relevé de notes - Jean KABILA",
    type: "Relevé de notes",
    status: "pending",
    createdAt: "2024-08-07",
    createdBy: "SAF",
    currentStep: "En attente signature Doyen",
    progress: 60,
    workflow: [
      { step: "SAF", status: "completed", date: "2024-08-07 09:00" },
      { step: "Libraire", status: "completed", date: "2024-08-07 10:30" },
      { step: "Comptable", status: "completed", date: "2024-08-07 14:15" },
      { step: "Bibliothécaire", status: "pending", date: null },
      { step: "Doyen", status: "waiting", date: null }
    ]
  },
  {
    id: 2,
    title: "Lettre d'honoraires - Dr. MUKENDI",
    type: "Lettre d'honoraires",
    status: "signed",
    createdAt: "2024-08-06",
    createdBy: "SAF",
    currentStep: "Terminé",
    progress: 100,
    workflow: [
      { step: "SAF", status: "completed", date: "2024-08-06 08:00" },
      { step: "Doyen", status: "completed", date: "2024-08-06 11:00" },
      { step: "SGAD", status: "completed", date: "2024-08-06 15:30" },
      { step: "SGAC", status: "completed", date: "2024-08-07 09:00" },
      { step: "AB", status: "completed", date: "2024-08-07 13:20" },
      { step: "Recteur", status: "completed", date: "2024-08-07 16:45" }
    ]
  },
  {
    id: 3,
    title: "PV Conseil Facultaire - Août 2024",
    type: "PV Conseil",
    status: "draft",
    createdAt: "2024-08-05",
    createdBy: "SAF",
    currentStep: "Brouillon",
    progress: 0,
    workflow: [
      { step: "SAF", status: "draft", date: null },
      { step: "Doyen", status: "waiting", date: null },
      { step: "SGAC", status: "waiting", date: null },
      { step: "Recteur", status: "waiting", date: null }
    ]
  }
];

export default function Documents() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [documents, setDocuments] = useState(mockDocuments);

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

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };

  const handleSignDocument = (document: any) => {
    setSelectedDocument(document);
    setShowSignatureModal(true);
  };

  const handleDownloadDocument = (document: any) => {
    // Simuler le téléchargement
    const link = document.createElement('a');
    link.href = '#';
    link.download = `${document.title}.pdf`;
    link.click();
    
    toast({
      title: "Téléchargement commencé",
      description: `Le document "${document.title}" est en cours de téléchargement.`,
    });
  };

  const handleSendDocument = (document: any) => {
    // Mettre à jour le statut du document
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, status: "pending", progress: 25, currentStep: "En attente signature Doyen" }
          : doc
      )
    );
    
    toast({
      title: "Document envoyé",
      description: `Le document "${document.title}" a été envoyé pour signature.`,
    });
  };

  const handleDocumentSigned = (documentId: string, comments?: string) => {
    // Mettre à jour le statut du document après signature
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              status: "signed", 
              progress: Math.min(doc.progress + 25, 100),
              currentStep: doc.progress >= 75 ? "Terminé" : "En attente signature suivante"
            }
          : doc
      )
    );
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
        <Button variant="ulpgl" className="gap-2">
          <FileText className="h-4 w-4" />
          Nouveau document
        </Button>
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
                <SelectItem value="Lettre d'honoraires">Lettre d'honoraires</SelectItem>
                <SelectItem value="PV Conseil">PV Conseil</SelectItem>
                <SelectItem value="Correspondance">Correspondance</SelectItem>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Progression</TableHead>
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
                        {doc.currentStep}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.status)}
                      {getStatusBadge(doc.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progression</span>
                        <span>{doc.progress}%</span>
                      </div>
                      <Progress value={doc.progress} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.createdAt}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="h-4 w-4" />
                          <span onClick={() => handleViewDocument(doc)}>{t("view")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Download className="h-4 w-4" />
                          <span onClick={() => handleDownloadDocument(doc)}>{t("download")}</span>
                        </DropdownMenuItem>
                        {doc.status === "pending" && (
                          <DropdownMenuItem className="gap-2">
                            <PenTool className="h-4 w-4" />
                            <span onClick={() => handleSignDocument(doc)}>{t("sign")}</span>
                          </DropdownMenuItem>
                        )}
                        {doc.status === "draft" && (
                          <DropdownMenuItem className="gap-2">
                            <Send className="h-4 w-4" />
                            <span onClick={() => handleSendDocument(doc)}>Envoyer</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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