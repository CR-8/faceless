"use client";

import Link from "next/link";
import { LayoutDashboard, Film, Settings, HelpCircle, Search, Calendar, Bell, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <ShadcnSidebar variant="floating" collapsible="icon" className="bg-[#0E0E11] border-r border-[#1F1F23]">
            <SidebarContent>
                {/* Brand */}
                <div className={`flex items-center gap-3 px-4 py-6 mt-2 ${isCollapsed ? 'justify-center px-0' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-[#FF5722] shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(255,87,34,0.4)]">
                        <Film size={18} color="#fff" strokeWidth={2.5} />
                    </div>
                    {!isCollapsed && <span className="font-semibold text-lg tracking-tight text-white line-clamp-1">Faceless<span className="text-[#A1A1AA]">Video</span></span>}
                </div>

                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Dashboard" isActive>
                                    <Link href="/" className="text-white bg-[#1C1C21]">
                                        <LayoutDashboard />
                                        <span>Dashboard</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="My Videos">
                                    <Link href="/projects" className="text-[#A1A1AA] hover:text-white">
                                        <Film />
                                        <span>My Videos</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Schedule">
                                    <Link href="#" className="text-[#A1A1AA] hover:text-white">
                                        <Calendar />
                                        <span>Schedule</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Settings">
                                    <Link href="#" className="text-[#A1A1AA] hover:text-white">
                                        <Settings />
                                        <span>Settings</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Help Center">
                                    <Link href="#" className="text-[#A1A1AA] hover:text-white">
                                        <HelpCircle />
                                        <span>Help Center</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </ShadcnSidebar>
    );
}

export function Topbar() {
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <header className="h-[72px] flex items-center justify-between px-6 bg-[#0a0a0c]/80 backdrop-blur-md rounded-2xl mx-6 mt-4 border border-[#1F1F23] shrink-0 text-white shadow-xl z-20">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="text-[#A1A1AA] hover:text-white" />
                <div className="relative w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={16} />
                    <Input
                        className="w-full bg-[#15151A] border-none text-sm placeholder:text-[#71717A] pl-10 h-9 rounded-full focus-visible:ring-1 focus-visible:ring-[#FF5722]"
                        placeholder="Search..."
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <span className="text-sm text-[#A1A1AA] hidden md:inline">{dateStr}</span>

                <div className="flex items-center gap-3">
                    <button className="relative w-9 h-9 rounded-full bg-[#15151A] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
                        <Bell size={16} />
                        <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#FF5722]" />
                    </button>

                    <div className="w-9 h-9 rounded-full bg-[#1C1C21] overflow-hidden ml-2 border border-[#27272A] cursor-pointer hover:border-[#FF5722] transition-colors">
                        <img src="https://api.dicebear.com/9.x/notionists/svg?seed=Felix" alt="User" />
                    </div>
                </div>
            </div>
        </header>
    );
}
