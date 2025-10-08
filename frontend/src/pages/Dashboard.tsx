import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminButton } from "@/components/ui/admin-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, CheckCircle, FileText, Clock, Plus } from "lucide-react";
import KPICard from "@/components/KPICard";
import ConfluenceTab from "@/components/ConfluenceTab";
import UploadsTab from "@/components/UploadsTab";

const Dashboard = () => {
  const { vectorStoreId } = useParams<{ vectorStoreId: string }>();
  const navigate = useNavigate();
  const [vectorStoreName, setVectorStoreName] = useState<string>("");

  useEffect(() => {
    // Mock data - replace with actual API call to get vector store details
    const mockStores: Record<string, string> = {
      "vs_IRnocSrVHpWHBlsAkI4foJce": "VS_Roadsidechat_CustomerSupport",
      "vs_ABC123def456": "VS_Sales_Documentation"
    };
    
    if (vectorStoreId && mockStores[vectorStoreId]) {
      setVectorStoreName(mockStores[vectorStoreId]);
    }
  }, [vectorStoreId]);

  const handleBackToSelection = () => {
    navigate("/select");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={handleBackToSelection}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Selection
            </AdminButton>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">{vectorStoreName || "Loading..."}</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Interactions"
            value="1,234"
            icon={BarChart3}
            trend={{ value: 12, isPositive: true }}
            comingSoon
          />
          <KPICard
            title="Resolution Rate"
            value="94.2%"
            icon={CheckCircle}
            trend={{ value: 5, isPositive: true }}
            comingSoon
          />
          <KPICard
            title="Knowledge Items Count"
            value="156"
            icon={FileText}
            description="Active items in knowledge base"
            comingSoon
          />
          <KPICard
            title="Last Sync Date"
            value="2 hours ago"
            icon={Clock}
            description="Content last synchronized"
            comingSoon
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="confluence" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="confluence">Confluence Content</TabsTrigger>
            <TabsTrigger value="uploads">Uploads</TabsTrigger>
          </TabsList>

          <TabsContent value="confluence">
            <ConfluenceTab vectorStoreId={vectorStoreId || ""} />
          </TabsContent>

          <TabsContent value="uploads">
            <UploadsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;