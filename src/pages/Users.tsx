import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageProvider";
import { 
  Users as UsersIcon, 
  Search, 
  Filter, 
  UserPlus, 
  MoreHorizontal,
  Shield,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const roles = [
  { value: "saf", label: "SAF", level: "admin", color: "bg-red-100 text-red-800" },
  { value: "doyen", label: "Doyen", level: "admin", color: "bg-purple-100 text-purple-800" },
  { value: "recteur", label: "Recteur", level: "admin", color: "bg-blue-100 text-blue-800" },
  { value: "sgac", label: "SGAC", level: "admin", color: "bg-green-100 text-green-800" },
  { value: "sgad", label: "SGAD", level: "admin", color: "bg-green-100 text-green-800" },
  { value: "ab", label: "AB", level: "admin", color: "bg-orange-100 text-orange-800" },
  { value: "dircab", label: "Dir. Cabinet", level: "admin", color: "bg-indigo-100 text-indigo-800" },
  { value: "receptionniste", label: "Réceptionniste", level: "user", color: "bg-gray-100 text-gray-800" },
  { value: "secretaire_sgac", label: "Sec. SGAC", level: "user", color: "bg-gray-100 text-gray-800" },
  { value: "secretaire_sgad", label: "Sec. SGAD", level: "user", color: "bg-gray-100 text-gray-800" },
  { value: "appariteur", label: "Appariteur", level: "user", color: "bg-gray-100 text-gray-800" },
  { value: "comptable", label: "Comptable", level: "user", color: "bg-gray-100 text-gray-800" },
  { value: "caissiere", label: "Caissière", level: "user", color: "bg-gray-100 text-gray-800" }
];

const mockUsers = [
  {
    id: 1,
    firstName: "Jean",
    lastName: "MUKENDI",
    email: "j.mukendi@ulpgl.ac.cd",
    role: "doyen",
    status: "active",
    lastLogin: "2024-08-07T14:30:00Z",
    createdAt: "2024-01-15T09:00:00Z",
    documentsCreated: 25,
    documentsSigned: 45
  },
  {
    id: 2,
    firstName: "Marie",
    lastName: "KASONGO",
    email: "m.kasongo@ulpgl.ac.cd",
    role: "saf",
    status: "active",
    lastLogin: "2024-08-07T13:15:00Z",
    createdAt: "2024-02-01T10:30:00Z",
    documentsCreated: 78,
    documentsSigned: 120
  },
  {
    id: 3,
    firstName: "Pierre",
    lastName: "KABILA",
    email: "p.kabila@ulpgl.ac.cd",
    role: "recteur",
    status: "active",
    lastLogin: "2024-08-07T11:00:00Z",
    createdAt: "2023-09-01T08:00:00Z",
    documentsCreated: 12,
    documentsSigned: 89
  },
  {
    id: 4,
    firstName: "Grace",
    lastName: "MBUYI",
    email: "g.mbuyi@ulpgl.ac.cd",
    role: "sgac",
    status: "pending",
    lastLogin: null,
    createdAt: "2024-08-06T16:45:00Z",
    documentsCreated: 0,
    documentsSigned: 0
  },
  {
    id: 5,
    firstName: "Paul",
    lastName: "NKONGO",
    email: "p.nkongo@ulpgl.ac.cd",
    role: "appariteur",
    status: "inactive",
    lastLogin: "2024-07-15T09:30:00Z",
    createdAt: "2024-03-10T14:20:00Z",
    documentsCreated: 5,
    documentsSigned: 8
  }
];

export default function Users() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [users, setUsers] = useState(mockUsers);

  const getRoleInfo = (roleValue: string) => {
    return roles.find(r => r.value === roleValue) || { label: roleValue, color: "bg-gray-100 text-gray-800" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="text-green-600 border-green-600">Actif</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-orange-600 border-orange-600">En attente</Badge>;
      case "inactive":
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Inactif</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-orange-600" />;
      case "inactive":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Jamais connecté";
    const date = new Date(lastLogin);
    return date.toLocaleDateString('fr-FR') + " à " + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const approveUser = (userId: number) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId ? { ...user, status: "active" } : user
      )
    );
  };

  const deactivateUser = (userId: number) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId ? { ...user, status: "inactive" } : user
      )
    );
  };

  const pendingUsersCount = users.filter(u => u.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UsersIcon className="h-8 w-8" />
            Gestion des utilisateurs
            {pendingUsersCount > 0 && (
              <Badge className="bg-orange-500 text-white">
                {pendingUsersCount} en attente
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Gérez les comptes utilisateurs et leurs permissions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="ulpgl" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Nouvel utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
              <DialogDescription>
                Ajoutez un nouvel utilisateur au système ULPGL
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" placeholder="Jean" />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" placeholder="MUKENDI" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="j.mukendi@ulpgl.ac.cd" />
              </div>
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${role.color}`}>
                            {role.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Les rôles administratifs nécessitent une validation manuelle avant activation.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button variant="ulpgl">Créer l'utilisateur</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            {filteredUsers.length} utilisateur(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Activité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const roleInfo = getRoleInfo(user.role);
                return (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status)}
                        {getStatusBadge(user.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLastLogin(user.lastLogin)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>Créés: {user.documentsCreated}</div>
                        <div>Signés: {user.documentsSigned}</div>
                      </div>
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
                            <Shield className="h-4 w-4" />
                            Voir les permissions
                          </DropdownMenuItem>
                          {user.status === "pending" && (
                            <>
                              <DropdownMenuItem 
                                className="gap-2 text-green-600"
                                onClick={() => approveUser(user.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approuver
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {user.status === "active" && (
                            <DropdownMenuItem 
                              className="gap-2 text-orange-600"
                              onClick={() => deactivateUser(user.id)}
                            >
                              <XCircle className="h-4 w-4" />
                              Désactiver
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="gap-2 text-red-600">
                            <XCircle className="h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}