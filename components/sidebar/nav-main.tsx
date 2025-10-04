"use client";

import Link from "next/link";


import { ChevronRight, CrownIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  current?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  plan?: string;
  trigger?: string;
  highlightItem?: string[];
  items?: {
    title: string;
    url: string;
    current?: boolean;
  }[];
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu className="space-y-0.5 text-foreground">
        {items.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem
              className={cn(
                item.current &&
                  "rounded-md bg-gray-200 font-semibold dark:bg-secondary",
              )}
            >
              <SidebarMenuButton asChild tooltip={item.title}>
                {item.disabled ? (
                  null
                ) : (
                  <Link href={item.url} className="p-2">
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem
                          key={subItem.title}
                          className={cn(
                            subItem.current &&
                              "rounded-md bg-gray-200 font-semibold dark:bg-secondary",
                          )}
                        >
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
