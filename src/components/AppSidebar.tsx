import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  FileText, 
  Home, 
  Plus, 
  Users, 
  Settings, 
  Archive,
  PenTool,
  Search,
  Bell
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/components/LanguageProvider";
import { Logo } from "@/components/ui/logo";

const mainItems = [
  { title: "dashboard", url: "/", icon: Home },
  { title: "documents", url: "/documents", icon: FileText },
  { title: "createDocument", url: "/create-document", icon: Plus },
  { title: "notifications", url: "/notifications", icon: Bell },
];

const adminItems = [
  { title: "Utilisateurs", url: "/users", icon: Users },
  { title: "Archives", url: "/archives", icon: Archive },
  { title: "settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { t } = useLanguage();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"}>
      {/* Logo in sidebar */}
      <div className="p-4 border-b">
        <Logo 
          size={collapsed ? "sm" : "md"} 
          showText={!collapsed}
          className="justify-center"
        />
      </div>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{t(item.title)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{t(item.title)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}