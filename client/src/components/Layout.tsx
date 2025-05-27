import { useState } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Bell, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import QuickSendModal from "./QuickSendModal";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [quickSendOpen, setQuickSendOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 shadow-sm">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              <h1 className="text-xl font-semibold text-gray-900">WhatsApp Manager</h1>
            </div>
            
            <div className="ml-4 flex items-center space-x-4">
              {/* Quick Send Button */}
              <Button
                onClick={() => setQuickSendOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Envio Rápido
              </Button>
              
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
      
      {/* Quick Send Modal */}
      <QuickSendModal 
        open={quickSendOpen} 
        onClose={() => setQuickSendOpen(false)} 
      />
    </div>
  );
}
